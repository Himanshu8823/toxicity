const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Hugging Face API configuration
const HF_API_URL = "https://router.huggingface.co/hf-inference/models/cointegrated/rubert-tiny-toxicity";
const HF_TOKEN = process.env.HF_TOKEN;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const CANONICAL_LABELS = ['non_toxic', 'insult', 'obscenity', 'threat', 'dangerous'];
const HARMFUL_LABELS = new Set(['insult', 'obscenity', 'threat', 'dangerous']);

function normalizeLabel(label) {
  const key = String(label || '').toLowerCase().replace(/[\s-]+/g, '_');

  if (key === 'non_toxic' || key === 'not_toxic' || key === 'normal' || key === 'neutral') {
    return 'non_toxic';
  }
  if (key === 'insult') return 'insult';
  if (key === 'obscene' || key === 'obscenity') return 'obscenity';
  if (key === 'threat') return 'threat';
  if (key === 'dangerous') return 'dangerous';

  // Map legacy toxicity outputs into the 5-state scheme.
  if (key === 'toxic' || key === 'severe_toxic' || key === 'identity_hate') {
    return 'dangerous';
  }

  return 'dangerous';
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Utility: extract YouTube video ID ───────────────────────────────────────
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ─── Utility: fetch YouTube comments via Data API v3 ─────────────────────────
async function fetchYouTubeComments(videoId, maxComments = 100) {
  const comments = [];
  let pageToken = '';
  const maxPages = Math.ceil(maxComments / 100);
  let pages = 0;

  while (pages < maxPages) {
    const url = new URL('https://www.googleapis.com/youtube/v3/commentThreads');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('videoId', videoId);
    url.searchParams.set('maxResults', '100');
    url.searchParams.set('textFormat', 'plainText');
    url.searchParams.set('key', YOUTUBE_API_KEY);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error?.message || 'Failed to fetch YouTube comments');
    }

    const data = await res.json();
    for (const item of data.items || []) {
      const text = item.snippet?.topLevelComment?.snippet?.textDisplay;
      if (text) comments.push(text);
      if (comments.length >= maxComments) break;
    }

    pageToken = data.nextPageToken || '';
    pages++;
    if (!pageToken || comments.length >= maxComments) break;
  }

  return comments.slice(0, maxComments);
}

// ─── Utility: call Hugging Face toxicity model ───────────────────────────────
async function analyzeWithHF(text) {
  const response = await fetch(HF_API_URL, {
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({ inputs: text }),
  });
  const result = await response.json();
  return result;
}

// ─── Utility: process HF result into structured format ───────────────────────
function processHFResult(text, rawResult) {
  if (!rawResult || rawResult.error || !Array.isArray(rawResult[0])) {
    return { text, error: rawResult?.error || 'Invalid model response' };
  }

  const mergedScores = CANONICAL_LABELS.reduce((acc, label) => {
    acc[label] = 0;
    return acc;
  }, {});

  for (const item of rawResult[0]) {
    const normalized = normalizeLabel(item.label);
    mergedScores[normalized] += Number(item.score) || 0;
  }

  const predictions = CANONICAL_LABELS.map((label) => ({
    label,
    score: mergedScores[label],
    percentage: `${(mergedScores[label] * 100).toFixed(2)}%`,
  }));

  const sorted = [...predictions].sort((a, b) => b.score - a.score);

  return {
    text,
    predictions,
    mostLikelyCategory: sorted[0].label,
    confidence: sorted[0].score,
  };
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'Server is running ✅',
    endpoints: {
      analyzeVideo: 'POST /analyze-video',
      analyzeToxicity: 'POST /analyze-toxicity',
      analyzeBatch: 'POST /analyze-toxicity-batch',
    },
  });
});

// ─── Main endpoint: analyze YouTube video comments ───────────────────────────
app.post('/analyze-video', async (req, res) => {
  try {
    const { url, maxComments = 50 } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid YouTube URL' });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Could not extract video ID from URL. Please provide a valid YouTube URL.' });
    }

    if (!YOUTUBE_API_KEY) {
      return res.status(500).json({ error: 'YouTube API key is not configured on the server.' });
    }

    console.log(`Fetching comments for video: ${videoId}`);

    // Fetch video metadata
    const metaUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    metaUrl.searchParams.set('part', 'snippet,statistics');
    metaUrl.searchParams.set('id', videoId);
    metaUrl.searchParams.set('key', YOUTUBE_API_KEY);
    const metaRes = await fetch(metaUrl.toString());
    const metaData = await metaRes.json();

    const videoInfo = metaData.items?.[0];
    const videoTitle = videoInfo?.snippet?.title || 'Unknown Video';
    const thumbnail = videoInfo?.snippet?.thumbnails?.medium?.url || '';
    const channelName = videoInfo?.snippet?.channelTitle || '';
    const viewCount = videoInfo?.statistics?.viewCount || '0';
    const commentCount = videoInfo?.statistics?.commentCount || '0';

    // Fetch comments
    const comments = await fetchYouTubeComments(videoId, Math.min(maxComments, 200));
    console.log(`Fetched ${comments.length} comments, analyzing...`);

    if (comments.length === 0) {
      return res.status(404).json({ error: 'No comments found for this video (comments may be disabled).' });
    }

    // Analyze toxicity in batches to avoid rate limiting
    const BATCH_SIZE = 10;
    const results = [];

    for (let i = 0; i < comments.length; i += BATCH_SIZE) {
      const batch = comments.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (text) => {
          try {
            const raw = await analyzeWithHF(text);
            return processHFResult(text, raw);
          } catch (e) {
            return { text, error: e.message };
          }
        })
      );
      results.push(...batchResults);
      // Small delay between batches
      if (i + BATCH_SIZE < comments.length) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    // ─── Aggregate stats ─────────────────────────────────────────────────────
    const valid = results.filter((r) => !r.error);
    
    // Normalize all results FIRST - ensure consistent labels throughout
    const normalizedValid = valid.map((r) => ({
      ...r,
      mostLikelyCategory: normalizeLabel(r.mostLikelyCategory),
    }));

    const labelCounts = {};
    const labelScores = {};

    for (const r of normalizedValid) {
      const label = r.mostLikelyCategory;
      labelCounts[label] = (labelCounts[label] || 0) + 1;
      labelScores[label] = (labelScores[label] || 0) + r.confidence;
    }

    const labelStats = Object.entries(labelCounts).map(([label, count]) => ({
      label,
      count,
      percentage: ((count / normalizedValid.length) * 100).toFixed(1),
      avgConfidence: ((labelScores[label] / count) * 100).toFixed(1),
    }));

    // Categorize toxic vs non-toxic using normalized labels
    const toxicResults = normalizedValid.filter((r) => HARMFUL_LABELS.has(r.mostLikelyCategory));
    const nonToxicResults = normalizedValid.filter((r) => r.mostLikelyCategory === 'non_toxic');

    // Top 10 most toxic comments - strictly filter for harmful only
    const mostToxic = normalizedValid
      .filter((r) => HARMFUL_LABELS.has(r.mostLikelyCategory))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);

    // Overall toxicity score
    const overallToxicityScore = (toxicResults.length / normalizedValid.length) * 100;

    const avgConfidence =
      normalizedValid.reduce((sum, r) => sum + r.confidence, 0) / normalizedValid.length;

    res.json({
      videoInfo: {
        id: videoId,
        title: videoTitle,
        thumbnail,
        channelName,
        viewCount: parseInt(viewCount).toLocaleString(),
        commentCount: parseInt(commentCount).toLocaleString(),
      },
      analysis: {
        totalAnalyzed: valid.length,
        errored: results.length - valid.length,
        overallToxicityScore: overallToxicityScore.toFixed(1),
        avgConfidence: (avgConfidence * 100).toFixed(1),
        toxicCount: toxicResults.length,
        nonToxicCount: nonToxicResults.length,
        labelStats,
        mostToxicComments: mostToxic,
        allResults: results,
      },
    });
  } catch (error) {
    console.error('Error analyzing video:', error);
    res.status(500).json({ error: 'Failed to analyze video', details: error.message });
  }
});

// ─── Single text toxicity endpoint ───────────────────────────────────────────
app.post('/analyze-toxicity', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide a valid non-empty text string' });
    }
    const raw = await analyzeWithHF(text);
    if (raw.error) return res.status(500).json({ error: 'Model error', details: raw.error });
    res.json(processHFResult(text, raw));
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze text', details: error.message });
  }
});

// ─── Batch text toxicity endpoint ─────────────────────────────────────────────
app.post('/analyze-toxicity-batch', async (req, res) => {
  try {
    const { texts } = req.body;
    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: 'Please provide a non-empty array of texts' });
    }
    const results = await Promise.all(
      texts.map(async (text) => {
        try {
          const raw = await analyzeWithHF(text);
          return processHFResult(text, raw);
        } catch (e) {
          return { text, error: e.message };
        }
      })
    );
    res.json({ totalTexts: texts.length, results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze texts', details: error.message });
  }
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Toxicity detection server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
});
