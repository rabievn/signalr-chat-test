namespace backend.Contracts;

/// <summary>Events the server pushes to the browser. Method names are the event names the client subscribes to,
/// so a typo here is a compile error instead of a silently missed message.</summary>
public interface IChatClient
{
    Task ReceiveMessage(MessageDto message);
    Task NotificationReceived(NotificationDto notification);
    Task NotificationsChanged(NotificationsSnapshot snapshot);
    Task PresenceChanged(IReadOnlyList<string> onlineUserIds);
}
