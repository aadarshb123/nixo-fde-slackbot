"""
Main Slack bot application.
Connects to Slack using Socket Mode and logs all incoming messages.
"""

from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from app.config import SLACK_BOT_TOKEN, SLACK_APP_TOKEN, FDE_USER_ID
from app.classifier import classify_message

# Initialize Slack app
app = App(token=SLACK_BOT_TOKEN)


@app.message("")
def handle_message(message, logger):
    """
    Handle all incoming messages.

    Flow:
    1. Filter out bot messages and FDE messages
    2. Classify customer messages using AI
    3. Log classification results
    """
    # Extract message data
    user = message.get("user", "Unknown")
    text = message.get("text", "")
    channel = message.get("channel", "Unknown")
    subtype = message.get("subtype")

    # Filter: Skip bot messages (edited, deleted, bot_message, etc.)
    if subtype is not None:
        logger.info(f"⊘ Skipping message with subtype: {subtype}")
        return

    # Filter: Skip FDE messages
    if user == FDE_USER_ID:
        logger.info(f"⊘ Skipping FDE message")
        return

    # Customer message - classify it
    print(f"\n{'=' * 60}")
    print(f"📨 Customer Message")
    print(f"{'=' * 60}")
    print(f"User:    {user}")
    print(f"Channel: {channel}")
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
    print(f"{'=' * 60}\n")

    # Log to Slack logger
    logger.info(f"Message classified: {classification['category']} (confidence: {classification['confidence']})")

    # TODO: Next step - store in database and group with similar messages


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
