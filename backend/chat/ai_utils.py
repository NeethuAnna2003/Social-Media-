import random

def check_toxicity(text):
    """
    Simulated AI toxicity check.
    In a real app, this would call OpenAI or a specialized model.
    """
    toxic_keywords = ['badword', 'hate', 'kill', 'stupid', 'idiot'] # Simple list for demo
    for word in toxic_keywords:
        if word in text.lower():
            return True, 0.95
    return False, 0.0

def suggest_smart_replies(last_messages):
    """
    Simulate AI Smart Replies.
    """
    options = [
        "Sounds good to me!",
        "I'll check and get back to you.",
        "Can you clarify that?",
        "Thanks!",
        "Let's meet later.",
        "Okay.",
        "Interesting."
    ]
    return random.sample(options, 3)

def translate_text(text, target_lang='en'):
    """
    Simulate translation.
    """
    # clear Mock translation
    return f"[Translated to {target_lang}]: {text}"

def summarize_chat(messages_text):
    """
    Simulate summarization.
    In a real system, this would use an LLM API.
    """
    if not messages_text:
        return "No content to summarize."
    
    # Heuristic based mock summary for demo purposes
    topics = []
    text_lower = messages_text.lower()
    
    if 'story' in text_lower:
        topics.append("user stories")
    if 'meeting' in text_lower or 'time' in text_lower:
        topics.append("scheduling")
    if 'hello' in text_lower or 'hi' in text_lower:
        topics.append("casual greetings")
    if '?' in messages_text:
        topics.append("information requests")
        
    topic_str = ", ".join(topics) if topics else "general topics"
    
    words = messages_text.split()
    word_count = len(words)
    
    return f"The conversation covered {topic_str}. There was an exchange of approximately {word_count} words discussing these matters."
