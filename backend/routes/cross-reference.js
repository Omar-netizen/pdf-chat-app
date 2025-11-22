// backend/routes/cross-reference.js
const express = require("express");
const router = express.Router();
const { initPinecone } = require("../pinecone");
const { protect } = require("../middleware/auth");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to generate embeddings
async function generateEmbedding(text) {
  const result = await genAI.getGenerativeModel({ model: "text-embedding-004" })
    .embedContent({
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_QUERY",
    });
  return result.embedding.values;
}

// POST /api/cross-reference - Find all mentions across documents
router.post("/", protect, async (req, res) => {
  try {
    const { keyword, source_filters } = req.body;
    
    if (!keyword) {
      return res.status(400).json({ error: "Keyword required" });
    }

    console.log(`🔍 Cross-referencing "${keyword}" for user ${req.user.email}`);

    const index = await initPinecone();
    
    // Generate embedding for the keyword
    const keywordEmbedding = await generateEmbedding(keyword);

    // Build filter
    const searchFilter = {
      user_id: req.user.id
    };
    
    if (source_filters && source_filters.length > 0) {
      searchFilter.source = { $in: source_filters };
    }

    // Search for all mentions
    const queryResponse = await index.query({
      vector: keywordEmbedding,
      topK: 50, // Get many results to find all mentions
      includeMetadata: true,
      filter: searchFilter
    });

    console.log(`📊 Found ${queryResponse.matches.length} potential mentions`);

    // Filter results that actually contain the keyword (case-insensitive)
    const keywordLower = keyword.toLowerCase();
    const relevantMatches = queryResponse.matches.filter(match => 
      match.metadata.text.toLowerCase().includes(keywordLower)
    );

    console.log(`✅ ${relevantMatches.length} confirmed mentions of "${keyword}"`);

    // Group by source document
    const mentionsBySource = {};
    relevantMatches.forEach(match => {
      const source = match.metadata.source;
      if (!mentionsBySource[source]) {
        mentionsBySource[source] = [];
      }
      
      mentionsBySource[source].push({
        chunk_index: match.metadata.chunk_index + 1,
        total_chunks: match.metadata.total_chunks,
        text: match.metadata.text,
        score: match.score.toFixed(3),
        keywords: match.metadata.keywords || ''
      });
    });

    // Create summary
    const summary = Object.entries(mentionsBySource).map(([source, mentions]) => ({
      source: source,
      mention_count: mentions.length,
      mentions: mentions.slice(0, 5) // Limit to top 5 per document
    }));

    res.json({
      success: true,
      keyword: keyword,
      total_mentions: relevantMatches.length,
      documents_found: Object.keys(mentionsBySource).length,
      cross_references: summary,
      user: req.user.name
    });

  } catch (error) {
    console.error("❌ Error in cross-reference search:", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;