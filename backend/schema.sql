-- FDE Slackbot Database Schema
-- Run this in Supabase SQL Editor

-- Enable pgvector extension (required for embeddings and semantic similarity)
CREATE EXTENSION IF NOT EXISTS vector;

-- Table 1: messages
-- Stores all relevant Slack messages from customers
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slack_message_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT,
    channel_id TEXT NOT NULL,
    channel_name TEXT,
    text TEXT NOT NULL,
    thread_ts TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    is_relevant BOOLEAN NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('support', 'bug', 'feature', 'question', 'irrelevant')),
    confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    summary TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI embedding for semantic similarity (text-embedding-3-small)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: issue_groups
-- Clusters of related messages (same issue)
CREATE TABLE issue_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('support', 'bug', 'feature', 'question')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 3: message_groups
-- Many-to-many relationship between messages and issue groups
CREATE TABLE message_groups (
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    group_id UUID REFERENCES issue_groups(id) ON DELETE CASCADE,
    similarity_score FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (message_id, group_id)
);

-- Indexes for performance
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_messages_relevant ON messages(is_relevant) WHERE is_relevant = true;
CREATE INDEX idx_messages_category ON messages(category);
CREATE INDEX idx_messages_channel ON messages(channel_id);
CREATE INDEX idx_messages_thread ON messages(thread_ts) WHERE thread_ts IS NOT NULL;
CREATE INDEX idx_messages_embedding ON messages USING ivfflat (embedding vector_cosine_ops);  -- For fast similarity search
CREATE INDEX idx_groups_status ON issue_groups(status);
CREATE INDEX idx_groups_created ON issue_groups(created_at DESC);
CREATE INDEX idx_message_groups_group ON message_groups(group_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on issue_groups
CREATE TRIGGER update_issue_groups_updated_at
    BEFORE UPDATE ON issue_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - Good practice
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_groups ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (since this is internal)
CREATE POLICY "Allow all operations on messages" ON messages FOR ALL USING (true);
CREATE POLICY "Allow all operations on issue_groups" ON issue_groups FOR ALL USING (true);
CREATE POLICY "Allow all operations on message_groups" ON message_groups FOR ALL USING (true);
