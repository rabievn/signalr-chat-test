using backend.Persistence;
using backend.Hubs;
using backend.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Resolve the SQLite file relative to the project folder and make sure its directory exists.
var dbConfig = new SqliteConnectionStringBuilder(builder.Configuration.GetConnectionString("Default"));
dbConfig.DataSource = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, dbConfig.DataSource));
Directory.CreateDirectory(Path.GetDirectoryName(dbConfig.DataSource)!);

// DbContext isn't thread-safe and the hub is created per call, so services create a short-lived context per operation.
builder.Services.AddDbContextFactory<ChatDbContext>(o => o.UseSqlite(dbConfig.ToString()));

builder.Services.AddSignalR();
builder.Services.AddSingleton<UserStore>();
builder.Services.AddSingleton<PresenceStore>();
builder.Services.AddSingleton<ChatService>();
builder.Services.AddSingleton<NotificationService>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Create or upgrade the database on startup.
using (var db = app.Services.GetRequiredService<IDbContextFactory<ChatDbContext>>().CreateDbContext())
{
    db.Database.Migrate();
    db.Database.ExecuteSqlRaw("PRAGMA journal_mode=WAL;");
}

app.UseCors();

app.MapGet("/api/users", () =>
    Results.Ok(UserStore.All.Select(u => new { u.Id, u.Name, u.Color })));

app.MapHub<ChatHub>("/chatHub");

app.Run();
