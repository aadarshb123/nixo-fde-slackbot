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
    classification: Dict[str, Any],
    embedding: Optional[list] = None
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

    # Format embedding as string for pgvector if provided
    if embedding is not None:
        # Convert to string format for pgvector: "[val1,val2,...]"
        embedding_str = '[' + ','.join(map(str, embedding)) + ']'
        message_data['embedding'] = embedding_str

    try:
        # Insert message into database
        result = supabase.table('messages').insert(message_data).execute()
        message_id = result.data[0]['id']

        return message_id

    except Exception as e:
        print(f"❌ Database error storing message: {e}")
        import traceback
        traceback.print_exc()
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


def create_issue_group(
    title: str,
    summary: str,
    category: str,
    priority: str = 'medium'
) -> str:
    """
    Create a new issue group.

    Args:
        title: Short title for the issue group
        summary: Detailed summary of the grouped issue
        category: Issue category (support, bug, feature, question)
        priority: Priority level (critical, high, medium, low). Defaults to 'medium'

    Returns:
        UUID of the created issue group

    Raises:
        Exception: If database operation fails
    """
    supabase = get_supabase_client()

    group_data = {
        'title': title,
        'summary': summary,
        'category': category,
        'status': 'open',
        'priority': priority
    }

    try:
        result = supabase.table('issue_groups').insert(group_data).execute()
        group_id = result.data[0]['id']
        return group_id

    except Exception as e:
        print(f"❌ Database error creating issue group: {e}")
        raise


def get_all_issue_groups() -> list[Dict[str, Any]]:
    """
    Get all issue groups ordered by creation date.

    Returns:
        List of issue group dictionaries

    Use Case: Dashboard display
    """
    supabase = get_supabase_client()

    try:
        result = supabase.table('issue_groups')\
            .select('*')\
            .order('created_at', desc=True)\
            .execute()

        return result.data

    except Exception as e:
        print(f"❌ Database error retrieving issue groups: {e}")
        return []


def get_issue_group_by_id(group_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve an issue group by its UUID.

    Args:
        group_id: Issue group UUID

    Returns:
        Issue group data dictionary or None if not found
    """
    supabase = get_supabase_client()

    try:
        result = supabase.table('issue_groups')\
            .select('*')\
            .eq('id', group_id)\
            .execute()

        if result.data:
            return result.data[0]
        return None

    except Exception as e:
        print(f"❌ Database error retrieving issue group: {e}")
        return None


def add_message_to_group(
    message_id: str,
    group_id: str,
    similarity_score: Optional[float] = None
) -> bool:
    """
    Add a message to an issue group.

    Args:
        message_id: Message UUID
        group_id: Issue group UUID
        similarity_score: Optional similarity score (0-1)

    Returns:
        True if successful, False otherwise

    Use Case: Grouping strategy implementation
    """
    supabase = get_supabase_client()

    relationship_data = {
        'message_id': message_id,
        'group_id': group_id,
        'similarity_score': similarity_score
    }

    try:
        supabase.table('message_groups').insert(relationship_data).execute()
        return True

    except Exception as e:
        print(f"❌ Database error adding message to group: {e}")
        return False


def get_messages_in_group(group_id: str) -> list[Dict[str, Any]]:
    """
    Get all messages in a specific issue group.

    Args:
        group_id: Issue group UUID

    Returns:
        List of message dictionaries with similarity scores

    Use Case: Display grouped messages in dashboard
    """
    supabase = get_supabase_client()

    try:
        # Join messages with message_groups to get similarity scores
        # Explicitly request embedding field
        result = supabase.table('message_groups')\
            .select('similarity_score, messages(id, text, user_name, channel_name, timestamp, category, summary, embedding)')\
            .eq('group_id', group_id)\
            .execute()

        # Extract message data with similarity scores
        messages_with_scores = []
        for row in result.data:
            message = row['messages']
            message['similarity_score'] = row['similarity_score']
            messages_with_scores.append(message)

        return messages_with_scores

    except Exception as e:
        print(f"❌ Database error retrieving group messages: {e}")
        return []


def update_issue_group_status(group_id: str, status: str) -> bool:
    """
    Update the status of an issue group.

    Args:
        group_id: Issue group UUID
        status: New status ('open' or 'closed')

    Returns:
        True if successful, False otherwise

    Use Case: Mark issues as resolved
    """
    supabase = get_supabase_client()

    try:
        supabase.table('issue_groups')\
            .update({'status': status})\
            .eq('id', group_id)\
            .execute()
        return True

    except Exception as e:
        print(f"❌ Database error updating issue group status: {e}")
        return False


def update_issue_group_title(group_id: str, title: str) -> bool:
    """
    Update the title of an issue group.

    Args:
        group_id: Issue group UUID
        title: New title string

    Returns:
        True if successful, False otherwise

    Use Case: Manual FDE editing of group titles
    """
    supabase = get_supabase_client()

    try:
        supabase.table('issue_groups')\
            .update({'title': title})\
            .eq('id', group_id)\
            .execute()
        return True

    except Exception as e:
        print(f"❌ Database error updating issue group title: {e}")
        return False


def update_issue_group_priority(group_id: str, priority: str) -> bool:
    """
    Update the priority of an issue group.

    Args:
        group_id: Issue group UUID
        priority: New priority (critical, high, medium, low)

    Returns:
        True if successful, False otherwise

    Use Case: FDE changes priority of an issue
    """
    supabase = get_supabase_client()

    try:
        supabase.table('issue_groups')\
            .update({'priority': priority})\
            .eq('id', group_id)\
            .execute()
        return True

    except Exception as e:
        print(f"❌ Database error updating issue group priority: {e}")
        return False


def update_issue_group_workflow_status(group_id: str, workflow_status: str) -> bool:
    """
    Update the workflow status of an issue group.

    Args:
        group_id: Issue group UUID
        workflow_status: New status (backlog, todo, in_progress, blocked, resolved, closed)

    Returns:
        True if successful, False otherwise

    Use Case: FDE moves issue through workflow
    """
    supabase = get_supabase_client()

    try:
        supabase.table('issue_groups')\
            .update({'workflow_status': workflow_status})\
            .eq('id', group_id)\
            .execute()
        return True

    except Exception as e:
        print(f"❌ Database error updating issue group workflow status: {e}")
        return False


def update_issue_group_assignee(group_id: str, assignee: Optional[str]) -> bool:
    """
    Update the assignee of an issue group.

    Args:
        group_id: Issue group UUID
        assignee: FDE email/name or None to unassign

    Returns:
        True if successful, False otherwise

    Use Case: Assign issue to specific FDE
    """
    supabase = get_supabase_client()

    try:
        supabase.table('issue_groups')\
            .update({'assignee': assignee})\
            .eq('id', group_id)\
            .execute()
        return True

    except Exception as e:
        print(f"❌ Database error updating issue group assignee: {e}")
        return False


def update_issue_group_due_date(group_id: str, due_date: Optional[str]) -> bool:
    """
    Update the due date of an issue group.

    Args:
        group_id: Issue group UUID
        due_date: Due date (ISO format string) or None to clear

    Returns:
        True if successful, False otherwise

    Use Case: Set target resolution date
    """
    supabase = get_supabase_client()

    try:
        supabase.table('issue_groups')\
            .update({'due_date': due_date})\
            .eq('id', group_id)\
            .execute()
        return True

    except Exception as e:
        print(f"❌ Database error updating issue group due date: {e}")
        return False


def split_message_to_new_group(message_id: str, current_group_id: str) -> Optional[str]:
    """
    Split a message from its current group into a new group.

    Args:
        message_id: Message UUID to split out
        current_group_id: Current group ID the message belongs to

    Returns:
        New group ID if successful, None otherwise

    Use Case: FDE manually splits incorrectly grouped message
    """
    supabase = get_supabase_client()

    try:
        # Get the message details
        message = get_message_by_id(message_id)
        if not message:
            print(f"❌ Message not found: {message_id}")
            return None

        # Create a new group for this message
        new_group_id = create_issue_group(
            title=f"{message['category'].title()}: {message['summary'][:50]}",
            summary=message['summary'],
            category=message['category']
        )

        # Remove message from old group
        supabase.table('message_groups')\
            .delete()\
            .eq('message_id', message_id)\
            .eq('group_id', current_group_id)\
            .execute()

        # Add message to new group
        add_message_to_group(
            message_id=message_id,
            group_id=new_group_id,
            similarity_score=1.0
        )

        print(f"✂️  Split message {message_id[:8]}... into new group {new_group_id[:8]}...")
        return new_group_id

    except Exception as e:
        print(f"❌ Database error splitting message: {e}")
        return None


def merge_groups(source_group_id: str, target_group_id: str) -> bool:
    """
    Merge all messages from source group into target group.

    Args:
        source_group_id: Group to merge from (will be deleted)
        target_group_id: Group to merge into (will remain)

    Returns:
        True if successful, False otherwise

    Use Case: FDE manually merges related groups
    """
    supabase = get_supabase_client()

    try:
        # Get all messages in source group
        source_messages = get_messages_in_group(source_group_id)

        # Move each message to target group
        for msg in source_messages:
            # Remove from source group
            supabase.table('message_groups')\
                .delete()\
                .eq('message_id', msg['id'])\
                .eq('group_id', source_group_id)\
                .execute()

            # Add to target group
            add_message_to_group(
                message_id=msg['id'],
                group_id=target_group_id,
                similarity_score=msg.get('similarity_score', 1.0)
            )

        # Delete the source group
        supabase.table('issue_groups')\
            .delete()\
            .eq('id', source_group_id)\
            .execute()

        print(f"🔀 Merged group {source_group_id[:8]}... into {target_group_id[:8]}...")
        return True

    except Exception as e:
        print(f"❌ Database error merging groups: {e}")
        return False


def move_message_to_group(message_id: str, current_group_id: str, target_group_id: str) -> bool:
    """
    Move a message from one group to another existing group.

    Args:
        message_id: Message UUID to move
        current_group_id: Current group ID
        target_group_id: Target group ID to move to

    Returns:
        True if successful, False otherwise

    Use Case: FDE manually reassigns message to different existing group
    """
    supabase = get_supabase_client()

    try:
        # Remove from current group
        supabase.table('message_groups')\
            .delete()\
            .eq('message_id', message_id)\
            .eq('group_id', current_group_id)\
            .execute()

        # Add to target group
        add_message_to_group(
            message_id=message_id,
            group_id=target_group_id,
            similarity_score=1.0
        )

        print(f"➡️  Moved message {message_id[:8]}... to group {target_group_id[:8]}...")
        return True

    except Exception as e:
        print(f"❌ Database error moving message: {e}")
        return False


def get_issue_groups_by_category(category: str) -> list[Dict[str, Any]]:
    """
    Get all issue groups for a specific category.

    Args:
        category: Category to filter by (support, bug, feature, question)

    Returns:
        List of issue group dictionaries

    Use Case: Dashboard filtering
    """
    supabase = get_supabase_client()

    try:
        result = supabase.table('issue_groups')\
            .select('*')\
            .eq('category', category)\
            .order('created_at', desc=True)\
            .execute()

        return result.data

    except Exception as e:
        print(f"❌ Database error retrieving issue groups by category: {e}")
        return []
