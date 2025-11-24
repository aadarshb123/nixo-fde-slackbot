"""
AI-powered message classifier for FDE Slackbot.

This module uses OpenAI's GPT-4o-mini to classify customer messages
into categories: support, bug, feature, question, or irrelevant.

Single Responsibility: Only handles message classification.
"""

import json
from typing import Dict, Any
from openai import OpenAI
from app.config import OPENAI_API_KEY


# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)


# Classification prompt template
CLASSIFICATION_PROMPT = """You are a support ticket classifier for a Forward-Deployed Engineering team.

Analyze this Slack message and determine:
1. Is it RELEVANT? (requires FDE attention vs social chat)
2. What CATEGORY does it belong to?
3. Generate a SHORT SUMMARY (1 sentence, <100 chars)

Categories:
- "support": User needs help with existing features
- "bug": Something isn't working correctly
- "feature": Request for new functionality
- "question": Product/technical questions
- "irrelevant": Social chat, greetings, thank yous

IMPORTANT:
- Mark "irrelevant" for: greetings, social chat, emojis-only, scheduling
- Mark "relevant" for: any customer question/issue/request
- Be strict about irrelevant messages

Message: "{message_text}"

Respond with ONLY valid JSON:
{{
  "is_relevant": true/false,
  "category": "support|bug|feature|question|irrelevant",
  "confidence": 0.0-1.0,
  "summary": "one-sentence summary"
}}"""


def classify_message(message_text: str) -> Dict[str, Any]:
    """
    Classify a customer message using GPT-4o-mini.

    Args:
        message_text: The text content of the message to classify

    Returns:
        Dictionary containing:
            - is_relevant (bool): Whether the message needs FDE attention
            - category (str): Message category (support/bug/feature/question/irrelevant)
            - confidence (float): Classification confidence score (0.0-1.0)
            - summary (str): One-sentence summary of the message

    Raises:
        Exception: If OpenAI API call fails or response is invalid
    """
    try:
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise message classifier. Return only valid JSON."
                },
                {
                    "role": "user",
                    "content": CLASSIFICATION_PROMPT.format(message_text=message_text)
                }
            ],
            temperature=0.3,  # Lower temperature for more consistent results
            max_tokens=150
        )

        # Extract response text
        result_text = response.choices[0].message.content.strip()

        # Clean markdown code blocks if present
        result_text = _clean_json_response(result_text)

        # Parse JSON
        result = json.loads(result_text)

        # Validate required fields
        _validate_classification(result)

        return result

    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {e}")
        print(f"Response text: {result_text}")
        return _get_default_classification()

    except Exception as e:
        print(f"❌ Classification error: {e}")
        return _get_default_classification()


def _clean_json_response(text: str) -> str:
    """
    Remove markdown code block formatting from JSON response.

    Args:
        text: Raw response text that may contain markdown

    Returns:
        Cleaned JSON string
    """
    if text.startswith("```"):
        # Remove code block markers
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    return text


def _validate_classification(result: Dict[str, Any]) -> None:
    """
    Validate that classification result has all required fields.

    Args:
        result: Classification result dictionary

    Raises:
        ValueError: If required fields are missing
    """
    required_fields = ['is_relevant', 'category', 'confidence', 'summary']

    for field in required_fields:
        if field not in result:
            raise ValueError(f"Missing required field: {field}")

    # Validate category
    valid_categories = ['support', 'bug', 'feature', 'question', 'irrelevant']
    if result['category'] not in valid_categories:
        raise ValueError(f"Invalid category: {result['category']}")


def _get_default_classification() -> Dict[str, Any]:
    """
    Return a safe default classification for error cases.

    Returns:
        Default classification marking message as irrelevant
    """
    return {
        'is_relevant': False,
        'category': 'irrelevant',
        'confidence': 0.0,
        'summary': 'Classification error'
    }


def determine_priority(category: str, confidence: float) -> str:
    """
    Automatically determine priority based on message category and confidence.

    Priority Rules:
    - bug + high confidence (>0.8) = critical
    - bug + medium confidence = high
    - bug + low confidence = medium
    - support = high (customers need help urgently)
    - feature = low (can be planned)
    - question = medium (needs response but not urgent)
    - irrelevant = low

    Args:
        category: Message category (support/bug/feature/question/irrelevant)
        confidence: Classification confidence (0.0-1.0)

    Returns:
        Priority level: 'critical', 'high', 'medium', or 'low'
    """
    if category == 'bug':
        if confidence >= 0.8:
            return 'critical'  # High-confidence bug = critical
        elif confidence >= 0.6:
            return 'high'      # Medium-confidence bug = high
        else:
            return 'medium'    # Low-confidence bug = medium

    elif category == 'support':
        return 'high'          # Customer needs help = high priority

    elif category == 'question':
        return 'medium'        # Questions need response = medium priority

    elif category == 'feature':
        return 'low'           # Feature requests = low priority

    else:  # irrelevant
        return 'low'           # Irrelevant = low priority
