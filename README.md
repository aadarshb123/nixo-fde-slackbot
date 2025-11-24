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
2. Go to SQL Editor and run:

```sql
-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slack_message_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    text TEXT NOT NULL,
    thread_ts TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    is_relevant BOOLEAN NOT NULL,
    category TEXT NOT NULL,
    confidence FLOAT NOT NULL,
    summary TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issue groups table
CREATE TABLE issue_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table
CREATE TABLE message_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    group_id UUID REFERENCES issue_groups(id) ON DELETE CASCADE,
    similarity_score FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, group_id)
);

-- Indexes
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_messages_thread ON messages(thread_ts);
CREATE INDEX idx_messages_category ON messages(category);
CREATE INDEX idx_issue_groups_created ON issue_groups(created_at DESC);
CREATE INDEX idx_issue_groups_status ON issue_groups(status);
CREATE INDEX idx_message_groups_message ON message_groups(message_id);
CREATE INDEX idx_message_groups_group ON message_groups(group_id);
```

3. Enable real-time: Database → Replication → Enable `issue_groups` table

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

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

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

**Database errors:**
- Verify Supabase URL/key are correct
- Check tables exist (run schema SQL)
- Enable real-time on `issue_groups` table

**Frontend not updating:**
- Check browser console for errors
- Verify `VITE_*` env vars match Supabase credentials
- Ensure real-time is enabled in Supabase

## Architecture

- **Backend:** Python Slack bot → GPT-4 classification → semantic grouping with embeddings
- **Frontend:** React + TypeScript with real-time Supabase subscriptions
- **Database:** Postgres (Supabase) with 3-table normalized schema
