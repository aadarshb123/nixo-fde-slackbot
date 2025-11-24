"""
Message grouping strategies.

This module handles intelligent grouping of related messages using:
1. Thread detection - Group messages in the same Slack thread
2. Semantic similarity - Group messages with similar content

Single Responsibility: Only handles message grouping logic.
"""

import numpy as np
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone
from openai import OpenAI
from app.config import OPENAI_API_KEY
from app.classifier import determine_priority
from app.database import (
    get_messages_by_thread,
    create_issue_group,
    add_message_to_group,
    get_all_issue_groups,
    get_messages_in_group
)

# Initialize OpenAI client for embeddings
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Similarity threshold for grouping (0-1, higher = more similar)
# 0.60 allows for reasonable variation in phrasing while grouping related issues
# Lower threshold helps group messages about the same topic with different wording
SIMILARITY_THRESHOLD = 0.60

# Time window for grouping (only compare against recent groups)
# Messages older than this won't be compared for similarity grouping
GROUPING_TIME_WINDOW_HOURS = 24


def group_by_thread(
    message_id: str,
    thread_ts: Optional[str],
    category: str,
    summary: str,
    confidence: float
) -> Optional[str]:
    """
    Group a message with other messages in the same Slack thread.

    Strategy:
    - If message has thread_ts, find or create an issue group for this thread
    - Add message to the group
    - Return the group ID

    Args:
        message_id: Message UUID from database
        thread_ts: Slack thread timestamp (None if not in thread)
        category: Message category
        summary: Message summary

    Returns:
        Group ID if message was grouped, None if not in a thread

    Use Case: Automatic grouping of threaded conversations
    """
    # Skip if not in a thread
    if thread_ts is None:
        return None

    # Check if an issue group already exists for this thread
    all_groups = get_all_issue_groups()
    existing_group = None

    for group in all_groups:
        # Get messages in this group
        messages = get_messages_in_group(group['id'])

        # Check if any message has the same thread_ts
        for msg in messages:
            if msg.get('thread_ts') == thread_ts:
                existing_group = group
                break

        if existing_group:
            break

    # If group exists, add message to it
    if existing_group:
        add_message_to_group(
            message_id=message_id,
            group_id=existing_group['id'],
            similarity_score=1.0  # Same thread = perfect match
        )
        print(f"   🔗 Added to existing thread group: {existing_group['id']}")
        return existing_group['id']

    # Otherwise, create a new group for this thread
    try:
        # Get all messages in thread to create better title/summary
        thread_messages = get_messages_by_thread(thread_ts)

        # Create descriptive title
        if len(thread_messages) > 1:
            title = f"Thread: {thread_messages[0].get('summary', 'Discussion')[:50]}"
        else:
            title = f"Thread: {summary[:50]}"

        # Create group summary
        group_summary = f"Slack thread with {len(thread_messages) + 1} messages. {summary}"

        # Calculate priority based on category and confidence
        priority = determine_priority(category, confidence)

        group_id = create_issue_group(
            title=title,
            summary=group_summary,
            category=category,
            priority=priority
        )

        # Add current message to group
        add_message_to_group(
            message_id=message_id,
            group_id=group_id,
            similarity_score=1.0
        )

        # Add all existing thread messages to group
        for msg in thread_messages:
            if msg['id'] != message_id:  # Avoid duplicate
                add_message_to_group(
                    message_id=msg['id'],
                    group_id=group_id,
                    similarity_score=1.0
                )

        print(f"   ✨ Created new thread group: {group_id}")
        return group_id

    except Exception as e:
        print(f"   ❌ Error creating thread group: {e}")
        return None


def get_embedding(text: str) -> Optional[List[float]]:
    """
    Get embedding vector for text using OpenAI embeddings API.

    Args:
        text: Text to embed

    Returns:
        Embedding vector or None if error

    Model: text-embedding-3-small (cost-effective, high performance)
    """
    try:
        response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding

    except Exception as e:
        print(f"   ❌ Error getting embedding: {e}")
        return None


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Calculate cosine similarity between two vectors.

    Args:
        vec1: First embedding vector
        vec2: Second embedding vector

    Returns:
        Similarity score (0-1, higher = more similar)

    Formula: cos(θ) = (A · B) / (||A|| × ||B||)
    """
    a = np.array(vec1)
    b = np.array(vec2)

    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return float(dot_product / (norm_a * norm_b))


def group_by_similarity(
    message_id: str,
    message_text: str,
    category: str,
    summary: str,
    confidence: float
) -> Optional[str]:
    """
    Group a message with semantically similar messages.

    Strategy:
    1. Get embedding for new message
    2. Compare against recent ungrouped messages in same category
    3. If similarity > threshold, add to existing group
    4. Otherwise, create new group

    Args:
        message_id: Message UUID from database
        message_text: Message text content
        category: Message category (must match for grouping)
        summary: Message summary

    Returns:
        Group ID if message was grouped, None otherwise

    Use Case: Group related issues mentioned in different channels/times
    """
    # Skip irrelevant messages
    if category == 'irrelevant':
        return None

    # Get embedding for new message
    new_embedding = get_embedding(message_text)
    if new_embedding is None:
        return None

    # Get all issue groups (allow cross-category grouping based on semantic similarity)
    all_groups = get_all_issue_groups()

    # Filter to recent groups only (within time window)
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=GROUPING_TIME_WINDOW_HOURS)
    recent_groups = []
    for g in all_groups:
        try:
            created_at = datetime.fromisoformat(g['created_at'].replace('Z', '+00:00'))
            # Ensure created_at is timezone-aware
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            if created_at >= cutoff_time:
                recent_groups.append(g)
        except Exception as e:
            # If timestamp parsing fails, include the group anyway
            print(f"   ⚠️  Could not parse timestamp for group {g['id'][:8]}...: {e}")
            recent_groups.append(g)

    print(f"   📊 Comparing against {len(recent_groups)} recent groups (current category: {category})")

    best_match_group = None
    best_similarity = 0.0

    # Compare against existing groups
    for group in recent_groups:
        messages = get_messages_in_group(group['id'])

        # Skip empty groups
        if not messages:
            continue

        # Calculate similarity with each message in group
        for msg in messages:
            msg_embedding = get_embedding(msg['text'])
            if msg_embedding is None:
                continue

            similarity = cosine_similarity(new_embedding, msg_embedding)

            # Track best match
            if similarity > best_similarity:
                best_similarity = similarity
                best_match_group = group
                print(f"   📈 New best match: {similarity:.3f} (group: {group['id'][:8]}...)")

    # If similarity is high enough, add to existing group
    if best_similarity >= SIMILARITY_THRESHOLD and best_match_group:
        add_message_to_group(
            message_id=message_id,
            group_id=best_match_group['id'],
            similarity_score=best_similarity
        )
        print(f"   🎯 Added to similar group: {best_match_group['id'][:8]}... (similarity: {best_similarity:.3f}, threshold: {SIMILARITY_THRESHOLD})")
        return best_match_group['id']

    # Log why grouping didn't happen
    if best_similarity > 0:
        print(f"   ❌ Best similarity {best_similarity:.3f} below threshold {SIMILARITY_THRESHOLD}")

    # Otherwise, create new group
    try:
        title = f"{category.title()}: {summary[:50]}"
        group_summary = f"Issue group for {category} messages. {summary}"

        # Calculate priority based on category and confidence
        priority = determine_priority(category, confidence)

        group_id = create_issue_group(
            title=title,
            summary=group_summary,
            category=category,
            priority=priority
        )

        add_message_to_group(
            message_id=message_id,
            group_id=group_id,
            similarity_score=1.0
        )

        print(f"   ✨ Created new similarity group: {group_id}")
        return group_id

    except Exception as e:
        print(f"   ❌ Error creating similarity group: {e}")
        return None
