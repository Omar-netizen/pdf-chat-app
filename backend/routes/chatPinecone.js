// backend/routes/chat-pinecone.js
const express = require("express");
const router = express.Router();
const { initPinecone } = require("../pinecone");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { protect } = require("../middleware/auth");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Validate API key
if (!process.env.GEMINI_API_KEY) {
  console.error('⚠️ WARNING: GEMINI_API_KEY not configured!');
} else {
  console.log('✅ Gemini API key configured');
}

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

// 🚀 Generate AI response using retrieved context (SIMPLIFIED - WORKING VERSION)
async function generateAIResponse(query, contextChunks, compareMode = false) {
  try {
    // ✅ WORKING MODEL: gemini-2.5-flash (confirmed working!)
    const models = ["gemini-2.5-flash", "gemini-1.5-flash"];

    let aiResponse;
    let modelUsed;

    for (const modelName of models) {
      try {
        console.log(`🤖 Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });

        // Prepare FULL context from retrieved chunks (not truncated!)
        const context = contextChunks
          .map((chunk, idx) => {
            const source = chunk.metadata.source;
            const chunkNum = chunk.metadata.chunk_index + 1;
            const fullText = chunk.metadata.text; // FULL TEXT
            return `[Document ${idx + 1}: "${source}" - Section ${chunkNum}]\n${fullText}`;
          })
          .join('\n\n---\n\n');

        // Create intelligent prompt based on mode
        let prompt;
        
        if (compareMode) {
          prompt = `You are an AI assistant comparing information across multiple documents.

CONTEXT FROM MULTIPLE DOCUMENTS:
${context}

USER QUESTION: ${query}

INSTRUCTIONS:
- Compare and contrast the information from ALL documents
- Clearly state which document says what
- Highlight key similarities and differences
- Be specific with document names
- Provide a summary at the end

YOUR COMPARISON:`;
        } else {
          // Detect query type
          const queryLower = query.toLowerCase();
          const isListQuery = queryLower.includes('what are') || queryLower.includes('list') || 
                            queryLower.includes('features') || queryLower.includes('bonus');
          
          let instructions = `INSTRUCTIONS:
- Answer clearly and completely using the context above
- Use natural, conversational language
- Reference specific documents when relevant
- If context contains the answer, explain it thoroughly
- If not, say what's missing`;

          if (isListQuery) {
            instructions += `
- Present information as a clear, organized list
- Include ALL relevant items mentioned in the context
- Use bullet points or numbered format`;
          }

          prompt = `You are a helpful AI assistant answering questions based on PDF documents.

CONTEXT FROM DOCUMENTS:
${context}

USER QUESTION: ${query}

${instructions}

YOUR ANSWER:`;
        }

        // Simple generateContent call that works!
        const result = await model.generateContent(prompt);
        aiResponse = result.response.text();
        modelUsed = modelName;
        
        console.log(`✅ Success with ${modelName} (${aiResponse.length} chars)`);
        break; // Success!

      } catch (modelError) {
        console.log(`❌ ${modelName} failed: ${modelError.message}`);
        continue; // Try next model
      }
    }

    if (!aiResponse) {
      // All models failed - return structured fallback
      console.log('⚠️ All models failed, using fallback');
      aiResponse = `Based on your documents, here's what I found:\n\n${contextChunks
        .map((chunk, idx) => `**${chunk.metadata.source}:**\n${chunk.metadata.text}\n`)
        .join('\n')}`;
    }

    return aiResponse;

  } catch (error) {
    console.error('❌ Error generating AI response:', error);
    throw error;
  }
}

// 🚀 QUERY EXPANSION
function expandQuery(query) {
  const originalQuery = query.toLowerCase().trim();
  const expansions = [originalQuery];
  
  if (originalQuery.includes('what are')) {
    const extracted = originalQuery.replace('what are', '').replace('the', '').trim();
    if (extracted) expansions.push(extracted);
  }
  
  if (originalQuery.includes('what is')) {
    expansions.push(originalQuery.replace('what is', '').trim());
  }
  
  if (originalQuery.includes('how to')) {
    expansions.push(originalQuery.replace('how to', 'steps to').trim());
  }

  const keywords = originalQuery
    .replace(/what|are|is|the|how|to|of|for|in|on|with/g, '')
    .split(' ')
    .filter(word => word.length > 2);
  
  if (keywords.length > 0) {
    expansions.push(keywords.join(' '));
  }
  
  return [...new Set(expansions)].filter(q => q.length > 0);
}

// 🚀 SEMANTIC RERANKING
function reRankResults(query, matches) {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(' ').filter(word => word.length > 2);
  
  return matches.map(match => {
    const text = match.metadata.text.toLowerCase();
    const keywords = match.metadata.keywords ? match.metadata.keywords.toLowerCase() : '';
    
    let relevanceBoost = 0;
    
    if (text.includes(queryLower)) {
      relevanceBoost += 0.25;
    }
    
    const wordMatches = queryWords.filter(word => text.includes(word)).length;
    relevanceBoost += (wordMatches / queryWords.length) * 0.2;
    
    const keywordMatches = queryWords.filter(word => keywords.includes(word)).length;
    relevanceBoost += (keywordMatches / queryWords.length) * 0.15;
    
    if (queryLower.includes('how') && match.metadata.content_type === 'tutorial') {
      relevanceBoost += 0.1;
    }
    if (queryLower.includes('what') && match.metadata.content_type === 'definition') {
      relevanceBoost += 0.1;
    }
    
    // Boost for lists/features
    if ((queryLower.includes('features') || queryLower.includes('list') || queryLower.includes('what are')) &&
        (text.includes('•') || text.includes('-') || /\d+\./.test(text))) {
      relevanceBoost += 0.15;
    }
    
    return {
      ...match,
      adjustedScore: Math.min(match.score + relevanceBoost, 1.0),
      originalScore: match.score,
      relevanceBoost: relevanceBoost
    };
  }).sort((a, b) => b.adjustedScore - a.adjustedScore);
}

// POST /api/chat-pinecone - Protected with auth
router.post("/", protect, async (req, res) => {
  try {
    const { query, source_filters, compare_mode } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    const searchScope = source_filters && source_filters.length > 0
      ? `${source_filters.length} selected PDF${source_filters.length > 1 ? 's' : ''}`
      : `All your documents`;
    
    const modeLabel = compare_mode ? '⚖️ Comparing' : '🔍 Searching';
    console.log(`${modeLabel} for user ${req.user.email} in ${searchScope} for: "${query}"`);
    
    if (source_filters && source_filters.length > 0) {
      console.log(`📄 Selected PDFs: ${source_filters.join(', ')}`);
    }

    const expandedQueries = expandQuery(query);
    console.log(`📝 Expanded queries: ${expandedQueries.join(', ')}`);

    const index = await initPinecone();
    let allMatches = [];

    const searchFilter = { 
      user_id: req.user.id
    };

    if (source_filters && source_filters.length > 0) {
      searchFilter.source = { $in: source_filters };
    }
    
    // Search with expanded queries
    for (const expandedQuery of expandedQueries.slice(0, 3)) {
      try {
        const queryEmbedding = await generateEmbedding(expandedQuery);
        
        const queryResponse = await index.query({
          vector: queryEmbedding,
          topK: compare_mode ? 20 : 10,
          includeMetadata: true,
          filter: searchFilter
        });

        allMatches.push(...queryResponse.matches);
      } catch (queryError) {
        console.error(`Error with query "${expandedQuery}":`, queryError);
        continue;
      }
    }

    const uniqueMatches = allMatches.filter((match, index, self) => 
      index === self.findIndex(m => m.id === match.id)
    );

    console.log(`📊 Found ${uniqueMatches.length} unique matches`);

    if (uniqueMatches.length === 0) {
      const noResultsMessage = source_filters && source_filters.length > 0
        ? `I don't have any information about "${query}" in your selected PDFs: ${source_filters.join(', ')}.`
        : "You haven't uploaded any documents yet, or I don't have information about that topic.";
        
      return res.json({ 
        answer: noResultsMessage,
        confidence: 0,
        type: 'no_matches',
        searched_in: searchScope,
        selected_pdfs: source_filters || [],
        user: req.user.name
      });
    }

    const rerankedMatches = reRankResults(query, uniqueMatches);
    
    console.log('🎯 Top 5 matches after reranking:');
    rerankedMatches.slice(0, 5).forEach((match, idx) => {
      console.log(`${idx + 1}. Score: ${match.adjustedScore.toFixed(3)} (orig: ${match.originalScore.toFixed(3)}, boost: +${match.relevanceBoost.toFixed(3)})`);
      console.log(`   Source: ${match.metadata.source}`);
      console.log(`   Preview: ${match.metadata.text.substring(0, 100)}...`);
    });

    const topRelevantChunks = rerankedMatches
      .filter(match => match.adjustedScore > 0.25)
      .slice(0, compare_mode ? 20 : 5);

    if (topRelevantChunks.length === 0) {
      return res.json({
        answer: "I found some information but it doesn't seem very relevant. Try rephrasing your query.",
        confidence: rerankedMatches[0]?.adjustedScore || 0,
        type: 'low_relevance',
        searched_in: searchScope,
        top_score: rerankedMatches[0]?.adjustedScore.toFixed(3)
      });
    }

    // 🚀 Generate AI Response
    console.log(`🤖 Generating AI response (${compare_mode ? 'compare' : 'normal'} mode)...`);
    
    const aiResponse = await generateAIResponse(query, topRelevantChunks, compare_mode);
    
    // Build citations
    const citations = topRelevantChunks.map((chunk, idx) => ({
      id: idx + 1,
      source: chunk.metadata.source,
      chunk_index: chunk.metadata.chunk_index + 1,
      total_chunks: chunk.metadata.total_chunks,
      text_preview: chunk.metadata.text.substring(0, 200) + '...',
      confidence: chunk.adjustedScore.toFixed(3),
      keywords: chunk.metadata.keywords || 'N/A',
      content_type: chunk.metadata.content_type || 'general'
    }));

    const sources = [...new Set(topRelevantChunks.map(m => m.metadata.source))];

    // Comparison data if in compare mode
    let comparisonData = null;
    if (compare_mode) {
      const matchesBySource = {};
      topRelevantChunks.forEach(match => {
        const source = match.metadata.source;
        if (!matchesBySource[source]) {
          matchesBySource[source] = [];
        }
        matchesBySource[source].push(match);
      });

      comparisonData = Object.entries(matchesBySource).map(([source, matches]) => ({
        source: source,
        content: matches[0].metadata.text.substring(0, 300) + '...',
        score: matches[0].adjustedScore.toFixed(3),
        chunks_found: matches.length
      }));
    }

    const response = {
      answer: aiResponse,
      confidence: topRelevantChunks[0].adjustedScore,
      sources: sources,
      citations: citations,
      type: compare_mode ? 'comparison' : 'ai_generated',
      context_chunks_used: topRelevantChunks.length,
      searched_in: searchScope,
      selected_pdfs: source_filters || [],
      compare_mode: compare_mode || false,
      debug: {
        total_matches: uniqueMatches.length,
        expanded_queries: expandedQueries,
        filter_applied: source_filters && source_filters.length > 0 ? source_filters.join(', ') : 'all documents',
        top_scores: rerankedMatches.slice(0, 5).map(m => ({
          score: m.adjustedScore.toFixed(3),
          boost: m.relevanceBoost.toFixed(3),
          source: m.metadata.source,
          content_type: m.metadata.content_type
        }))
      }
    };

    if (comparisonData) {
      response.comparison = comparisonData;
    }

    res.json(response);

  } catch (err) {
    console.error("❌ Error in chat:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ 
      error: err.message,
      type: 'server_error'
    });
  }
});

module.exports = router;