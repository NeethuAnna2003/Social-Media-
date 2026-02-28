/**
 * News Summarizer Utility
 * 
 * This utility provides functions to summarize news articles in a structured JSON format
 * for quick consumption by busy professionals.
 */

/**
 * Summarizes a news article into a structured JSON format
 * @param {string} articleText - The full text of the news article
 * @returns {Object} Structured summary of the article
 */
const summarizeArticle = (articleText) => {
    if (!articleText || typeof articleText !== 'string') {
        throw new Error('Invalid article text provided');
    }

    return {
        headline_in_one_line: generateHeadline(articleText),
        tldr: generateTLDR(articleText),
        quick_take: generateQuickTakes(articleText),
        why_it_matters: generateWhyItMatters(articleText),
        what_to_watch_next: generateWhatToWatchNext(articleText),
        time_to_read_original: estimateReadTime(articleText),
        summary_read_time: '30 sec',
        time_saved: estimateTimeSaved(articleText, 30),
        tone_check: analyzeTone(articleText),
        smart_context: generateSmartContext(articleText),
        one_question_to_think_about: generateThoughtQuestion(articleText),
        discussion: buildDiscussion(articleText),
        summary: generateConciseSummary(articleText)
    };
};

// Helper functions for each section of the summary
const generateHeadline = (text) => {
    const sentences = splitIntoSentences(text);
    if (sentences.length === 0) return 'News update';
    const scores = scoreSentences(sentences, text);
    const top = sentences[scores[0].index] || sentences[0];
    return compressSentence(top, 12);
};

const generateQuickTakes = (text) => {
    const sentences = splitIntoSentences(text);
    if (sentences.length === 0) return ['No details available', 'Key drivers: n/a', 'What to watch: updates'];
    const scored = scoreSentences(sentences, text);

    const what = selectByPattern(sentences, /\b(announced|reported|launched|approved|banned|filed|opened|struck|killed|died|won|unveiled|released)\b/i) || sentences[scored[0].index];
    const why = selectByPattern(sentences, /\b(because|due to|amid|after|as|following|over)\b/i) || sentences[scored[1]?.index] || sentences[0];
    const next = selectByPattern(sentences, /\b(will|plans?|expected|could|may|aims?|set to|next|coming|ahead)\b/i) || sentences[scored[2]?.index] || sentences[0];

    const picks = dedupe([
        compressSentence(what, 22),
        compressSentence(why, 22),
        compressSentence(next, 22)
    ]);

    if (picks.length < 3) {
        const kws = extractTopKeywords(text, 6);
        if (picks.length < 2) {
            const drivers = kws.slice(0, 3).join(', ');
            if (drivers) picks.push(`Key drivers: ${drivers}`);
        }
        if (picks.length < 3) {
            const watch = kws.slice(0, 2).join(', ');
            picks.push(watch ? `What to watch: ${watch}` : 'What to watch: updates');
        }
    }

    return picks.slice(0, 3);
};

const generateTLDR = (text) => {
    const sentences = splitIntoSentences(text);
    if (sentences.length === 0) return ['No summary available'];
    const scored = scoreSentences(sentences, text).slice(0, 3);
    const picked = scored
        .sort((a, b) => a.index - b.index)
        .map(s => compressSentence(sentences[s.index], 18));
    return picked.slice(0, Math.max(2, Math.min(3, picked.length)));
};

const generateWhyItMatters = (text) => {
    const kws = extractTopKeywords(text, 3);
    if (kws.length >= 2) return `Relevant for ${kws[0]} and ${kws[1]}. Key facts in brief.`;
    if (kws.length === 1) return `Relevant for ${kws[0]}. Key facts in brief.`;
    return 'Key facts in brief with likely next steps.';
};

const generateWhatToWatchNext = (text) => {
    const sentences = splitIntoSentences(text);
    const next = selectByPattern(sentences, /\b(will|plans?|expected|could|may|aims?|set to|next|coming|ahead)\b/i);
    if (next) return compressSentence(next, 18);
    const q = generateThoughtQuestion(text);
    return q.replace(/^["']|["']$/g, '');
};

const estimateReadTime = (text) => {
    // Average reading speed: ~200 words per minute
    const wordCount = text.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / 200);
    return `${minutes} min read`;
};

const estimateTimeSaved = (text, summarySeconds = 30) => {
    const words = (String(text || '').trim().match(/\S+/g) || []).length;
    const minutes = words / 200;
    const savedFloat = minutes - summarySeconds / 60;
    const saved = Math.max(1, Math.ceil(savedFloat));
    return `~${saved} min`;
};

const analyzeTone = (text) => {
    const tokens = tokenize(text);
    const posWords = ['success','gain','growth','improve','record','surge','beat','strong','rise'];
    const negWords = ['fail','decline','drop','crisis','scandal','loss','risk','warn','allege','fall'];
    const sensWords = ['shocking','explosive','outrage','furious','massive','huge','unprecedented','disaster','miracle'];
    const directive = ['should','must','need','pledged','urge','demand'];

    let pos = 0, neg = 0, sens = 0, dir = 0;
    for (const t of tokens) {
        if (posWords.includes(t)) pos++;
        if (negWords.includes(t)) neg++;
        if (sensWords.includes(t)) sens++;
        if (directive.includes(t)) dir++;
    }
    const excl = (text.match(/!/g) || []).length;
    const amp = (pos - neg) / Math.max(1, tokens.length);
    const bias_level = (sens + excl > 3) ? 'strong' : (Math.abs(amp) > 0.02 || dir > 2) ? 'slight' : 'neutral';
    const tone = (sens + excl > 3 || Math.abs(amp) > 0.05) ? 'emotional' : (dir > 3) ? 'persuasive' : 'informative';
    return { bias_level, tone };
};

const generateSmartContext = (text) => {
    const kws = extractTopKeywords(text, 2);
    if (kws.length >= 2) return `Part of ongoing ${kws[0]} and ${kws[1]} developments.`;
    if (kws.length === 1) return `Part of ongoing ${kws[0]} developments.`;
    return 'Part of ongoing developments.';
};

const generateThoughtQuestion = (text) => {
    const kws = extractTopKeywords(text, 1);
    if (kws.length) return `What should readers watch next in ${kws[0]}?`;
    return 'What should readers watch next?';
};

const buildDiscussion = (text) => {
    const title = generateHeadline(text);
    const starter_question = generateThoughtQuestion(text);
    const tags = extractTopKeywords(text, 3);
    const tone = analyzeTone(text);
    const guidelines = [
        'Be respectful; discuss ideas, not people.',
        'Cite sources or evidence when possible.',
        'Stay on-topic and avoid misinformation.'
    ];
    return { title, starter_question, tags, tone, guidelines };
};

const splitIntoSentences = (text) => {
    const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
    const parts = cleaned.match(/[^.!?\n]+[.!?]?/g) || [];
    return parts.map(s => s.trim()).filter(Boolean);
};

const tokenize = (text) => {
    return (String(text || '').toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) || []).filter(Boolean);
};

const STOPWORDS = new Set([
    'the','a','an','and','or','but','if','then','so','because','as','of','in','on','for','to','from','by','with','about','into','over','after','before','between','is','are','was','were','be','been','being','it','its','that','this','these','those','at','we','you','they','he','she','him','her','their','our','us','can','could','may','might','will','would','should','must','not','no','yes','do','does','did','than','than','also','more','most','less','least','very'
]);

const extractTopKeywords = (text, topN = 5) => {
    const tokens = tokenize(text).filter(t => !STOPWORDS.has(t) && t.length > 2);
    const freq = new Map();
    for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
    return [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, Math.max(0, topN))
        .map(([t]) => t);
};

const scoreSentences = (sentences, text) => {
    const tokens = tokenize(text).filter(t => !STOPWORDS.has(t));
    const freq = new Map();
    let maxf = 1;
    for (const t of tokens) {
        const v = (freq.get(t) || 0) + 1;
        freq.set(t, v);
        if (v > maxf) maxf = v;
    }
    const norm = new Map();
    for (const [k, v] of freq.entries()) norm.set(k, v / maxf);
    const scored = sentences.map((s, i) => {
        const ts = tokenize(s).filter(t => !STOPWORDS.has(t));
        let score = 0;
        for (const t of ts) score += (norm.get(t) || 0);
        if (/\d/.test(s)) score += 0.2;
        return { index: i, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored;
};

const selectByPattern = (sentences, regex) => {
    for (const s of sentences) {
        if (regex.test(s) && tokenize(s).length >= 5) return s;
    }
    return null;
};

const compressSentence = (s, maxWords) => {
    const words = (s || '').replace(/[\"\“\”\’\‘]/g, '').trim().split(/\s+/);
    const cut = words.slice(0, Math.max(1, maxWords)).join(' ');
    return cut.replace(/[\s.!,;:]+$/,'');
};

const dedupe = (arr) => {
    const out = [];
    const seen = new Set();
    for (const v of arr) {
        if (!v) continue;
        const key = v.toLowerCase();
        if (!seen.has(key)) { seen.add(key); out.push(v); }
    }
    return out;
};

const generateConciseSummary = (text) => {
    const sentences = splitIntoSentences(text);
    if (sentences.length === 0) return 'No summary available.';
    const scored = scoreSentences(sentences, text).slice(0, 3);
    const indices = scored.map(s => s.index).sort((a,b) => a - b);
    const picked = indices.map(i => compressSentence(sentences[i], 22));
    const joined = picked.join('. ').replace(/[\s.]+$/, '');
    return joined.endsWith('.') ? joined : joined + '.';
};

export {
    summarizeArticle
};
