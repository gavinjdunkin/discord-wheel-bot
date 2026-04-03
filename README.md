# Discord Wheel Bot

Spins a weighted wheel to pick which party game to play. Players submit ranked votes and the wheel is weighted by Borda count.

## Setup

**1. Create a Discord application**

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications) → **New Application**
2. **Bot** tab → **Reset Token** → copy token → enable **Server Members Intent**
3. **OAuth2 → URL Generator** → scopes: `bot` + `applications.commands` → permissions: `Send Messages`, `Embed Links`, `Read Message History` → invite the bot

**2. Fill in `.env`**

```
cp .env.example .env
```

| Variable | Where to find it |
|---|---|
| `DISCORD_TOKEN` | Bot tab → Reset Token |
| `CLIENT_ID` | OAuth2 tab → Client ID |
| `GUILD_ID` | Right-click your server → Copy Server ID (enable Developer Mode in Discord settings first) |
| `ADMIN_ROLE_ID` | Right-click a role → Copy Role ID (leave blank to use Manage Guild permission) |

**3. Run**

```bash
npm install
npm run deploy   # register slash commands (run once)
npm start
```

## Commands

| Command | Who | Description |
|---|---|---|
| `/games add <name>` | Admin | Add a game |
| `/games remove <name>` | Admin | Remove a game |
| `/games list` | Anyone | Show all games |
| `/spin` | Admin | Open voting |
| `/vote first: [second:] [third:]` | Anyone | Cast your ranked vote |
| `/close` | Admin | End voting and spin the wheel |
