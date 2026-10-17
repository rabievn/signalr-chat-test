# SignalR Chat Demo

A real-time team chat built with ASP.NET Core SignalR (backend) and React + Vite + TypeScript (frontend).
Chats, message history and notifications are stored in a local SQLite database, so they survive a server restart.

## Running the project

### 1. Backend

```bash
cd backend
dotnet run
```

The API starts on **http://localhost:5000**. On first start the database file is created and all migrations are applied automatically.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server starts on **http://localhost:5173**.

The frontend is TypeScript only (`.ts`/`.tsx`) in strict mode: `strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, no `any` and no `!` non-null assertions (enforced by oxlint).

```bash
npm run typecheck   # tsc, no output on success
npm run lint        # oxlint
npm run build       # typecheck + production build
```

## Users and chats

There are four fixed users: Nurmukhammad, Alice, Bob and Charlie. There are no passwords — pick who you are on the start screen.
The choice is kept in `sessionStorage`, so each browser tab can be a different user.

- **#team** is the group chat everyone is in.
- Click a member in the sidebar to open a **direct chat** with them.
- Use **⇄** in the bottom-left corner to switch user.

## Notifications

- When someone writes in a chat you're in, you get a notification, even if you're offline. It waits in the database until you sign in.
- **Bell** in the header: unread count and the list. Use "Mark all as read" or "Clear". Clicking an item opens that chat.
- **Toast** in the corner when a notification arrives live (auto-hides after 5 s).
- **Welcome banner** on sign-in when you have unread notifications.
- **Browser notifications** when the tab is in the background: click "Enable browser notifications" in the panel first.
- If you're already looking at the chat, the notification is created as read and no toast is shown.
- Opening a chat marks its notifications as read.

## Try it

1. Sign in as Alice in one tab and as Bob in another. In Bob's tab, open the direct chat with Charlie.
2. Alice writes in #team: Bob gets a toast, a badge on #team and on the bell, and "(1)" in the tab title.
3. Close Bob's tab, send two more messages as Alice, then sign in as Bob again: a banner says you have new notifications.
4. Stop and restart the backend, then refresh: chats, history and notifications are all still there.

## Database

- File: `backend/data/chat.db` (plus `-shm`/`-wal` files: SQLite runs in WAL mode). The path is set in `backend/appsettings.json` under `ConnectionStrings:Default`.
- **Reset all data:** stop the backend and delete `backend/data/chat.db*`. It is recreated on the next start.
- **Change the schema:** edit the entities in `backend/Persistence/`, then add a migration. It is applied automatically on the next start.

  ```bash
  cd backend
  dotnet tool restore
  dotnet ef migrations add <Name> -o Persistence/Migrations
  ```

  If the backend is running, the build output is locked. Stop it first, or add `--configuration Release`.

## Project structure

```
signalr-chat-demo/
├── backend/
│   ├── Contracts/
│   │   ├── Dtos.cs                  Shapes sent to the browser (messages, chats, notifications)
│   │   └── IChatClient.cs           Typed server → client events (no magic strings)
│   ├── Hubs/
│   │   └── ChatHub.cs               SignalR hub: validates input, delegates to services
│   ├── Persistence/
│   │   ├── ChatDbContext.cs         EF Core context + seed data (users, #team)
│   │   ├── DatabaseSetup.cs         SQLite registration, migrations on startup, WAL mode
│   │   ├── Entities.cs              User, Chat, ChatMember, Message, Notification
│   │   └── Migrations/              EF Core migrations
│   ├── Services/
│   │   ├── ChatService.cs           Chats, membership, message history (SQLite)
│   │   ├── NotificationService.cs   Notifications (SQLite) + live push via IHubContext
│   │   ├── PresenceStore.cs         In-memory: who is online, which chat each tab shows
│   │   └── UserStore.cs             The four fixed users
│   ├── data/chat.db                 Created on first run (git-ignored)
│   ├── appsettings.json             Connection string, allowed CORS origins
│   ├── Program.cs                   Composition root: services, CORS, endpoints
│   └── dotnet-tools.json            Local dotnet-ef tool
└── frontend/
    ├── tsconfig.json                Strict TypeScript settings
    └── src/
        ├── main.tsx                 Entry point
        ├── App.tsx                  Picks LoginPage or ChatPage
        ├── env.d.ts                 Types for VITE_* env variables and CSS custom properties
        ├── pages/
        │   ├── LoginPage.tsx        "Choose who you are"
        │   └── ChatPage.tsx         Wires the hooks to the layout
        ├── components/              Presentational pieces: Sidebar, ChatList, MessageList,
        │                            MessageInput, NotificationBell/Panel, ToastStack, banners
        ├── hooks/
        │   ├── useChatConnection.ts SignalR connection, status, who's online
        │   ├── useChatList.ts       Chats with last-message previews
        │   ├── useMessages.ts       History of the open chat: paging, live updates, sending
        │   ├── useNotifications.ts  Notifications, toasts, browser notifications
        │   ├── useViewingReport.ts  Tells the server which chat is on screen
        │   └── useUsers.ts          The user list
        └── lib/
            ├── types.ts             DTO types mirroring backend/Contracts/Dtos.cs
            ├── chatApi.ts           Typed hub calls and events (HubEventMap)
            ├── chatIds.ts           Chat id helpers (must match the backend)
            ├── config.ts            API and hub URLs (VITE_API_URL / VITE_HUB_URL)
            └── format.ts            Time and badge formatting
```

When you change a DTO in `backend/Contracts/`, update `frontend/src/lib/types.ts` to match.

## Hub API

| Client calls                                   | Server pushes                                   |
| ---------------------------------------------- | ----------------------------------------------- |
| `GetMyChats()`                                 | `ReceiveMessage(message)`                       |
| `GetMessages(chatId, before, limit)`           | `NotificationReceived(notification)`            |
| `SendMessage(chatId, text)`                    | `NotificationsChanged({ items, unread, unreadByChat })` |
| `SetViewing(chatId \| null)`                   | `PresenceChanged(onlineUserIds)`                |
| `GetNotifications()`                           |                                                 |
| `MarkNotificationRead(id)`                     |                                                 |
| `MarkAllNotificationsRead()`                   |                                                 |
| `ClearNotifications()`                         |                                                 |

The sender is always taken from the connection, never from the client's arguments.
