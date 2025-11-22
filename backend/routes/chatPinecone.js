// 🚀 NEW: Generate comparison response for multiple PDFs
async function generateComparisonResponse(query, matchesBySource) {// 🚀 NEW: Generate AI response using retrieved context
async function generateAIResponse(query, contextChunks) {// backend/routes/chat-pinecone.js
const express = require("express");
const router = express.Router();
const { initPinecone } = require("../pinecone");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { protect } = require("../middleware/auth"); // 🚀 Import auth middleware

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

// 🚀 NEW: Generate response with detailed citations
async function generateResponseWithCitations(query, contextChunks) {
  try {
    const models = ["gemini-1.5-flash-8b", "gemini-1.5-pro", "gemini-pro"];
    let aiResponse;
    let modelUsed;

    // Prepare context with citation markers
    const citedContext = contextChunks
      .map((chunk, idx) => {
        const citationId = `[${idx + 1}]`;
        return `${citationId} SOURCE: ${chunk.metadata.source} (Chunk ${chunk.metadata.chunk_index + 1}/${chunk.metadata.total_chunks})\nCONTENT: ${chunk.metadata.text}`;
      })
      .join('\n\n---\n\n');

    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt = `You are a helpful AI assistant that provides detailed answers with proper citations.

CONTEXT FROM DOCUMENTS (with citation IDs):
${citedContext}

USER QUESTION: ${query}

INSTRUCTIONS:
- Answer the question using the information provided above
- When you mention information from a source, include the citation ID like [1], [2], etc.
- Be specific and cite sources for every claim
- If information appears in multiple sources, cite all of them like [1][2]
- Use natural language but ensure citations are included
- If you can't find relevant information, say so clearly

ANSWER WITH CITATIONS:`;

        const result = await model.generateContent(prompt);
        aiResponse = result.response.text();
        modelUsed = modelName;
        break;

      } catch (modelError) {
        console.log(`❌ ${modelName} failed:`, modelError.message);
        continue;
      }
    }

    if (!aiResponse) {
      throw new Error('All models unavailable');
    }

    console.log(`🤖 Generated cited response using ${modelUsed}`);
    return aiResponse;

  } catch (error) {
    console.error('❌ Error generating cited response:', error);
    throw error;
  }
}
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

    // Organize context by source
    const sourceContexts = Object.entries(matchesBySource).map(([source, matches]) => {
      const context = matches
        .slice(0, 3) // Top 3 chunks per source
        .map(m => m.metadata.text)
        .join('\n');
      return `**${source}**:\n${context}`;
    }).join('\n\n---\n\n');

    const prompt = `You are an AI assistant specialized in comparing and contrasting information from multiple documents.

DOCUMENTS TO COMPARE:
${sourceContexts}

USER QUESTION: ${query}

INSTRUCTIONS:
- Compare and contrast the information from ALL the documents provided
- Highlight similarities and differences clearly
- Use a structured format with bullet points or sections for each document
- Be specific about which document says what
- If documents have conflicting information, point it out
- If a document doesn't mention something, state that clearly
- Provide a summary of key differences at the end

COMPARISON ANALYSIS:`;

    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();
    
    console.log(`⚖️ Generated comparison response`);
    return aiResponse;

  } catch (error) {
    console.error('❌ Error generating comparison:', error);
    throw error;
  }
}
  try {
    // Try different models in order of preference
    const models = [
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro", 
      "gemini-pro"
    ];

    let aiResponse;
    let modelUsed;

    for (const modelName of models) {
      try {
        console.log(`🔄 Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });

        // Prepare context from retrieved chunks
        const context = contextChunks
          .map((chunk, idx) => `[Source ${idx + 1}]: ${chunk.metadata.text}`)
          .join('\n\n');

        // Create a detailed prompt for better responses
        const prompt = `You are a helpful AI assistant that answers questions based on provided context from PDF documents.

CONTEXT FROM DOCUMENTS:
${context}

USER QUESTION: ${query}

INSTRUCTIONS:
- Answer the question using ONLY the information provided in the context above
- Be conversational and natural in your response
- If the context contains the answer, provide a clear and helpful response
- If the context doesn't contain enough information to answer the question, say so politely
- Mention which source(s) you're referencing when relevant
- Keep your response concise but informative

ANSWER:`;

        const result = await model.generateContent(prompt);
        aiResponse = result.response.text();
        modelUsed = modelName;
        break; // Success, exit the loop

      } catch (modelError) {
        console.log(`❌ ${modelName} failed: ${modelError.message}`);
        continue; // Try next model
      }
    }

    if (!aiResponse) {
      throw new Error('All Gemini models are currently unavailable');
    }
    
    console.log(`🤖 Generated AI response using ${modelUsed}: ${aiResponse.substring(0, 100)}...`);
    return aiResponse;

  } catch (error) {
    console.error('❌ Error generating AI response:', error);
    throw error;
  }
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

// POST /api/chat-pinecone - 🚀 NOW PROTECTED WITH AUTH
router.post("/", protect, async (req, res) => {
  try {
    const { query, source_filters } = req.body; // 🚀 Changed to source_filters (array)
    if (!query) return res.status(400).json({ error: "Query required" });

    // 🚀 Multi-PDF search capability
    const searchScope = source_filters && source_filters.length > 0
      ? `${source_filters.length} selected PDF${source_filters.length > 1 ? 's' : ''}`
      : `All your documents`;
    
    const modeLabel = compare_mode ? '⚖️ Comparing' : '🔍 Searching';
    console.log(`${modeLabel} for user ${req.user.email} in ${searchScope} for: "${query}"`);
    
    if (source_filters && source_filters.length > 0) {
      console.log(`📄 Selected PDFs: ${source_filters.join(', ')}`);
    }

    // 🚀 Query expansion for better matching
    const expandedQueries = expandQuery(query);
    console.log(`📝 Expanded queries: ${expandedQueries.join(', ')}`);

    const index = await initPinecone();
    let allMatches = [];

    // 🚀 Build filter for USER-SPECIFIC + MULTI-PDF search
    const searchFilter = { 
      user_id: req.user.id // 🚀 ALWAYS FILTER BY USER
    };

    // 🚀 Add multi-PDF filter if specific PDFs are selected
    if (source_filters && source_filters.length > 0) {
      searchFilter.source = { $in: source_filters }; // Pinecone $in operator for multiple values
    }
    
    // Search with multiple query variations
    for (const expandedQuery of expandedQueries.slice(0, 2)) {
      try {
        const queryEmbedding = await generateEmbedding(expandedQuery);
        
        const queryResponse = await index.query({
          vector: queryEmbedding,
          topK: 10,
          includeMetadata: true,
          filter: searchFilter
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
      const noResultsMessage = source_filters && source_filters.length > 0
        ? `I don't have any information about "${query}" in your selected PDFs: ${source_filters.join(', ')}. Make sure you've uploaded these PDFs to your account.`
        : "You haven't uploaded any documents yet, or I don't have information about that topic in your uploaded PDFs.";
        
      return res.json({ 
        answer: noResultsMessage,
        confidence: 0,
        type: 'no_matches',
        searched_in: searchScope,
        selected_pdfs: source_filters || [],
        user: req.user.name
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

    // 🚀 Get top relevant chunks for AI processing
    const topRelevantChunks = rerankedMatches
      .filter(match => match.adjustedScore > 0.3)
      .slice(0, compare_mode ? 15 : 3); // More chunks for comparison mode

    if (topRelevantChunks.length === 0) {
      return res.json({
        answer: "I found some information but it doesn't seem very relevant to your question. Try rephrasing your query.",
        confidence: rerankedMatches[0]?.adjustedScore || 0,
        type: 'low_relevance',
        searched_in: searchScope
      });
    }

    // 🚀 COMPARE MODE: Generate comparison between documents
    if (compare_mode && source_filters && source_filters.length >= 2) {
      console.log('⚖️ Compare mode activated - generating comparison...');
      
      // Group matches by source document
      const matchesBySource = {};
      topRelevantChunks.forEach(match => {
        const source = match.metadata.source;
        if (!matchesBySource[source]) {
          matchesBySource[source] = [];
        }
        matchesBySource[source].push(match);
      });

      console.log(`📊 Comparing data from ${Object.keys(matchesBySource).length} documents`);

      try {
        const comparisonResponse = await generateComparisonResponse(query, matchesBySource);
        
        // Create comparison breakdown
        const comparisonData = Object.entries(matchesBySource).map(([source, matches]) => ({
          source: source,
          content: matches[0].metadata.text.substring(0, 200) + '...',
          score: matches[0].adjustedScore
        }));

        return res.json({
          answer: comparisonResponse,
          confidence: topRelevantChunks[0].adjustedScore,
          sources: Object.keys(matchesBySource),
          type: 'comparison',
          comparison: comparisonData,
          context_chunks_used: topRelevantChunks.length,
          searched_in: searchScope,
          selected_pdfs: source_filters,
          compare_mode: true
        });

      } catch (compareError) {
        console.log('⚠️ Comparison generation failed, falling back to normal mode');
        // Fall through to normal mode
      }
    }

    // 🚀 Generate AI response using the retrieved context (Normal Mode)
    console.log('🤖 Generating normal AI response...');
    let aiResponse;
    let responseType = 'ai_generated';

    try {
      aiResponse = await generateAIResponse(query, topRelevantChunks);
    } catch (aiError) {
      console.log('⚠️ AI generation failed, falling back to context summary');
      // Fallback: Return a structured context summary
      aiResponse = `Based on your documents, here's what I found:\n\n${topRelevantChunks
        .map((chunk, idx) => `**Source ${idx + 1}:** ${chunk.metadata.text.substring(0, 300)}...`)
        .join('\n\n')}`;
      responseType = 'context_fallback';
    }

    res.json({
      answer: aiResponse,
      confidence: topRelevantChunks[0].adjustedScore,
      sources: [...new Set(topRelevantChunks.map(m => m.metadata.source))],
      citations: citations, // 🚀 Detailed citation information
      type: responseType,
      context_chunks_used: topRelevantChunks.length,
      searched_in: searchScope,
      selected_pdfs: source_filters || [],
      debug: {
        total_matches: uniqueMatches.length,
        expanded_queries: expandedQueries,
        filter_applied: source_filters && source_filters.length > 0 ? source_filters.join(', ') : 'all documents',
        top_scores: rerankedMatches.slice(0, 3).map(m => ({
          score: m.adjustedScore.toFixed(3),
          boost: m.relevanceBoost.toFixed(3),
          source: m.metadata.source,
          content_type: m.metadata.content_type
        }))
      }
    });

  } catch (err) {
    console.error("❌ Error in chat:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;