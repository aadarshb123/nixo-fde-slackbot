"""
Main Slack bot application.
Connects to Slack using Socket Mode and logs all incoming messages.
"""

from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from app.config import SLACK_BOT_TOKEN, SLACK_APP_TOKEN, FDE_USER_ID

# Initialize Slack app
app = App(token=SLACK_BOT_TOKEN)


@app.message("")
def handle_message(message, logger):
    """
    Handle all incoming messages.
    Filters out FDE messages - only process customer messages.
    """
    user = message.get("user", "Unknown")
    text = message.get("text", "")
    channel = message.get("channel", "Unknown")

    # Filter: Skip FDE messages
    if user == FDE_USER_ID:
        logger.info(f"⊘ Skipping FDE message from {user}")
        print(f"⊘ Skipping FDE message")
        return

    # Customer message - process it
    print(f"📨 Customer message received:")
    print(f"   User: {user}")
    print(f"   Channel: {channel}")
    print(f"   Text: {text}")

    logger.info(f"📨 Customer message received:")
    logger.info(f"   User: {user}")
    logger.info(f"   Channel: {channel}")
    logger.info(f"   Text: {text}")


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
