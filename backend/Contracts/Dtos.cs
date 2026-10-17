namespace backend.Contracts;

// Shapes sent to the browser. SignalR serializes them as camelCase JSON.

public record MessageDto(string Id, string ChatId, string SenderId, string SenderName, string Text, DateTime SentAt);

public record MessagePage(IReadOnlyList<MessageDto> Messages, bool HasMore);

public record ChatDto(string Id, string Name, string Type, string? OtherUserId, MessageDto? LastMessage, int Unread);

public record NotificationDto(
    string Id,
    string Type,
    string Title,
    string Text,
    string? FromUserId,
    string? FromUserName,
    string? FromUserColor,
    string? ChatId,
    DateTime CreatedAt,
    bool IsRead);

public record NotificationsSnapshot(IReadOnlyList<NotificationDto> Items, int Unread, Dictionary<string, int> UnreadByChat);
