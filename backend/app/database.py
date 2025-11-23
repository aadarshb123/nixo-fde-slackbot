"""
Database client for Supabase operations.

This module handles all database interactions for storing and retrieving
Slack messages and issue groups.

Single Responsibility: Only handles database operations.
Dependency Inversion: Uses Supabase client abstraction.
"""

from datetime import datetime
from typing import Dict, Any, Optional
from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_KEY


# Initialize Supabase client (singleton pattern)
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Get or create Supabase client instance.

    Returns:
        Supabase client instance

    Design Pattern: Singleton - ensures single database connection
    """
    global _supabase_client

    if _supabase_client is None:
        # Create client with correct initialization
        _supabase_client = create_client(
            supabase_url=SUPABASE_URL,
            supabase_key=SUPABASE_KEY
        )

    return _supabase_client


def store_message(
    slack_message_id: str,
    user_id: str,
    user_name: str,
    channel_id: str,
    channel_name: str,
    text: str,
    thread_ts: Optional[str],
    timestamp: datetime,
    classification: Dict[str, Any]
) -> str:
    """
    Store a classified Slack message in the database.

    Args:
        slack_message_id: Slack's unique message timestamp (ts)
        user_id: Slack user ID
        user_name: Human-readable user name
        channel_id: Slack channel ID
        channel_name: Human-readable channel name
        text: Message text content
        thread_ts: Thread timestamp if message is in a thread
        timestamp: Message timestamp
        classification: Classification results with keys:
            - is_relevant (bool)
            - category (str)
            - confidence (float)
            - summary (str)

    Returns:
        UUID of the stored message

    Raises:
        Exception: If database operation fails
    """
    supabase = get_supabase_client()

    # Prepare message data
    message_data = {
        'slack_message_id': slack_message_id,
        'user_id': user_id,
        'user_name': user_name,
        'channel_id': channel_id,
        'channel_name': channel_name,
        'text': text,
        'thread_ts': thread_ts,
        'timestamp': timestamp.isoformat(),
        'is_relevant': classification['is_relevant'],
        'category': classification['category'],
        'confidence': classification['confidence'],
        'summary': classification['summary']
    }

    try:
        # Insert message into database
        result = supabase.table('messages').insert(message_data).execute()

        # Extract and return the message ID
        message_id = result.data[0]['id']
        return message_id

    except Exception as e:
        print(f"❌ Database error storing message: {e}")
        raise


def message_exists(slack_message_id: str) -> bool:
    """
    Check if a message already exists in the database.

    Args:
        slack_message_id: Slack's unique message timestamp

    Returns:
        True if message exists, False otherwise

    Use Case: Prevent duplicate message storage
    """
    supabase = get_supabase_client()

    try:
        result = supabase.table('messages')\
            .select('id')\
            .eq('slack_message_id', slack_message_id)\
            .execute()

        return len(result.data) > 0

    except Exception as e:
        print(f"❌ Database error checking message existence: {e}")
        return False


def get_message_by_id(message_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve a message by its UUID.

    Args:
        message_id: Message UUID

    Returns:
        Message data dictionary or None if not found
    """
    supabase = get_supabase_client()

    try:
        result = supabase.table('messages')\
            .select('*')\
            .eq('id', message_id)\
            .execute()

        if result.data:
            return result.data[0]
        return None

    except Exception as e:
        print(f"❌ Database error retrieving message: {e}")
        return None


def get_messages_by_thread(thread_ts: str) -> list[Dict[str, Any]]:
    """
    Get all messages in a specific Slack thread.

    Args:
        thread_ts: Slack thread timestamp

    Returns:
        List of message dictionaries

    Use Case: Thread-based grouping strategy
    """
    supabase = get_supabase_client()

    try:
        result = supabase.table('messages')\
            .select('*')\
            .eq('thread_ts', thread_ts)\
            .order('timestamp')\
            .execute()

        return result.data

    except Exception as e:
        print(f"❌ Database error retrieving thread messages: {e}")
        return []
