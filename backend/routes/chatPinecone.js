// backend/routes/chat-pinecone.js
const express = require("express");
const router = express.Router();
const { initPinecone } = require("../pinecone");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { protect } = require("../middleware/auth");

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

// 🚀 IMPROVED: Generate natural AI response (ALWAYS works)
async function generateAIResponse(query, contextChunks) {
  const models = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b", 
    "gemini-1.5-pro",
    "gemini-pro"
  ];

  // Prepare clean context
  const context = contextChunks
    .map((chunk, idx) => `Context ${idx + 1} from ${chunk.metadata.source}:\n${chunk.metadata.text}`)
    .join('\n\n');

  const prompt = `You are a helpful AI assistant. Answer the user's question based on the provided context from their PDF documents.

CONTEXT FROM USER'S DOCUMENTS:
${context}

USER QUESTION: ${query}

INSTRUCTIONS:
- Provide a clear, natural, conversational answer
- Use the information from the context above
- Be concise but complete
- If the context has the answer, explain it naturally
- If the context doesn't fully answer the question, say so politely
- Do NOT just copy-paste from the context - explain in your own words

YOUR ANSWER:`;

  // Try each model until one works
  for (const modelName of models) {
    try {
      console.log(`🤖 Trying ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      console.log(`✅ Success with ${modelName}`);
      return response;
      
    } catch (error) {
      console.log(`❌ ${modelName} failed: ${error.message}`);
      continue;
    }
  }

  // If ALL models fail (very rare), generate a basic summary
  const basicAnswer = `Based on your documents, here's what I found:\n\n${contextChunks
    .map(c => c.metadata.text.substring(0, 200))
    .join('\n\n')}\n\nNote: AI models are temporarily unavailable, showing raw context.`;
  
  return basicAnswer;
}

// 🚀 Generate comparison response for multiple PDFs
async function generateComparisonResponse(query, matchesBySource) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

    // Organize context by source
    const sourceContexts = Object.entries(matchesBySource).map(([source, matches]) => {
      const context = matches
        .slice(0, 3)
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

// 🚀 QUERY EXPANSION - Generate multiple search variations
function expandQuery(query) {
  const originalQuery = query.toLowerCase().trim();
  const expansions = [originalQuery];
  
  if (originalQuery.includes('what is')) {
    expansions.push(originalQuery.replace('what is', '').trim());
    expansions.push(originalQuery.replace('what is', 'define').trim());
  }
  
  if (originalQuery.includes('how to')) {
    expansions.push(originalQuery.replace('how to', 'steps to').trim());
    expansions.push(originalQuery.replace('how to', 'tutorial').trim());
  }
  
  const keywords = originalQuery.split(' ').filter(word => word.length > 2);
  if (keywords.length > 1) {
    expansions.push(keywords.join(' '));
  }
  
  return [...new Set(expansions)];
}

// 🚀 SEMANTIC RERANKING based on query relevance
function reRankResults(query, matches) {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(' ').filter(word => word.length > 2);
  
  return matches.map(match => {
    const text = match.metadata.text.toLowerCase();
    const keywords = match.metadata.keywords ? match.metadata.keywords.toLowerCase() : '';
    
    let relevanceBoost = 0;
    
    if (text.includes(queryLower)) {
      relevanceBoost += 0.2;
    }
    
    const wordMatches = queryWords.filter(word => text.includes(word)).length;
    relevanceBoost += (wordMatches / queryWords.length) * 0.15;
    
    const keywordMatches = queryWords.filter(word => keywords.includes(word)).length;
    relevanceBoost += (keywordMatches / queryWords.length) * 0.1;
    
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
    const { query, source_filters, compare_mode } = req.body;
    if (!query) return res.status(400).json({ error: "Query required" });

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

    const rerankedMatches = reRankResults(query, uniqueMatches);
    
    console.log('🎯 Top 3 matches after reranking:');
    rerankedMatches.slice(0, 3).forEach((match, idx) => {
      console.log(`${idx + 1}. Score: ${match.adjustedScore.toFixed(3)} (orig: ${match.originalScore.toFixed(3)}, boost: +${match.relevanceBoost.toFixed(3)})`);
      console.log(`   Text: ${match.metadata.text.substring(0, 100)}...`);
    });

    const topRelevantChunks = rerankedMatches
      .filter(match => match.adjustedScore > 0.3)
      .slice(0, compare_mode ? 15 : 3);

    if (topRelevantChunks.length === 0) {
      return res.json({
        answer: "I found some information but it doesn't seem very relevant to your question. Try rephrasing your query.",
        confidence: rerankedMatches[0]?.adjustedScore || 0,
        type: 'low_relevance',
        searched_in: searchScope
      });
    }

    // 🚀 COMPARE MODE
    if (compare_mode && source_filters && source_filters.length >= 2) {
      console.log('⚖️ Compare mode activated - generating comparison...');
      
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
      }
    }

    // 🚀 Normal Mode - ALWAYS get AI response
    console.log('🤖 Generating natural AI response...');
    
    const aiResponse = await generateAIResponse(query, topRelevantChunks);
    
    // Build simple citations list
    const citations = topRelevantChunks.map((chunk, idx) => ({
      id: idx + 1,
      source: chunk.metadata.source,
      chunk_index: chunk.metadata.chunk_index + 1,
      total_chunks: chunk.metadata.total_chunks,
      text_preview: chunk.metadata.text.substring(0, 150) + '...',
      confidence: chunk.adjustedScore.toFixed(3),
      keywords: chunk.metadata.keywords || 'N/A',
      content_type: chunk.metadata.content_type || 'general'
    }));

    res.json({
      answer: aiResponse,
      confidence: topRelevantChunks[0].adjustedScore,
      sources: [...new Set(topRelevantChunks.map(m => m.metadata.source))],
      citations: citations,
      type: 'ai_generated',
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