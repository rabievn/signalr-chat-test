namespace backend.Persistence;

public class User
{
    public string Id { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string Color { get; set; } = "";
}

public enum ChatType { Group, Direct }

public class Chat
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public ChatType Type { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<ChatMember> Members { get; set; } = [];
}

public class ChatMember
{
    public string ChatId { get; set; } = "";
    public string UserId { get; set; } = "";
    public Chat? Chat { get; set; }
    public User? User { get; set; }
}

public class Message
{
    public string Id { get; set; } = "";
    public string ChatId { get; set; } = "";
    public string SenderId { get; set; } = "";
    public string Text { get; set; } = "";
    public DateTime SentAt { get; set; }
}

public enum NotificationType { NewMessage, System }

public class Notification
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public NotificationType Type { get; set; }
    public string Title { get; set; } = "";
    public string Text { get; set; } = "";
    public string? FromUserId { get; set; }
    public string? ChatId { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsRead { get; set; }
}
