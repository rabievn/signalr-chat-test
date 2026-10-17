using backend.Hubs;
using backend.Persistence;
using backend.Services;

var builder = WebApplication.CreateBuilder(args);

builder.AddChatDatabase();

builder.Services.AddSignalR();
builder.Services.AddSingleton<UserStore>();
builder.Services.AddSingleton<PresenceStore>();
builder.Services.AddSingleton<ChatService>();
builder.Services.AddSingleton<NotificationService>();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.MigrateChatDatabase();
app.UseCors();

app.MapGet("/api/users", () => Results.Ok(UserStore.All));
app.MapHub<ChatHub>("/chatHub");

app.Run();
