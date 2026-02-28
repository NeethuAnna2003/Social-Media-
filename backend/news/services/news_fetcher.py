"""
News Fetcher Service - NewsAPI Integration
Handles fetching, normalization, caching, and rate limiting
"""

import requests
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
import hashlib
import logging

logger = logging.getLogger(__name__)

class NewsAPIFetcher:
    """
    Service for fetching news from NewsAPI.org
    Features:
    - Automatic caching (15 min TTL)
    - Rate limit protection (100 requests/day)
    - Response normalization
    - Pagination support
    - Error handling with fallbacks
    """
    
    BASE_URL = "https://newsapi.org/v2"
    CACHE_DURATION = 900  # 15 minutes in seconds
    RATE_LIMIT_KEY = "newsapi_rate_limit"
    MAX_REQUESTS_PER_DAY = 100
    
    def __init__(self):
        self.api_key = getattr(settings, 'NEWS_API_KEY', 'demo')
        self.session = requests.Session()
        self.session.headers.update({
            'X-Api-Key': self.api_key,
            'User-Agent': 'ConnectifyAI/1.0'
        })
    
    def _check_rate_limit(self):
        """Check if we've exceeded daily rate limit"""
        count = cache.get(self.RATE_LIMIT_KEY, 0)
        if count >= self.MAX_REQUESTS_PER_DAY:
            logger.warning(f"Rate limit exceeded: {count}/{self.MAX_REQUESTS_PER_DAY}")
            raise Exception("Daily API rate limit exceeded. Please try again tomorrow.")
        return count
    
    def _increment_rate_limit(self):
        """Increment rate limit counter with 24-hour expiry"""
        count = cache.get(self.RATE_LIMIT_KEY, 0)
        cache.set(self.RATE_LIMIT_KEY, count + 1, 86400)  # 24 hours
        logger.info(f"API requests today: {count + 1}/{self.MAX_REQUESTS_PER_DAY}")
    
    def _get_cache_key(self, endpoint, params):
        """Generate unique cache key from endpoint and parameters"""
        param_str = ''.join(f"{k}={v}" for k, v in sorted(params.items()))
        hash_str = hashlib.md5(param_str.encode()).hexdigest()
        return f"newsapi_{endpoint}_{hash_str}"
    
    def fetch_top_headlines(self, category=None, country='us', page=1, page_size=20):
        """
        Fetch top headlines from NewsAPI
        
        Args:
            category (str): business, entertainment, general, health, science, sports, technology
            country (str): 2-letter ISO country code (us, gb, in, etc.)
            page (int): Page number for pagination
            page_size (int): Number of articles per page (max 100)
        
        Returns:
            dict: {
                'articles': [...],
                'totalResults': int,
                'status': 'ok'
            }
        
        Raises:
            Exception: If API request fails or rate limit exceeded
        """
        params = {
            'country': country,
            'page': page,
            'pageSize': min(page_size, 100)  # NewsAPI max is 100
        }
        
        if category:
            params['category'] = category
        
        # Check cache first
        cache_key = self._get_cache_key('top-headlines', params)
        cached_data = cache.get(cache_key)
        if cached_data:
            logger.info(f"Cache hit for {cache_key}")
            return cached_data
        
        # Check rate limit before making request
        self._check_rate_limit()
        
        try:
            logger.info(f"Fetching top headlines: {params}")
            response = self.session.get(
                f"{self.BASE_URL}/top-headlines",
                params=params,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') != 'ok':
                error_msg = data.get('message', 'Unknown error')
                logger.error(f"NewsAPI error: {error_msg}")
                raise Exception(f"NewsAPI error: {error_msg}")
            
            # Normalize response
            normalized_data = self._normalize_response(data)
            
            # Cache the result
            cache.set(cache_key, normalized_data, self.CACHE_DURATION)
            logger.info(f"Cached {len(normalized_data['articles'])} articles")
            
            # Increment rate limit counter
            self._increment_rate_limit()
            
            return normalized_data
            
        except requests.RequestException as e:
            logger.error(f"NewsAPI request failed: {e}")
            raise Exception(f"Failed to fetch news: {str(e)}")
    
    def search_news(self, query, from_date=None, to_date=None, language='en', 
                    sort_by='publishedAt', page=1, page_size=20):
        """
        Search for news articles
        
        Args:
            query (str): Search keywords or phrases
            from_date (datetime): Start date for articles
            to_date (datetime): End date for articles
            language (str): 2-letter ISO language code
            sort_by (str): relevancy, popularity, or publishedAt
            page (int): Page number
            page_size (int): Articles per page
        
        Returns:
            dict: Normalized news data
        """
        params = {
            'q': query,
            'language': language,
            'sortBy': sort_by,
            'page': page,
            'pageSize': min(page_size, 100)
        }
        
        if from_date:
            params['from'] = from_date.isoformat()
        if to_date:
            params['to'] = to_date.isoformat()
        
        # Check cache
        cache_key = self._get_cache_key('everything', params)
        cached_data = cache.get(cache_key)
        if cached_data:
            logger.info(f"Cache hit for search: {query}")
            return cached_data
        
        # Check rate limit
        self._check_rate_limit()
        
        try:
            logger.info(f"Searching news: {query}")
            response = self.session.get(
                f"{self.BASE_URL}/everything",
                params=params,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') != 'ok':
                raise Exception(f"NewsAPI error: {data.get('message')}")
            
            normalized_data = self._normalize_response(data)
            cache.set(cache_key, normalized_data, self.CACHE_DURATION)
            self._increment_rate_limit()
            
            return normalized_data
            
        except requests.RequestException as e:
            logger.error(f"NewsAPI search failed: {e}")
            raise Exception(f"Search failed: {str(e)}")
    
    def _normalize_response(self, data):
        """
        Normalize NewsAPI response to standard format
        
        Converts NewsAPI format to our internal format:
        - Filters out removed articles
        - Standardizes field names
        - Adds fallback values for missing fields
        
        Returns:
            dict: {
                'articles': [
                    {
                        'title': str,
                        'description': str,
                        'content': str,
                        'imageUrl': str,
                        'source': {'id': str, 'name': str},
                        'publishedAt': str (ISO format),
                        'url': str,
                        'author': str
                    },
                    ...
                ],
                'totalResults': int,
                'status': 'ok'
            }
        """
        articles = []
        
        for article in data.get('articles', []):
            # Skip removed articles
            if article.get('title') == '[Removed]':
                continue
            
            # Normalize to our schema
            normalized = {
                'title': article.get('title', 'Untitled'),
                'description': article.get('description', ''),
                'content': article.get('content', ''),
                'imageUrl': article.get('urlToImage'),
                'source': {
                    'id': article.get('source', {}).get('id'),
                    'name': article.get('source', {}).get('name', 'Unknown Source')
                },
                'publishedAt': article.get('publishedAt'),
                'url': article.get('url'),
                'author': article.get('author')
            }
            
            articles.append(normalized)
        
        return {
            'articles': articles,
            'totalResults': data.get('totalResults', 0),
            'status': 'ok'
        }
    
    def get_sources(self, category=None, language='en', country=None):
        """
        Get available news sources
        
        Args:
            category (str): Filter by category
            language (str): Filter by language
            country (str): Filter by country
        
        Returns:
            list: Available news sources
        """
        params = {}
        if category:
            params['category'] = category
        if language:
            params['language'] = language
        if country:
            params['country'] = country
        
        cache_key = self._get_cache_key('sources', params)
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data
        
        try:
            response = self.session.get(
                f"{self.BASE_URL}/sources",
                params=params,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            sources = data.get('sources', [])
            cache.set(cache_key, sources, 3600)  # Cache for 1 hour
            
            return sources
            
        except requests.RequestException as e:
            logger.error(f"Failed to fetch sources: {e}")
            return []
