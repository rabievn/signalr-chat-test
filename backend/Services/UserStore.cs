namespace backend.Services;

public record ChatUser(string Id, string Name, string Color);

public class UserStore
{
    public static readonly IReadOnlyList<ChatUser> All = new[]
    {
        new ChatUser("nurmukhammad", "Nurmukhammad", "#1a73e8"),
        new ChatUser("alice",        "Alice",        "#e53935"),
        new ChatUser("bob",          "Bob",          "#43a047"),
        new ChatUser("charlie",      "Charlie",      "#f9a825"),
    };

    public ChatUser? Find(string id) =>
        All.FirstOrDefault(u => u.Id.Equals(id, StringComparison.OrdinalIgnoreCase));
}
