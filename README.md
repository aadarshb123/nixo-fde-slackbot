# Nixo FDE Slackbot

AI-powered Slack bot that monitors customer messages, classifies issues using GPT-4, and groups them into actionable tickets with a real-time dashboard.

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- Slack workspace with admin access
- OpenAI API key
- Supabase account

### 1. Clone & Install

```bash
git clone <repo-url>
cd nixo-coding-challenge

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 2. Setup Supabase Database

1. Create project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and copy/paste the entire contents of `backend/schema.sql`
3. Click "Run" to execute the schema
4. Enable real-time: Database → Replication → Enable `issue_groups` table

**The schema includes:**
- `messages` table with pgvector embeddings for semantic similarity
- `issue_groups` table with priority and status fields
- `message_groups` junction table for many-to-many relationships
- Optimized indexes for fast queries
- Row Level Security policies

### 3. Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Name it (e.g., "FDE Bot") and select your workspace

**Enable Socket Mode:**
- Settings → Socket Mode → **Enable**
- Generate app-level token with `connections:write` scope
- Copy token (starts with `xapp-`)

**Add Bot Scopes:**
- OAuth & Permissions → Bot Token Scopes:
  - `channels:history` - Read messages
  - `channels:read` - View channel info
  - `users:read` - View user info
  - `chat:write` - Send messages

**Subscribe to Events:**
- Event Subscriptions → Enable Events → Subscribe to bot events:
  - `message.channels`

**Install App:**
- Install App → Install to Workspace
- Copy Bot User OAuth Token (starts with `xoxb-`)

### 4. Configure Environment Variables

Create `.env` files from examples:

```bash
# Root directory
cp .env.example .env

# Edit .env with your credentials
```

Required variables:
```env
# Slack
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
FDE_USER_ID=your-slack-user-id  # Get: Profile → More → Copy member ID

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Getting your FDE_USER_ID:**
- In Slack: Click your profile picture → Profile → ⋮ More → Copy member ID
- Format looks like: `U12345ABCDE`

### 5. Run the App

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python -m app.bot
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Dashboard: http://localhost:5173

## Demo Instructions

### Trigger the Bot

1. **Invite bot to a channel:**
   ```
   /invite @YourBotName
   ```

2. **Send test messages as different users:**

   **Bug report:**
   ```
   Getting a 500 error when I try to load the dashboard. Help!
   ```

   **Support request:**
   ```
   How do I export my data to CSV?
   ```

   **Feature request:**
   ```
   Would love to see dark mode added to the app
   ```

   **Thread response:**
   - Reply to any message in a thread - they'll auto-group together

3. **Watch the dashboard:**
   - Issues appear in real-time (~5-7s)
   - Similar messages group automatically
   - Thread replies group together

### Test Features

**View Issues:**
- Click any card to see details
- Messages show with Slack deep links

**Edit Titles:**
- Click title in modal → edit → press Enter

**Split Tickets:**
- Open issue → click "Split" next to message → creates new ticket

**Merge Tickets:**
- Open issue → "Merge with..." → select target → combines all messages

**Mark Resolved:**
- Toggle "Open/Closed" status in modal

**Filter/Search:**
- Use category filters (support, bug, feature, question)
- Time filters (24h, 7d, 30d, all)
- Search box for keywords

## Troubleshooting

**Bot not receiving messages:**
- Check Socket Mode is enabled
- Verify bot is invited to channel: `/invite @BotName`
- Check `SLACK_APP_TOKEN` starts with `xapp-`
- **Kill zombie bot processes:** Multiple bot instances can cause issues
  ```bash
  # Find all bot processes
  ps aux | grep "app/bot.py" | grep -v grep

  # Kill old processes (keep only the latest)
  kill -9 <PID>
  ```

**Messages stored without embeddings:**
- This happens when old bot instances are running with outdated code
- Kill all bot processes and restart with the latest code
- Verify embeddings are stored: Run in Supabase SQL Editor:
  ```sql
  SELECT id, text, embedding IS NULL as missing_embedding
  FROM messages
  ORDER BY created_at DESC
  LIMIT 10;
  ```

**Database errors:**
- Verify Supabase URL/key are correct
- Check tables exist (run `backend/schema.sql`)
- Ensure pgvector extension is enabled: `CREATE EXTENSION IF NOT EXISTS vector;`
- Enable real-time on `issue_groups` table

**Frontend not updating:**
- Check browser console for errors
- Verify `VITE_*` env vars match Supabase credentials
- Ensure real-time is enabled in Supabase

**Grouping not working:**
- Ensure embeddings are being stored (see above)
- Check similarity threshold in `backend/app/grouping.py` (default: 0.60)
- Verify messages are in the same category for grouping

## Architecture

- **Backend:** Python Slack bot → GPT-4 classification → semantic grouping with embeddings
- **Frontend:** React + TypeScript with real-time Supabase subscriptions
- **Database:** Postgres (Supabase) with 3-table normalized schema
