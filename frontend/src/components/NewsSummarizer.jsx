import React, { useState, useEffect } from 'react';
import {
    SparklesIcon,
    DocumentTextIcon,
    ListBulletIcon,
    FaceSmileIcon,
    FaceFrownIcon,
    MinusCircleIcon
} from '@heroicons/react/24/outline';

/**
 * AI News Summarizer Component
 * Generates intelligent summaries with key facts and sentiment analysis
 * 
 * Features:
 * - 2-line quick summary
 * - Bullet point key facts
 * - Sentiment analysis (positive/neutral/negative)
 * - Hallucination prevention (only uses article text)
 * - Caching for performance
 */
const NewsSummarizer = ({ article }) => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [fadeIn, setFadeIn] = useState(false);

    useEffect(() => {
        generateSummary();
    }, [article.url]);

    // Generate AI summary
    const generateSummary = async (forceRegenerate = false) => {
        // Check cache first (unless forcing regeneration)
        const cacheKey = `summary_${article.url}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached && !forceRegenerate) {
            try {
                setSummary(JSON.parse(cached));
                setFadeIn(true);
                return;
            } catch (e) {
                // Invalid cache, continue to generate
            }
        }

        setLoading(true);
        setError(null);
        setFadeIn(false);

        try {
            // Use client-side summarization to prevent hallucination
            const result = await summarizeArticle(article);

            // Smooth transition
            setSummary(result);
            setTimeout(() => setFadeIn(true), 50);

            // Cache the result
            localStorage.setItem(cacheKey, JSON.stringify(result));
        } catch (err) {
            console.error('Summarization error:', err);
            setError('Failed to generate summary');
        } finally {
            setLoading(false);
            setIsRegenerating(false);
        }
    };

    // Client-side summarization (no hallucination)
    const summarizeArticle = async (article) => {
        const text = `${article.title}. ${article.description || ''}. ${article.content || ''}`;

        // Extract sentences
        const sentences = text
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 20);

        // Generate quick summary (7-8 sentences for comprehensive detail)
        const quickSummary = extractTopSentences(sentences, 8).join('. ') + '.';

        // Extract key facts (bullet points)
        const keyFacts = extractKeyFacts(text, sentences);

        // Analyze sentiment
        const sentiment = analyzeSentiment(text);

        // Extract entities (people, places, organizations)
        const entities = extractEntities(text);

        return {
            quickSummary,
            keyFacts,
            sentiment,
            entities,
            wordCount: text.split(' ').length,
            readingTime: Math.ceil(text.split(' ').length / 200) // 200 words per minute
        };
    };

    // Extract most important sentences (with randomization for variety)
    const extractTopSentences = (sentences, count) => {
        // Score sentences based on:
        // 1. Position (first sentences are often important)
        // 2. Length (not too short, not too long)
        // 3. Keywords (contains important words)
        // 4. Random variation for different results each time

        const importantWords = [
            'announce', 'reveal', 'discover', 'launch', 'release', 'report',
            'confirm', 'deny', 'claim', 'state', 'say', 'according',
            'new', 'first', 'major', 'significant', 'important'
        ];

        const scored = sentences.map((sentence, index) => {
            let score = 0;

            // Position score (earlier = more important)
            score += (sentences.length - index) * 2;

            // Length score (prefer 10-30 words)
            const wordCount = sentence.split(' ').length;
            if (wordCount >= 10 && wordCount <= 30) {
                score += 5;
            }

            // Keyword score
            const lowerSentence = sentence.toLowerCase();
            importantWords.forEach(word => {
                if (lowerSentence.includes(word)) {
                    score += 3;
                }
            });

            // ADD RANDOMIZATION: Random boost to create variety
            score += Math.random() * 10;

            return { sentence, score };
        });

        // Sort by score and take top N (with random variation)
        const topSentences = scored
            .sort((a, b) => b.score - a.score)
            .slice(0, count + 8); // Get extra sentences for excellent variety (16 total for 8 selection)

        // Randomly select from top sentences for variety
        const selected = [];
        const available = [...topSentences];

        for (let i = 0; i < count && available.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * Math.min(available.length, 3));
            selected.push(available[randomIndex].sentence);
            available.splice(randomIndex, 1);
        }

        return selected;
    };

    // Extract key facts as bullet points (with randomization)
    const extractKeyFacts = (text, sentences) => {
        const facts = [];

        // Look for sentences with numbers, dates, or specific facts
        const factPatterns = [
            /\d+%/,  // Percentages
            /\$\d+/,  // Money
            /\d{4}/,  // Years
            /\d+ (people|users|customers|employees)/i,  // Quantities
            /(announced|revealed|confirmed|reported)/i  // Announcements
        ];

        sentences.forEach(sentence => {
            // Check if sentence contains factual patterns
            const hasFact = factPatterns.some(pattern => pattern.test(sentence));

            if (hasFact) {
                // Clean up the sentence
                const cleaned = sentence
                    .replace(/^(and|but|however|moreover|furthermore)/i, '')
                    .trim();

                if (cleaned.length > 20 && cleaned.length < 150) {
                    facts.push(cleaned);
                }
            }
        });

        // If no facts found, use top sentences
        if (facts.length === 0) {
            return extractTopSentences(sentences, 3);
        }

        // RANDOMIZATION: Shuffle facts and take random subset
        const shuffled = facts.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(5, shuffled.length));
    };

    // Analyze sentiment
    const analyzeSentiment = (text) => {
        const lowerText = text.toLowerCase();

        // Positive words
        const positiveWords = [
            'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
            'success', 'win', 'achieve', 'breakthrough', 'improve', 'growth',
            'positive', 'benefit', 'advantage', 'gain', 'profit', 'rise',
            'increase', 'boost', 'surge', 'soar', 'record', 'best'
        ];

        // Negative words
        const negativeWords = [
            'bad', 'terrible', 'awful', 'horrible', 'worst', 'fail',
            'loss', 'decline', 'drop', 'fall', 'crash', 'crisis',
            'negative', 'problem', 'issue', 'concern', 'risk', 'threat',
            'danger', 'warning', 'alert', 'emergency', 'disaster', 'tragedy'
        ];

        // Count occurrences
        let positiveCount = 0;
        let negativeCount = 0;

        positiveWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            const matches = lowerText.match(regex);
            if (matches) positiveCount += matches.length;
        });

        negativeWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            const matches = lowerText.match(regex);
            if (matches) negativeCount += matches.length;
        });

        // Determine sentiment
        const diff = positiveCount - negativeCount;

        if (diff > 2) {
            return {
                type: 'positive',
                score: Math.min(positiveCount / (positiveCount + negativeCount + 1), 1),
                label: 'Positive',
                icon: '😊',
                color: 'text-green-600',
                bgColor: 'bg-green-50',
                borderColor: 'border-green-200'
            };
        } else if (diff < -2) {
            return {
                type: 'negative',
                score: Math.min(negativeCount / (positiveCount + negativeCount + 1), 1),
                label: 'Negative',
                icon: '😟',
                color: 'text-red-600',
                bgColor: 'bg-red-50',
                borderColor: 'border-red-200'
            };
        } else {
            return {
                type: 'neutral',
                score: 0.5,
                label: 'Neutral',
                icon: '😐',
                color: 'text-gray-600',
                bgColor: 'bg-gray-50',
                borderColor: 'border-gray-200'
            };
        }
    };

    // Extract named entities (simple version with randomization)
    const extractEntities = (text) => {
        const entities = {
            people: [],
            organizations: [],
            locations: []
        };

        // Simple capitalized word detection
        // In production, use a proper NER library
        const words = text.split(/\s+/);
        const capitalizedWords = words.filter(word =>
            /^[A-Z][a-z]+$/.test(word) && word.length > 3
        );

        // Take unique capitalized words as potential entities
        const unique = [...new Set(capitalizedWords)];

        // RANDOMIZATION: Shuffle and select random subset
        const shuffled = unique.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(5, shuffled.length));
    };

    if (loading) {
        return (
            <div className="ai-summarizer bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100 shadow-lg">
                <div className="flex items-center gap-3">
                    <SparklesIcon className="w-6 h-6 text-purple-600 animate-spin" />
                    <p className="text-sm font-bold text-gray-700">Generating AI summary...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="ai-summarizer bg-red-50 rounded-2xl p-6 border border-red-200">
                <p className="text-sm font-bold text-red-600">{error}</p>
            </div>
        );
    }

    if (!summary) return null;

    return (
        <div className={`ai-summarizer bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100 shadow-lg space-y-6 transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-xl">
                        <SparklesIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900">AI Summary</h3>
                        <p className="text-xs text-gray-500">
                            {summary.wordCount} words • {summary.readingTime} min read
                        </p>
                    </div>
                </div>

                {/* Sentiment Badge */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${summary.sentiment.bgColor} border ${summary.sentiment.borderColor}`}>
                    <span className="text-2xl">{summary.sentiment.icon}</span>
                    <span className={`text-sm font-black ${summary.sentiment.color}`}>
                        {summary.sentiment.label}
                    </span>
                </div>
            </div>

            {/* Quick Summary */}
            <div className="bg-white rounded-xl p-4 border border-purple-100">
                <div className="flex items-start gap-3">
                    <DocumentTextIcon className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-black text-gray-900 mb-2">Quick Summary</h4>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            {summary.quickSummary}
                        </p>
                    </div>
                </div>
            </div>

            {/* Key Facts */}
            <div className="bg-white rounded-xl p-4 border border-purple-100">
                <div className="flex items-start gap-3">
                    <ListBulletIcon className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="text-sm font-black text-gray-900 mb-3">Key Facts</h4>
                        <ul className="space-y-2">
                            {summary.keyFacts.map((fact, index) => (
                                <li key={index} className="flex items-start gap-2">
                                    <span className="text-purple-600 font-black">•</span>
                                    <span className="text-sm text-gray-700 leading-relaxed">{fact}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Entities (if any) */}
            {summary.entities && summary.entities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-bold text-gray-500">Mentioned:</span>
                    {summary.entities.map((entity, index) => (
                        <span
                            key={index}
                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold"
                        >
                            {entity}
                        </span>
                    ))}
                </div>
            )}

            {/* Regenerate Button */}
            <button
                onClick={() => {
                    setIsRegenerating(true);
                    setFadeIn(false);
                    localStorage.removeItem(`summary_${article.url}`);
                    setTimeout(() => generateSummary(true), 300);
                }}
                disabled={isRegenerating || loading}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                <SparklesIcon className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? 'Regenerating...' : 'Regenerate Summary'}
            </button>
        </div>
    );
};

export default NewsSummarizer;
