using backend.Contracts;
using backend.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

/// <summary>Chats, membership and message history, persisted in SQLite.</summary>
public class ChatService(IDbContextFactory<ChatDbContext> dbFactory, UserStore users)
{
    public const int MaxMessageLength = 2000;
    public const int MaxPageSize = 100;

    /// <summary>Direct chats get a deterministic id so both sides compute the same one.</summary>
    public static string DirectChatId(string a, string b) =>
        string.CompareOrdinal(a, b) <= 0 ? $"dm:{a}:{b}" : $"dm:{b}:{a}";

    /// <summary>True if the user is a member of the chat, or it's a direct chat of theirs nobody has written in yet.</summary>
    public async Task<bool> CanReadAsync(string userId, string chatId)
    {
        if (IsOwnDirectChat(userId, chatId)) return true;
        await using var db = await dbFactory.CreateDbContextAsync();
        return await db.ChatMembers.AnyAsync(m => m.ChatId == chatId && m.UserId == userId);
    }

    /// <summary>Member ids of a chat the user may post in, or null if they can't.
    /// A direct chat is created the first time someone writes in it.</summary>
    public async Task<IReadOnlyList<string>?> GetOrCreateMembersAsync(string userId, string chatId)
    {
        await using var db = await dbFactory.CreateDbContextAsync();
        var members = await db.ChatMembers.AsNoTracking()
            .Where(m => m.ChatId == chatId)
            .Select(m => m.UserId)
            .ToListAsync();

        if (members.Count == 0 && ParseDirect(chatId) is { } pair && (pair.A == userId || pair.B == userId))
        {
            db.Chats.Add(new Chat
            {
                Id = chatId,
                Name = chatId,
                Type = ChatType.Direct,
                CreatedAt = DateTime.UtcNow,
                Members = [new ChatMember { UserId = pair.A }, new ChatMember { UserId = pair.B }],
            });
            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // Another connection created it at the same moment — that's fine.
            }
            members = [pair.A, pair.B];
        }

        return members.Contains(userId) ? members : null;
    }

    public async Task<MessageDto> AddMessageAsync(string senderId, string chatId, string text)
    {
        await using var db = await dbFactory.CreateDbContextAsync();
        var msg = new Message
        {
            Id = Guid.NewGuid().ToString(),
            ChatId = chatId,
            SenderId = senderId,
            Text = text,
            SentAt = DateTime.UtcNow,
        };
        db.Messages.Add(msg);
        await db.SaveChangesAsync();
        return ToDto(msg);
    }

    /// <summary>Newest <paramref name="limit"/> messages older than <paramref name="before"/>, oldest first.</summary>
    public async Task<MessagePage> GetMessagesAsync(string chatId, DateTime? before, int limit)
    {
        limit = Math.Clamp(limit, 1, MaxPageSize);
        await using var db = await dbFactory.CreateDbContextAsync();
        var query = db.Messages.AsNoTracking().Where(m => m.ChatId == chatId);
        if (before is { } b)
        {
            var cutoff = b.ToUniversalTime();
            query = query.Where(m => m.SentAt < cutoff);
        }

        var page = await query.OrderByDescending(m => m.SentAt).Take(limit + 1).ToListAsync();
        var hasMore = page.Count > limit;
        return new MessagePage([.. page.Take(limit).Reverse().Select(ToDto)], hasMore);
    }

    /// <summary>The user's chats: the team channel plus every direct chat that has messages.</summary>
    public async Task<IReadOnlyList<ChatDto>> GetMyChatsAsync(string userId)
    {
        await using var db = await dbFactory.CreateDbContextAsync();
        var chats = await db.Chats.AsNoTracking()
            .Where(c => c.Members.Any(m => m.UserId == userId))
            .Include(c => c.Members)
            .ToListAsync();
        var chatIds = chats.Select(c => c.Id).ToList();

        // Latest message of each chat in one query.
        var lastMessages = await db.Messages.AsNoTracking()
            .Where(m => chatIds.Contains(m.ChatId)
                && m.SentAt == db.Messages.Where(x => x.ChatId == m.ChatId).Max(x => x.SentAt))
            .ToListAsync();
        var lastByChat = lastMessages.GroupBy(m => m.ChatId).ToDictionary(g => g.Key, g => g.First());

        var unread = await db.Notifications.AsNoTracking()
            .Where(n => n.UserId == userId && !n.IsRead && n.ChatId != null)
            .GroupBy(n => n.ChatId!)
            .Select(g => new { ChatId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ChatId, x => x.Count);

        var result = new List<ChatDto>();
        foreach (var chat in chats)
        {
            var last = lastByChat.GetValueOrDefault(chat.Id);
            if (chat.Type == ChatType.Direct && last is null)
                continue;

            var otherId = chat.Type == ChatType.Direct
                ? chat.Members.Select(m => m.UserId).FirstOrDefault(id => id != userId)
                : null;
            var name = otherId is not null ? users.Find(otherId)?.Name ?? otherId : chat.Name;

            result.Add(new ChatDto(chat.Id, name, chat.Type.ToString(), otherId,
                last is null ? null : ToDto(last), unread.GetValueOrDefault(chat.Id)));
        }
        return result;
    }

    private bool IsOwnDirectChat(string userId, string chatId) =>
        ParseDirect(chatId) is { } pair && (pair.A == userId || pair.B == userId);

    private (string A, string B)? ParseDirect(string chatId)
    {
        var parts = chatId.Split(':');
        if (parts.Length != 3 || parts[0] != "dm") return null;
        var a = users.Find(parts[1]);
        var b = users.Find(parts[2]);
        if (a is null || b is null || a.Id == b.Id || DirectChatId(a.Id, b.Id) != chatId) return null;
        return (a.Id, b.Id);
    }

    private MessageDto ToDto(Message m) =>
        new(m.Id, m.ChatId, m.SenderId, users.Find(m.SenderId)?.Name ?? m.SenderId, m.Text, m.SentAt);
}
