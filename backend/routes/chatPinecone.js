// backend/routes/chat-pinecone.js
const express = require("express");
const router = express.Router();
const { initPinecone } = require("../pinecone");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to generate embeddings for search queries
async function generateEmbedding(text) {
  const result = await genAI.getGenerativeModel({ model: "text-embedding-004" })
    .embedContent({
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_QUERY",
    });
  
  const embedding = result.embedding.values;
  console.log(`Generated query embedding dimension: ${embedding.length}`);
  return embedding;
}

// 🚀 QUERY EXPANSION - Generate multiple search variations
function expandQuery(query) {
  const originalQuery = query.toLowerCase().trim();
  const expansions = [originalQuery];
  
  // Add variations
  if (originalQuery.includes('what is')) {
    expansions.push(originalQuery.replace('what is', '').trim());
    expansions.push(originalQuery.replace('what is', 'define').trim());
  }
  
  if (originalQuery.includes('how to')) {
    expansions.push(originalQuery.replace('how to', 'steps to').trim());
    expansions.push(originalQuery.replace('how to', 'tutorial').trim());
  }
  
  // Add keyword extraction
  const keywords = originalQuery.split(' ').filter(word => word.length > 2);
  if (keywords.length > 1) {
    expansions.push(keywords.join(' '));
  }
  
  return [...new Set(expansions)]; // Remove duplicates
}

// 🚀 SEMANTIC RERANKING based on query relevance
function reRankResults(query, matches) {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(' ').filter(word => word.length > 2);
  
  return matches.map(match => {
    const text = match.metadata.text.toLowerCase();
    const keywords = match.metadata.keywords ? match.metadata.keywords.toLowerCase() : '';
    
    let relevanceBoost = 0;
    
    // Boost for exact phrase matches
    if (text.includes(queryLower)) {
      relevanceBoost += 0.2;
    }
    
    // Boost for individual word matches
    const wordMatches = queryWords.filter(word => text.includes(word)).length;
    relevanceBoost += (wordMatches / queryWords.length) * 0.15;
    
    // Boost for keyword matches
    const keywordMatches = queryWords.filter(word => keywords.includes(word)).length;
    relevanceBoost += (keywordMatches / queryWords.length) * 0.1;
    
    // Boost for content type relevance
    if (queryLower.includes('how') && match.metadata.content_type === 'tutorial') {
      relevanceBoost += 0.1;
    }
    if (queryLower.includes('what') && match.metadata.content_type === 'definition') {
      relevanceBoost += 0.1;
    }
    
    return {
      ...match,
      adjustedScore: Math.min(match.score + relevanceBoost, 1.0),
      originalScore: match.score,
      relevanceBoost: relevanceBoost
    };
  }).sort((a, b) => b.adjustedScore - a.adjustedScore);
}

// 🚀 CONTEXT COMBINATION - Combine multiple relevant chunks
function combineContext(rankedMatches, maxContext = 3) {
  if (rankedMatches.length === 0) return null;
  
  // Get top matches that are above threshold
  const relevantMatches = rankedMatches.filter(match => match.adjustedScore > 0.3);
  
  if (relevantMatches.length === 0) {
    return {
      answer: rankedMatches[0].metadata.text,
      confidence: rankedMatches[0].adjustedScore,
      sources: [rankedMatches[0].metadata.source],
      type: 'single_low_confidence'
    };
  }
  
  if (relevantMatches.length === 1) {
    return {
      answer: relevantMatches[0].metadata.text,
      confidence: relevantMatches[0].adjustedScore,
      sources: [relevantMatches[0].metadata.source],
      type: 'single_match'
    };
  }
  
  // Combine multiple relevant chunks
  const topMatches = relevantMatches.slice(0, maxContext);
  const combinedText = topMatches
    .map((match, idx) => `[Context ${idx + 1}]: ${match.metadata.text}`)
    .join('\n\n');
  
  return {
    answer: combinedText,
    confidence: topMatches[0].adjustedScore,
    sources: [...new Set(topMatches.map(m => m.metadata.source))],
    type: 'multi_context',
    match_count: topMatches.length
  };
}

// POST /api/chat-pinecone
router.post("/", async (req, res) => {
  try {
    const { query, source_filter } = req.body;
    if (!query) return res.status(400).json({ error: "Query required" });

    // 🚀 PDF-specific search capability
    const searchScope = source_filter ? `PDF: ${source_filter}` : 'All documents';
    console.log(`🔍 Searching in ${searchScope} for: "${query}"`);

    // 🚀 Query expansion for better matching
    const expandedQueries = expandQuery(query);
    console.log(`📝 Expanded queries: ${expandedQueries.join(', ')}`);

    const index = await initPinecone();
    let allMatches = [];

    // 🚀 Build filter for PDF-specific search
    const searchFilter = source_filter ? { source: source_filter } : undefined;
    
    // Search with multiple query variations
    for (const expandedQuery of expandedQueries.slice(0, 2)) {
      try {
        const queryEmbedding = await generateEmbedding(expandedQuery);
        
        const queryResponse = await index.query({
          vector: queryEmbedding,
          topK: 10,
          includeMetadata: true,
          filter: searchFilter // 🚨 Apply PDF filter here
        });

        allMatches.push(...queryResponse.matches);
      } catch (queryError) {
        console.error(`Error with query "${expandedQuery}":`, queryError);
        continue;
      }
    }

    // Remove duplicates based on ID
    const uniqueMatches = allMatches.filter((match, index, self) => 
      index === self.findIndex(m => m.id === match.id)
    );

    console.log(`📊 Found ${uniqueMatches.length} unique matches`);

    if (uniqueMatches.length === 0) {
      const noResultsMessage = source_filter 
        ? `I don't have any information about "${query}" in the PDF "${source_filter}". Make sure the PDF is uploaded and the filename is correct.`
        : "I don't have any information about that topic yet. Try uploading relevant documents first.";
        
      return res.json({ 
        answer: noResultsMessage,
        confidence: 0,
        type: 'no_matches',
        searched_in: searchScope
      });
    }

    // 🚀 Semantic reranking
    const rerankedMatches = reRankResults(query, uniqueMatches);
    
    // Log top scores for debugging
    console.log('🎯 Top 3 matches after reranking:');
    rerankedMatches.slice(0, 3).forEach((match, idx) => {
      console.log(`${idx + 1}. Score: ${match.adjustedScore.toFixed(3)} (orig: ${match.originalScore.toFixed(3)}, boost: +${match.relevanceBoost.toFixed(3)})`);
      console.log(`   Text: ${match.metadata.text.substring(0, 100)}...`);
    });

    // 🚀 Intelligent context combination
    const result = combineContext(rerankedMatches, 3);

    res.json({
      answer: result.answer,
      confidence: result.confidence,
      sources: result.sources,
      type: result.type,
      match_count: result.match_count || 1,
      searched_in: searchScope,
      debug: {
        total_matches: uniqueMatches.length,
        expanded_queries: expandedQueries,
        filter_applied: source_filter || 'none',
        top_scores: rerankedMatches.slice(0, 3).map(m => ({
          score: m.adjustedScore.toFixed(3),
          boost: m.relevanceBoost.toFixed(3),
          source: m.metadata.source,
          content_type: m.metadata.content_type
        }))
      }
    });

  } catch (err) {
    console.error("❌ Error querying Pinecone:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;