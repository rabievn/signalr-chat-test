using backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace backend.Persistence;

public class ChatDbContext(DbContextOptions<ChatDbContext> options) : DbContext(options)
{
    public const string TeamChatId = "team";

    public DbSet<User> Users => Set<User>();
    public DbSet<Chat> Chats => Set<Chat>();
    public DbSet<ChatMember> ChatMembers => Set<ChatMember>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        // SQLite has no DateTime type; values come back with Kind=Unspecified.
        // Mark them UTC so they serialize with a trailing "Z" and the browser reads them correctly.
        builder.Properties<DateTime>().HaveConversion<UtcConverter>();
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.Property(u => u.Id).HasMaxLength(64);
            e.HasData(UserStore.All.Select(u => new User { Id = u.Id, DisplayName = u.Name, Color = u.Color }));
        });

        b.Entity<Chat>(e =>
        {
            e.Property(c => c.Id).HasMaxLength(200);
            e.Property(c => c.Type).HasConversion<string>();
            e.HasData(new Chat
            {
                Id = TeamChatId,
                Name = "team",
                Type = ChatType.Group,
                CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            });
        });

        b.Entity<ChatMember>(e =>
        {
            e.HasKey(m => new { m.ChatId, m.UserId });
            e.HasOne(m => m.Chat).WithMany(c => c.Members).HasForeignKey(m => m.ChatId);
            e.HasOne(m => m.User).WithMany().HasForeignKey(m => m.UserId);
            e.HasData(UserStore.All.Select(u => new ChatMember { ChatId = TeamChatId, UserId = u.Id }));
        });

        b.Entity<Message>(e =>
        {
            e.Property(m => m.Text).HasMaxLength(2000);
            e.HasIndex(m => new { m.ChatId, m.SentAt });
            e.HasOne<Chat>().WithMany().HasForeignKey(m => m.ChatId);
            e.HasOne<User>().WithMany().HasForeignKey(m => m.SenderId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Notification>(e =>
        {
            e.Property(n => n.Type).HasConversion<string>();
            e.HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAt });
            e.HasOne<User>().WithMany().HasForeignKey(n => n.UserId);
        });
    }

    private class UtcConverter() : ValueConverter<DateTime, DateTime>(
        v => v.ToUniversalTime(),
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
}
