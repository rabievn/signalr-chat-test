namespace backend.Services;

public class PresenceStore
{
    private readonly Dictionary<string, string> _connToUser = new();
    private readonly Dictionary<string, HashSet<string>> _userToConns = new();
    private readonly Dictionary<string, string> _viewing = new();
    private readonly object _lock = new();

    public void Add(string connectionId, string userId)
    {
        lock (_lock)
        {
            _connToUser[connectionId] = userId;
            if (!_userToConns.TryGetValue(userId, out var conns))
                _userToConns[userId] = conns = [];
            conns.Add(connectionId);
        }
    }

    public bool Remove(string connectionId, out string? userId)
    {
        lock (_lock)
        {
            _viewing.Remove(connectionId);
            if (!_connToUser.Remove(connectionId, out userId))
                return false;
            if (_userToConns.TryGetValue(userId!, out var conns))
            {
                conns.Remove(connectionId);
                if (conns.Count == 0)
                    _userToConns.Remove(userId!);
            }
            return true;
        }
    }

    /// <summary>Records which chat a tab is currently showing (null when hidden or unfocused).</summary>
    public void SetViewing(string connectionId, string? chatId)
    {
        lock (_lock)
        {
            if (chatId is null) _viewing.Remove(connectionId);
            else _viewing[connectionId] = chatId;
        }
    }

    public bool IsViewing(string userId, string chatId)
    {
        lock (_lock)
            return _userToConns.TryGetValue(userId, out var conns)
                && conns.Any(c => _viewing.TryGetValue(c, out var viewing) && viewing == chatId);
    }

    public IReadOnlyList<string> ConnectionsFor(string userId)
    {
        lock (_lock)
            return _userToConns.TryGetValue(userId, out var conns) ? [.. conns] : [];
    }

    public IReadOnlyList<string> OnlineUserIds()
    {
        lock (_lock)
            return [.. _userToConns.Keys];
    }
}
