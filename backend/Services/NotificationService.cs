using backend.Contracts;
using backend.Hubs;
using backend.Persistence;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

/// <summary>Per-user notifications, persisted in SQLite and pushed live to the user's open tabs.</summary>
public class NotificationService(
    IDbContextFactory<ChatDbContext> dbFactory,
    IHubContext<ChatHub, IChatClient> hub,
    PresenceStore presence,
    UserStore users)
{
    private const int MaxPerUser = 100;
    private const int PreviewLength = 80;

    /// <summary>Creates a NewMessage notification for every chat member except the sender.</summary>
    public async Task NotifyNewMessageAsync(MessageDto msg, IEnumerable<string> memberIds)
    {
        var isTeam = msg.ChatId == ChatDbContext.TeamChatId;
        var preview = msg.Text.Length > PreviewLength ? msg.Text[..PreviewLength] + "…" : msg.Text;
        var created = new List<Notification>();

        await using var db = await dbFactory.CreateDbContextAsync();
        foreach (var recipientId in memberIds.Where(id => id != msg.SenderId))
        {
            var n = new Notification
            {
                Id = Guid.NewGuid().ToString(),
                UserId = recipientId,
                Type = NotificationType.NewMessage,
                Title = isTeam ? $"{msg.SenderName} in #team" : $"New message from {msg.SenderName}",
                Text = $"{msg.SenderName}: {preview}",
                FromUserId = msg.SenderId,
                ChatId = msg.ChatId,
                CreatedAt = msg.SentAt,
                // Someone looking at this chat right now has already seen the message.
                IsRead = presence.IsViewing(recipientId, msg.ChatId),
            };
            db.Notifications.Add(n);
            created.Add(n);
        }
        await db.SaveChangesAsync();

        foreach (var n in created)
        {
            await TrimAsync(db, n.UserId);
            // Already-read ones are still sent so the list stays current; the client only toasts unread ones.
            var conns = presence.ConnectionsFor(n.UserId);
            if (conns.Count > 0)
                await hub.Clients.Clients(conns).NotificationReceived(ToDto(n));
        }
    }

    public async Task<NotificationsSnapshot> GetAsync(string userId)
    {
        await using var db = await dbFactory.CreateDbContextAsync();
        var mine = db.Notifications.AsNoTracking().Where(n => n.UserId == userId);

        var items = await mine.OrderByDescending(n => n.CreatedAt).Take(MaxPerUser).ToListAsync();
        var unreadByChat = await mine
            .Where(n => !n.IsRead && n.ChatId != null)
            .GroupBy(n => n.ChatId!)
            .Select(g => new { ChatId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ChatId, x => x.Count);
        var unread = await mine.CountAsync(n => !n.IsRead);

        return new NotificationsSnapshot([.. items.Select(ToDto)], unread, unreadByChat);
    }

    public Task MarkReadAsync(string userId, string id) =>
        UpdateAsync(userId, q => q.Where(n => n.Id == id && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true)));

    public Task MarkAllReadAsync(string userId) =>
        UpdateAsync(userId, q => q.Where(n => !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true)));

    public Task MarkChatReadAsync(string userId, string chatId) =>
        UpdateAsync(userId, q => q.Where(n => n.ChatId == chatId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true)));

    public Task ClearAsync(string userId) =>
        UpdateAsync(userId, q => q.ExecuteDeleteAsync());

    /// <summary>Runs a bulk update on the user's own notifications; if anything changed,
    /// pushes a fresh snapshot to all of the user's tabs so they stay in sync.</summary>
    private async Task UpdateAsync(string userId, Func<IQueryable<Notification>, Task<int>> update)
    {
        int changed;
        await using (var db = await dbFactory.CreateDbContextAsync())
            changed = await update(db.Notifications.Where(n => n.UserId == userId));
        if (changed == 0) return;

        var conns = presence.ConnectionsFor(userId);
        if (conns.Count > 0)
            await hub.Clients.Clients(conns).NotificationsChanged(await GetAsync(userId));
    }

    /// <summary>Keeps only the newest <see cref="MaxPerUser"/> notifications for the user.</summary>
    private static async Task TrimAsync(ChatDbContext db, string userId)
    {
        var cutoff = await db.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Skip(MaxPerUser)
            .Select(n => (DateTime?)n.CreatedAt)
            .FirstOrDefaultAsync();
        if (cutoff is { } c)
            await db.Notifications.Where(n => n.UserId == userId && n.CreatedAt <= c).ExecuteDeleteAsync();
    }

    private NotificationDto ToDto(Notification n)
    {
        var from = n.FromUserId is null ? null : users.Find(n.FromUserId);
        return new NotificationDto(n.Id, n.Type.ToString(), n.Title, n.Text, n.FromUserId,
            from?.Name, from?.Color, n.ChatId, n.CreatedAt, n.IsRead);
    }
}
