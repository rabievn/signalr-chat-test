using Microsoft.AspNetCore.SignalR;
using backend.Contracts;
using backend.Services;

namespace backend.Hubs;

// A new hub instance is created for every call, so all state lives in the injected services.
public class ChatHub(UserStore users, PresenceStore presence, ChatService chats, NotificationService notifications)
    : Hub<IChatClient>
{
    private const string UserIdKey = "UserId";

    private string CurrentUserId =>
        Context.Items[UserIdKey] as string ?? throw new HubException("Not signed in");

    public Task<IReadOnlyList<ChatDto>> GetMyChats() => chats.GetMyChatsAsync(CurrentUserId);

    public async Task<MessagePage> GetMessages(string chatId, DateTime? before, int limit)
    {
        await RequireReadableAsync(chatId);
        return await chats.GetMessagesAsync(chatId, before, limit);
    }

    public async Task SendMessage(string chatId, string text)
    {
        var userId = CurrentUserId;
        ValidateChatId(chatId);
        text = ValidateText(text);

        var members = await chats.GetOrCreateMembersAsync(userId, chatId)
            ?? throw new HubException("Chat not found");

        var msg = await chats.AddMessageAsync(userId, chatId, text);
        var targets = members.SelectMany(presence.ConnectionsFor).Distinct().ToList();
        await Clients.Clients(targets).ReceiveMessage(msg);
        await notifications.NotifyNewMessageAsync(msg, members);
    }

    /// <summary>The client reports which chat is on screen (null when the tab is hidden).
    /// Opening a chat marks its notifications as read.</summary>
    public async Task SetViewing(string? chatId)
    {
        if (chatId is null)
        {
            presence.SetViewing(Context.ConnectionId, null);
            return;
        }

        // Don't let a tab claim to be viewing a chat it can't read.
        await RequireReadableAsync(chatId);
        presence.SetViewing(Context.ConnectionId, chatId);
        await notifications.MarkChatReadAsync(CurrentUserId, chatId);
    }

    public Task<NotificationsSnapshot> GetNotifications() => notifications.GetAsync(CurrentUserId);

    public Task MarkNotificationRead(string id) => notifications.MarkReadAsync(CurrentUserId, id);

    public Task MarkAllNotificationsRead() => notifications.MarkAllReadAsync(CurrentUserId);

    public Task ClearNotifications() => notifications.ClearAsync(CurrentUserId);

    public override async Task OnConnectedAsync()
    {
        var userId = Context.GetHttpContext()?.Request.Query["userId"].ToString();
        var user = userId is { Length: > 0 } ? users.Find(userId) : null;
        if (user is null)
            throw new HubException("Unknown user id");

        Context.Items[UserIdKey] = user.Id;
        presence.Add(Context.ConnectionId, user.Id);
        await Clients.All.PresenceChanged(presence.OnlineUserIds());
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (presence.Remove(Context.ConnectionId, out _))
            await Clients.All.PresenceChanged(presence.OnlineUserIds());
        await base.OnDisconnectedAsync(exception);
    }

    private async Task RequireReadableAsync(string chatId)
    {
        ValidateChatId(chatId);
        if (!await chats.CanReadAsync(CurrentUserId, chatId))
            throw new HubException("Chat not found");
    }

    private static void ValidateChatId(string? chatId)
    {
        if (chatId is not { Length: > 0 and <= 200 })
            throw new HubException("Invalid chat id");
    }

    private static string ValidateText(string? text)
    {
        text = text?.Trim() ?? "";
        if (text.Length == 0) throw new HubException("Message is empty");
        if (text.Length > ChatService.MaxMessageLength)
            throw new HubException($"Message is longer than {ChatService.MaxMessageLength} characters");
        return text;
    }
}
