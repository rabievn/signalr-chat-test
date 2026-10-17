using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace backend.Persistence;

public static class DatabaseSetup
{
    /// <summary>Registers the SQLite-backed <see cref="ChatDbContext"/> factory.
    /// The file path in <c>ConnectionStrings:Default</c> is resolved relative to the project folder.</summary>
    public static WebApplicationBuilder AddChatDatabase(this WebApplicationBuilder builder)
    {
        var config = new SqliteConnectionStringBuilder(builder.Configuration.GetConnectionString("Default"));
        config.DataSource = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, config.DataSource));
        Directory.CreateDirectory(Path.GetDirectoryName(config.DataSource)!);

        // DbContext isn't thread-safe and the hub is created per call,
        // so services create a short-lived context per operation.
        builder.Services.AddDbContextFactory<ChatDbContext>(o => o.UseSqlite(config.ToString()));
        return builder;
    }

    /// <summary>Creates the database or applies pending migrations, then switches SQLite to WAL mode.</summary>
    public static WebApplication MigrateChatDatabase(this WebApplication app)
    {
        using var db = app.Services.GetRequiredService<IDbContextFactory<ChatDbContext>>().CreateDbContext();
        db.Database.Migrate();
        db.Database.ExecuteSqlRaw("PRAGMA journal_mode=WAL;");
        return app;
    }
}
