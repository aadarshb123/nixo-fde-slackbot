"""
Main Slack bot application.
Connects to Slack using Socket Mode and logs all incoming messages.
"""

from datetime import datetime
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from app.config import SLACK_BOT_TOKEN, SLACK_APP_TOKEN, FDE_USER_ID
from app.classifier import classify_message
from app.database import store_message, message_exists
from app.grouping import group_by_thread, group_by_similarity

# Initialize Slack app
app = App(token=SLACK_BOT_TOKEN)


@app.message("")
def handle_message(message, client, logger):
    """
    Handle all incoming messages.

    Flow:
    1. Filter out bot messages and FDE messages
    2. Classify customer messages using AI
    3. Store classified messages in database
    """
    # Extract message data
    user_id = message.get("user", "Unknown")
    text = message.get("text", "")
    channel_id = message.get("channel", "Unknown")
    subtype = message.get("subtype")
    slack_message_id = message.get("ts")
    thread_ts = message.get("thread_ts")

    # Filter: Skip bot messages (edited, deleted, bot_message, etc.)
    if subtype is not None:
        logger.info(f"⊘ Skipping message with subtype: {subtype}")
        return

    # Filter: Skip FDE messages
    if user_id == FDE_USER_ID:
        logger.info(f"⊘ Skipping FDE message")
        return

    # Check if message already exists (avoid duplicates)
    if message_exists(slack_message_id):
        logger.info(f"⊘ Message already processed: {slack_message_id}")
        return

    # Fetch user and channel names from Slack API
    try:
        user_info = client.users_info(user=user_id)
        user_name = user_info["user"]["real_name"] or user_info["user"]["name"]
    except Exception as e:
        logger.warning(f"Could not fetch user name: {e}")
        user_name = user_id

    try:
        channel_info = client.conversations_info(channel=channel_id)
        channel_name = channel_info["channel"]["name"]
    except Exception as e:
        logger.warning(f"Could not fetch channel name: {e}")
        channel_name = channel_id

    # Customer message - classify it
    print(f"\n{'=' * 60}")
    print(f"📨 Customer Message")
    print(f"{'=' * 60}")
    print(f"User:    {user_name} ({user_id})")
    print(f"Channel: #{channel_name} ({channel_id})")
    print(f"Text:    {text}")

    # Classify the message
    print(f"\n🤖 Classifying message...")
    classification = classify_message(text)

    # Display classification results
    print(f"\n📊 Classification Results:")
    print(f"   Relevant:   {classification['is_relevant']}")
    print(f"   Category:   {classification['category']}")
    print(f"   Confidence: {classification['confidence']}")
    print(f"   Summary:    {classification['summary']}")

    # Store message in database
    try:
        # Convert Slack timestamp to datetime
        timestamp = datetime.fromtimestamp(float(slack_message_id))

        message_id = store_message(
            slack_message_id=slack_message_id,
            user_id=user_id,
            user_name=user_name,
            channel_id=channel_id,
            channel_name=channel_name,
            text=text,
            thread_ts=thread_ts,
            timestamp=timestamp,
            classification=classification
        )

        print(f"\n💾 Stored in database (ID: {message_id})")
        logger.info(f"Message stored in database: {message_id}")

        # Group the message with related messages
        print(f"\n🔍 Grouping message...")

        # Strategy 1: Try thread-based grouping first (fast & deterministic)
        group_id = group_by_thread(
            message_id=message_id,
            thread_ts=thread_ts,
            category=classification['category'],
            summary=classification['summary'],
            confidence=classification['confidence']
        )

        # Strategy 2: If not in thread, try semantic similarity grouping
        if group_id is None and classification['is_relevant']:
            group_id = group_by_similarity(
                message_id=message_id,
                message_text=text,
                category=classification['category'],
                summary=classification['summary'],
                confidence=classification['confidence']
            )

        if group_id:
            logger.info(f"Message grouped: {group_id}")
        else:
            print(f"   ℹ️  No grouping applied")

    except Exception as e:
        print(f"\n❌ Failed to store/group message: {e}")
        logger.error(f"Database error: {e}")

    print(f"{'=' * 60}\n")

    # Log to Slack logger
    logger.info(f"Message classified: {classification['category']} (confidence: {classification['confidence']})")


@app.error
def handle_error(error, body, logger):
    """
    Global error handler for the Slack app.
    """
    logger.exception(f"❌ Error: {error}")
    logger.info(f"Request body: {body}")


if __name__ == "__main__":
    # Start the bot using Socket Mode
    handler = SocketModeHandler(app, SLACK_APP_TOKEN)
    print("⚡ Nixo FDE Monitor is running!")
    print("   Listening for messages...")
    print(f"   Filtering messages from FDE: {FDE_USER_ID}")
    print("   Socket Mode handler starting...")
    handler.start()
