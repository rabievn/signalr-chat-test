using Microsoft.AspNetCore.SignalR;
using backend.Services;

namespace backend.Hubs;

// A new hub instance is created for every call, so all state lives in the injected services.
public class ChatHub(UserStore users, PresenceStore presence, ChatService chats, NotificationService notifications) : Hub
{
    private string CurrentUserId =>
        Context.Items["UserId"] as string ?? throw new HubException("Not signed in");

    private static string RequireChatId(string? chatId) =>
        chatId is { Length: > 0 and <= 200 } ? chatId : throw new HubException("Invalid chat id");

    public Task<IReadOnlyList<ChatDto>> GetMyChats() => chats.GetMyChatsAsync(CurrentUserId);

    public async Task<MessagePage> GetMessages(string chatId, DateTime? before, int limit)
    {
        var userId = CurrentUserId;
        chatId = RequireChatId(chatId);
        if (await chats.GetMembersAsync(userId, chatId, createDirect: false) is null)
        {
            // A direct chat nobody has written in yet simply has no history.
            if (chats.IsOwnDirectChat(userId, chatId)) return new MessagePage([], false);
            throw new HubException("Chat not found");
        }
        return await chats.GetMessagesAsync(chatId, before, limit);
    }

    public async Task SendMessage(string chatId, string text)
    {
        var userId = CurrentUserId;
        chatId = RequireChatId(chatId);
        text = text?.Trim() ?? "";
        if (text.Length == 0) throw new HubException("Message is empty");
        if (text.Length > ChatService.MaxMessageLength)
            throw new HubException($"Message is longer than {ChatService.MaxMessageLength} characters");

        var members = await chats.GetMembersAsync(userId, chatId, createDirect: true)
            ?? throw new HubException("Chat not found");

        var msg = await chats.AddMessageAsync(userId, chatId, text);
        var targets = members.SelectMany(presence.ConnectionsFor).Distinct().ToList();
        await Clients.Clients(targets).SendAsync("ReceiveMessage", msg);
        await notifications.NotifyNewMessageAsync(msg, members);
    }

    /// <summary>The client reports which chat is on screen (null when the tab is hidden).
    /// Opening a chat marks its notifications as read.</summary>
    public async Task SetViewing(string? chatId)
    {
        var userId = CurrentUserId;
        if (chatId is not null)
        {
            chatId = RequireChatId(chatId);
            // Don't let a tab claim to be viewing a chat it can't read.
            if (await chats.GetMembersAsync(userId, chatId, createDirect: false) is null && !chats.IsOwnDirectChat(userId, chatId))
                throw new HubException("Chat not found");
        }
        presence.SetViewing(Context.ConnectionId, chatId);
        if (chatId is not null)
            await notifications.MarkChatReadAsync(userId, chatId);
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

        Context.Items["UserId"] = user.Id;
        presence.Add(Context.ConnectionId, user.Id);
        await Clients.All.SendAsync("PresenceChanged", presence.OnlineUserIds());
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (presence.Remove(Context.ConnectionId, out _))
            await Clients.All.SendAsync("PresenceChanged", presence.OnlineUserIds());
        await base.OnDisconnectedAsync(exception);
    }
}
