import re
import random
import json
import requests
import numpy as np
import os
import time
import io
import torch
from PIL import Image
from huggingface_hub import InferenceClient
from transformers import BlipProcessor, BlipForConditionalGeneration
import google.generativeai as genai

# NOTE: InferenceClient removed. All AI is now LOCAL.

# Models
# MODEL_CAPTION is loaded locally via transformers/torch below.
# MODEL_HASHTAG is replaced by local algorithm.

# --- LOCAL MODEL LOADER ---
# Global placeholders
processor = None
model = None

def load_blip_model():
    global processor, model
    if model is not None:
        return

    print("Loading local BLIP model... (this may take a moment)")
    try:
        processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
        print("BLIP model loaded successfully.")
    except Exception as e:
        print(f"Failed to load local BLIP model: {e}")
        processor = None
        model = None

# --- RESOURCES ---

BAD_WORDS = {
    "abuse", "idiot", "stupid", "hate", "kill", "murder", "ugly", "fat", "dumb", 
    "trash", "filth", "nasty", "violent", "attack", "racist", "sexist"
}

POSITIVE_WORDS = {
    "love", "great", "awesome", "beautiful", "happy", "joy", "amazing", "good", 
    "best", "wonderful", "exciting", "fun", "cool", "nice", "perfect", "fantastic"
}

NEGATIVE_WORDS = {
    "sad", "bad", "terrible", "horrible", "awful", "worst", "hate", "pain", 
    "angry", "upset", "disappoint", "fail", "poor", "boring", "annoying"
}

GENERIC_CAPTIONS = [
    "Loving this vibe! ✨",
    "Making memories 📸",
    "Just another day in paradise 🌴",
    "Living my best life!",
    "Caught in the moment.",
    "Good times & tan lines.",
    "Do more of what makes you happy.",
    "Simple moments, big memories.",
    "Feeling grateful.",
    "Adventure awaits!",
    "Chasing sunsets.",
    "Dream big, sparkle more."
]

CATEGORY_CAPTIONS = {
    "nature": ["Lost in the woods.", "Nature is my therapy 🌿", "Wild and free.", "Earth laughs in flowers."],
    "beach": ["Salty air, sun-kissed hair.", "Beach bum.", "Ocean child 🌊", "Tropical state of mind."],
    "food": ["Good food, good mood.", "Taste of heaven.", "Diet starts tomorrow 🍔", "Bon appetit!"],
    "tech": ["Coding away 💻", "Future is now.", "Tech life.", "Hello World!"],
    "friends": ["Squad goals.", "Friendship goals.", "Better together.", "Partners in crime."],
    "fitness": ["Sweat now, shine later.", "Beast mode on.", "Stronger every day.", "No pain no gain."],
    "travel": ["Wanderlust.", "Travel bug.", "Collecting moments.", "Let's fly away ✈️"]
}

# --- HELPER FUNCTIONS ---

def clean_text(text):
    return re.sub(r'[^\w\s]', '', text.lower())

def analyze_toxicity_logic(text):
    words = clean_text(text).split()
    found_flags = [word for word in words if word in BAD_WORDS]
    score = len(found_flags) / len(words) if words else 0.0
    score = min(score * 5, 1.0)
    
    return {
        "is_toxic": score > 0.1,
        "toxicity_score": round(score, 2),
        "flagged_words": found_flags
    }

def analyze_sentiment_logic(text):
    words = clean_text(text).split()
    pos_score = sum(1 for w in words if w in POSITIVE_WORDS)
    neg_score = sum(1 for w in words if w in NEGATIVE_WORDS)
    
    total = pos_score + neg_score
    if total == 0:
        label = "Neutral"
        score = 0.0
    else:
        raw_score = (pos_score - neg_score) / total
        label = "Positive" if raw_score > 0.1 else ("Negative" if raw_score < -0.1 else "Neutral")
        score = round(raw_score, 2)
        
    return {
        "sentiment": label,
        "sentiment_score": score
    }

def analyze_comment_logic(text):
    """
    Strict comment sentiment classifier.
    
    Returns JSON:
    {
        "sentiment": "positive" | "neutral" | "negative",
        "confidence": float (0-1),
        "toxicScore": float (0-1)
    }
    
    Rules:
    - Hate speech, abuse, harassment → negative
    - Compliments, encouragement → positive
    - Informational or casual → neutral
    """
    cleaned = clean_text(text)
    words = cleaned.split()
    
    # Initialize scores
    toxic_score = 0.0
    confidence = 0.85
    sentiment = "neutral"
    
    # 1. TOXICITY DETECTION
    found_flags = []
    
    # Check for toxic words
    for word in words:
        if word in BAD_WORDS:
            found_flags.append(word)
            continue
        
        # Check if toxic word is substring (e.g., "hate" in "hating")
        for bad in BAD_WORDS:
            if len(bad) > 3 and bad in word:
                found_flags.append(word)
                break
    
    # Calculate toxic score
    if len(found_flags) > 0:
        found_flags = list(set(found_flags))  # Remove duplicates
        
        # High severity words
        high_severity = ["kill", "murder", "hate", "racist", "violent", "abuse", 
                        "hating", "hater", "idiot", "stupid", "trash", "filth"]
        
        # Check severity
        severe_count = 0
        for flag in found_flags:
            if flag in high_severity:
                severe_count += 1
            else:
                # Check substring matches
                for sev in ["kill", "murder", "hate", "racist", "abus", "violent"]:
                    if sev in flag:
                        severe_count += 1
                        break
        
        # Calculate toxic score (0-1 scale)
        if severe_count > 0:
            toxic_score = min(0.7 + (severe_count * 0.1), 1.0)  # 0.7-1.0 for severe
            confidence = 0.98
        else:
            toxic_score = min(0.4 + (len(found_flags) * 0.1), 0.6)  # 0.4-0.6 for mild
            confidence = 0.85
    
    # 2. SENTIMENT ANALYSIS
    pos_score = sum(1 for w in words if w in POSITIVE_WORDS)
    neg_score = sum(1 for w in words if w in NEGATIVE_WORDS)
    
    total = pos_score + neg_score
    
    if toxic_score >= 0.5:
        # High toxicity = negative sentiment
        sentiment = "negative"
        confidence = max(confidence, 0.95)
    elif total > 0:
        raw_score = (pos_score - neg_score) / total
        
        if raw_score > 0.2:
            sentiment = "positive"
            confidence = min(0.75 + abs(raw_score) * 0.2, 0.95)
        elif raw_score < -0.2:
            sentiment = "negative"
            confidence = min(0.75 + abs(raw_score) * 0.2, 0.95)
        else:
            sentiment = "neutral"
            confidence = 0.70
    else:
        # No clear sentiment indicators
        sentiment = "neutral"
        confidence = 0.60
    
    # 3. RETURN STRICT JSON FORMAT
    return {
        "sentiment": sentiment,
        "confidence": round(confidence, 2),
        "toxicScore": round(toxic_score, 2),
        # Legacy fields for backward compatibility
        "toxicity": "high" if toxic_score >= 0.7 else ("medium" if toxic_score >= 0.4 else "none"),
        "reason": f"Contains forbidden content: {', '.join(found_flags[:3])}" if found_flags else ""
    }

def analyze_comment_semantic_logic(text, keyword_flagged=False):
    """
    Advanced semantic analysis and contextual understanding of a comment.
    Returns JSON strictly following the new AI Moderation Engine guidelines.
    """
    api_key = None
    try:
        from django.conf import settings
        api_key = getattr(settings, 'GEMINI_API_KEY', None)
    except Exception:
        pass

    if not api_key:
        api_key = os.environ.get('GEMINI_API_KEY')

    if not api_key:
        return _fallback_semantic_analysis(text, keyword_flagged)

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = f"""You are an advanced AI moderation engine for a social media platform.
The platform already uses a keyword filtering system.
Your job is to perform semantic analysis and contextual understanding of the following comment.

Instructions:
1. Analyze the meaning, intent, tone, and context.
2. Detect disguised abuse, indirect threats, sarcasm, or coded language.
3. Consider multilingual content (English, Hindi, Malayalam, Manglish).
4. Consider whether the comment is attacking a person, group, or community.
5. Distinguish between friendly banter and real harassment.

Comment: "{text}"
Keyword Filter Flagged: {str(keyword_flagged).lower()}

Return JSON ONLY in this exact structure, with no markdown code blocks around it:
{{
  "semantic_toxicity_score": <float 0-1>,
  "intent": "<neutral|criticism|insult|harassment|threat|hate|sexual|self-harm|spam>",
  "severity_level": "<low|medium|high|critical>",
  "recommended_action": "<VISIBLE|REVIEW|HIDDEN>",
  "confidence": <float 0-1>,
  "explanation": "<Short clear explanation>"
}}

Decision Guidelines:
- If severity is critical -> HIDDEN
- If high -> HIDDEN
- If medium -> REVIEW
- If low -> REVIEW if keyword_flagged = true, otherwise VISIBLE
- If neutral -> VISIBLE
"""
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Clean markdown if present
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
            
        return json.loads(response_text)
    except Exception as e:
        print(f"Semantic analysis error: {e}")
        return _fallback_semantic_analysis(text, keyword_flagged)

def _fallback_semantic_analysis(text, keyword_flagged=False):
    """Fallback logic when Gemini API is unavailable or fails."""
    clean_text = text.lower()
    
    score = 0.0
    intent = "neutral"
    severity = "low"
    
    # Simple keyword-based rules for fallback
    threat_patterns = ["kill", "murder", "won't be so lucky", "won't be lucky", "disappear"]
    spam_patterns = ["buy followers", "cheap price", "dm now"]
    insult_patterns = ["idiot", "stupid", "dumb", "ugly"]
    harassment_patterns = ["hate you", "loser", "trash"]
    
    if any(p in clean_text for p in threat_patterns):
        score = 0.95
        intent = "threat"
        severity = "critical"
    elif any(p in clean_text for p in harassment_patterns):
        score = 0.85
        intent = "harassment"
        severity = "high"
    elif any(p in clean_text for p in spam_patterns):
        score = 0.50
        intent = "spam"
        severity = "medium"
    elif any(p in clean_text for p in insult_patterns):
        score = 0.40
        intent = "insult"
        severity = "low"
    elif keyword_flagged:
        score = 0.30
        intent = "criticism"
        severity = "low"
    else:
        # Check if it was neutral / positive
        pass

    action = "VISIBLE"
    if severity == "critical" or severity == "high":
        action = "HIDDEN"
    elif severity == "medium":
        action = "REVIEW"
    elif severity == "low" and keyword_flagged:
        action = "REVIEW"

    return {
        "semantic_toxicity_score": score,
        "intent": intent,
        "severity_level": severity,
        "recommended_action": action,
        "confidence": 0.8,
        "explanation": "Fallback analysis applied."
    }

def analyze_word_filter_request(words_text, reason):
    """
    AI Moderation to automatically approve or reject a user's word filter request.
    Decides based on whether the words are normal slurs, offensive words, or spam vs 
    if they are common functional words (like "the", "and", "is") which shouldn't be filtered.
    Returns: JSON {"action": "approve" | "reject", "reason": "Explanation"}
    """
    api_key = None
    try:
        from django.conf import settings
        api_key = getattr(settings, 'GEMINI_API_KEY', None)
    except Exception:
        pass

    if not api_key:
        api_key = os.environ.get('GEMINI_API_KEY')

    if not api_key:
        # Fallback mechanism
        common_words = {"the", "and", "is", "of", "to", "in", "it", "with", "for", "on", "that", "this", "my", "are"}
        words_list = [w.strip().lower() for w in words_text.split(',')]
        
        # If any user-requested word is a highly common generic word, reject it
        for w in words_list:
            if w in common_words:
                return {
                    "action": "reject",
                    "reason": f"Cannot filter common functional word: '{w}'"
                }
        
        return {
            "action": "approve",
            "reason": "Word(s) seem acceptable for custom filtering."
        }
        
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = f"""You are an AI content moderation system.
In admin page
Your task is to analyze a user comment and decide whether it should be APPROVED or REJECTED.

In admin page , Approve comments that contain:
- Hate speech
- Personal attacks or insults
- Harassment or bullying
- Profanity or abusive language
- Sexual or explicit content
- Threats or violence
- Spam or promotional links

Reject comments that are:
- Respectful
- Neutral discussions
- Constructive criticism
- Normal conversation

Here Approve means , it should not be visible to public , it should be hidden that words .

Return the response ONLY in this JSON format:

{{
 "decision": "APPROVE or REJECT",
 "reason": "Short explanation"
}}

Comment: "{words_text}"

✅ Example Responses
Input
"You are stupid and useless"

Output
{{
 "decision": "APPROVE",
 "reason": "Contains personal insult"
}}
Input
"I think the article could include more examples."

Output
{{
 "decision": "REJECT",
 "reason": "Constructive feedback"
}}
"""
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
            
        data = json.loads(response_text)
        
        # Map "decision" to "action"
        action = data.get("decision", "REJECT").lower()
        if action not in ["approve", "reject"]:
            action = "reject"
            
        return {
            "action": action,
            "reason": data.get("reason", "No reason provided")
        }
    except Exception as e:
        print(f"Word Filter AI Error: {e}")
        # Smart Fallback Mechanism for when API key is leaked / expired
        words_lower = words_text.lower()
        bad_words_list = ["stupid", "useless", "dirty", "hate", "abuse", "kill", "murder", "ugly", "fat", "dumb", "trash", "filth", "nasty", "violent", "attack", "racist", "sexist", "spam"]
        
        is_bad = any(bw in words_lower for bw in bad_words_list)
        
        if is_bad:
            return {
                "action": "approve",
                "reason": "Contains inappropriate or explicit content (Fallback)"
            }
        else:
            return {
                "action": "reject",
                "reason": "Constructive or normal conversation (Fallback)"
            }

def generate_caption_logic(image_file=None, context=""):
    """
    Generates caption using local Salesforce/blip-image-captioning-base model.
    """
    load_blip_model()
    
    if image_file and model and processor:
        try:
            print("Processing image locally for caption...")
            # Convert bytes to PIL Image
            raw_image = Image.open(io.BytesIO(image_file)).convert('RGB')
            
            # Prepare inputs
            inputs = processor(raw_image, return_tensors="pt")
            
            # Generate
            out = model.generate(**inputs, max_new_tokens=50)
            
            # Decode
            caption = processor.decode(out[0], skip_special_tokens=True)
            
            if caption:
                print(f"Local AI Caption Generated: {caption}")
                return caption.capitalize()
                
        except Exception as e:
             print(f"Local Caption Gen Exception: {repr(e)}")
             import traceback
             traceback.print_exc()
    elif not model:
        print("Local model not loaded, using fallback.")

    print("Using Fallback Caption Logic.")
    if context:
        cleaned = clean_text(context)
        for category, captions in CATEGORY_CAPTIONS.items():
            if category in cleaned:
                return random.choice(captions)
    
    return random.choice(GENERIC_CAPTIONS)

def extract_candidates(text):
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    stopwords = {"the", "and", "is", "of", "to", "in", "it", "with", "for", "on", "that", "this", "my", "are", "very", "can"}
    candidates = [w for w in words if w not in stopwords]
    return list(set(candidates))

def generate_hashtags_logic(text, trending_tags=None, user_interests=""):
    """
    Generates hashtags LOCALLY using weighted keyword extraction.
    Inputs: Caption (text) + User Interests.
    Output: Top 5-10 hashtags.
    """
    if not text:
        return []

    # 1. Resource Setup
    stopwords = {
        "the", "and", "is", "of", "to", "in", "it", "with", "for", "on", "that", "this", "my", "are", "very", "can",
        "was", "were", "have", "had", "has", "but", "not", "what", "all", "your", "from", "explore", "more"
    }
    
    # 2. Extract keywords from Caption
    #    Remove punctuation, lowercase
    cleaned_text = re.sub(r'[^\w\s]', '', text.lower())
    words = [w for w in cleaned_text.split() if len(w) > 2 and w not in stopwords and w not in BAD_WORDS]
    
    # Frequency Count (TF)
    scores = {}
    for w in words:
        scores[w] = scores.get(w, 0) + 1.0  # Base score: Frequency
        
    # 3. Incorporate User Interests (Boost)
    #    If an interest word appears in text, boost it.
    #    If it doesn't appear, maybe add it with low score? 
    #    "Input = caption + user interests" implies interests act as context.
    if user_interests:
        cleaned_interests = re.sub(r'[^\w\s]', ' ', user_interests.lower())
        interest_words = [w for w in cleaned_interests.split() if len(w) > 2 and w not in stopwords]
        
        for iw in interest_words:
            if iw in scores:
                scores[iw] += 2.0 # Boost existing
            else:
                scores[iw] = 1.5 # Add as suggestion even if not in text (contextual relevance)

    # 4. Trending Tags Boost
    if trending_tags:
        for tag in trending_tags:
            tag_clean = tag.lstrip('#').lower()
            if tag_clean in scores:
                scores[tag_clean] += 1.5
            elif tag_clean in text.lower():
                scores[tag_clean] = 2.0 # Trending tag matches partial text
    
    # 5. Connectify Branding
    if "connectify" not in scores:
        scores["connectify"] = 0.5
        
    # 6. Sort and Format
    #    Convert to list of (word, score)
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    
    #    Take top 10
    top_k = ranked[:10]
    
    return [f"#{item[0]}" for item in top_k]

def fetch_trending_news_logic(topic="technology", search_query=None, interests=None):
    """
    Fetches news using NewsAPI.ai (Event Registry) via POST.
    Supports: Topic Category, Keyword Search, Personal Interests.
    """
    from django.conf import settings
    import os
    API_KEY = getattr(settings, 'NEWS_API_KEY', None) or os.environ.get('NEWS_API_KEY', '')
    URL = "https://newsapi.ai/api/v1/article/getArticles"
    
    # Base Query structure (always filter for English)
    base_conditions = [{ "lang": "eng" }]
    
    def get_special_condition(term):
        """Helper to map specific keywords to advanced API URIs."""
        t = term.lower().strip()
        if t in ["ai", "ml", "artificial intelligence"]:
             return { "conceptUri": "http://en.wikipedia.org/wiki/Artificial_intelligence" }
        if t in ["crypto", "bitcoin", "ethereum", "blockchain"]:
             return { "categoryUri": "dmoz/Business/Investing/Cryptocurrencies" }
        if t == "cricket":
             return { "categoryUri": "dmoz/Sports/Cricket" }
        return { "keyword": term }

    # 1. Keyword Search
    if search_query:
        print(f"Fetching NewsAPI.ai for Query: {search_query}...")
        base_conditions.append(get_special_condition(search_query))
        
    # 2. Personalized Interests (if no specific search query)
    elif interests and isinstance(interests, list) and len(interests) > 0:
        print(f"Fetching NewsAPI.ai for Interests: {interests[:3]}...")
        # Construct OR block for interests
        interest_block = { "$or": [{ "keyword": i } for i in interests[:5]] } # Limit to top 5 interests query
        base_conditions.append(interest_block)
        
    # 3. Topic Category (Fallback or explicit topic)
    else:
        # Map friendly topics to DMOZ/Category URIs
        CATEGORY_MAP = {
            "technology": "dmoz/Computers",
            "tech": "dmoz/Computers",
            "business": "dmoz/Business",
            "science": "dmoz/Science",
            "health": "dmoz/Health",
            "entertainment": "dmoz/Arts/Entertainment", # Strict Entertainment
            "arts": "dmoz/Arts",
            "sports": "dmoz/Sports",
            "society": "dmoz/Society",
            "politics": "dmoz/Society/Politics",
            "general": "news/General",
            "world": "news/World",
            "all": None # Special flag
        }
        
        topic_key = topic.lower().strip() if topic else "technology"
        
        if topic_key in ["all", "latest", "top", "home"]:
             print("Fetching Top News (No Category Filter)...")
             # No specific category filter = Top News across all categories
             # Just keep language filter
        elif topic_key in CATEGORY_MAP:
            category_uri = CATEGORY_MAP[topic_key]
            if category_uri:
                print(f"Fetching NewsAPI.ai for Topic: {topic} ({category_uri})...")
                base_conditions.append({ "categoryUri": category_uri })
            else:
                 # Fallback for mapped valid keys with None URI
                 pass
        else:
            # Topic is unknown (e.g. "AI", "Crypto"), check special mappings
            print(f"Topic '{topic}' not in map. Checking special mappings...")
            base_conditions.append(get_special_condition(topic))

    # Construct Final Payload
    payload = {
        "apiKey": API_KEY,
        "resultType": "articles",
        "articlesSortBy": "date",
        "articlesCount": 20,
        "query": {
            "$query": {
                "$and": base_conditions
            }
        }
    }
    
    try:
        response = requests.post(URL, json=payload, headers={'Content-Type': 'application/json'})
        
        if response.status_code == 200:
            data = response.json()
            articles_data = data.get('articles', {}).get('results', [])
            
            return [
                {
                    "title": a.get("title", "No Title"),
                    "description": (a.get("body", "") or "")[:200] + "...", 
                    "url": a.get("url", "#"),
                    "source": a.get("source", {}).get("title", "NewsAPI.ai"),
                    "image": a.get("image", None)
                }
                for a in articles_data
            ]
        else:
            print(f"NewsAPI.ai Error {response.status_code}: {response.text}")
            return []
            
    except Exception as e:
        print(f"News API Exception: {e}")
        return []
