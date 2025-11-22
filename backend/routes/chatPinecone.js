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

// 🚀 IMPROVED: Generate natural AI response with better error handling
async function generateAIResponse(query, contextChunks, options = {}) {
  const { compareMode = false, crossRefMode = false } = options;
  
  // Use FULL text from chunks, not truncated
  const context = contextChunks
    .map((chunk, idx) => {
      const source = chunk.metadata.source;
      const chunkNum = chunk.metadata.chunk_index + 1;
      const totalChunks = chunk.metadata.total_chunks;
      const fullText = chunk.metadata.text; // FULL TEXT, not substring
      
      return `[Document ${idx + 1}: "${source}" - Section ${chunkNum}/${totalChunks}]
${fullText}`;
    })
    .join('\n\n---\n\n');

  // 🎯 Intelligent prompt based on query type
  let prompt;
  
  if (crossRefMode) {
    prompt = `You are an AI assistant helping users find ALL mentions of specific keywords across their documents.

CONTEXT FROM DOCUMENTS:
${context}

USER'S KEYWORD SEARCH: "${query}"

INSTRUCTIONS:
- List ALL sections from the documents that mention or relate to "${query}"
- For each mention, specify which document and section it's from
- Quote or summarize the relevant text for each mention
- Organize by document, then by relevance
- If the keyword appears in different contexts, explain each context
- Be comprehensive - don't skip any relevant mentions

YOUR RESPONSE:`;
  } else if (compareMode) {
    prompt = `You are an AI assistant specialized in comparing information across multiple documents.

CONTEXT FROM MULTIPLE DOCUMENTS:
${context}

USER'S COMPARISON QUESTION: ${query}

INSTRUCTIONS:
- Compare and contrast information from the different documents
- Clearly identify which document says what
- Highlight similarities and differences
- Use clear section headers for each document
- Point out any conflicting information
- Summarize key differences at the end
- Be specific with document names and section references

YOUR COMPARISON ANALYSIS:`;
  } else {
    // 🎯 Detect query intent for better responses
    const queryLower = query.toLowerCase();
    const isListQuery = queryLower.includes('what are') || 
                       queryLower.includes('list') || 
                       queryLower.includes('features') ||
                       queryLower.includes('bonus');
    const isHowToQuery = queryLower.includes('how to') || queryLower.includes('how do');
    const isDefinitionQuery = queryLower.includes('what is') || queryLower.includes('define');

    let responseFormat = '';
    if (isListQuery) {
      responseFormat = `
- Present the information as a clear, organized list
- Use bullet points or numbered items
- Include all relevant details from the context
- Don't miss any items mentioned`;
    } else if (isHowToQuery) {
      responseFormat = `
- Provide step-by-step instructions
- Be clear and sequential
- Include any prerequisites or requirements`;
    } else if (isDefinitionQuery) {
      responseFormat = `
- Give a clear, concise definition
- Explain with examples if available
- Include any important context`;
    }

    prompt = `You are a helpful AI assistant answering questions based on the user's PDF documents.

CONTEXT FROM USER'S DOCUMENTS:
${context}

USER QUESTION: ${query}

INSTRUCTIONS:
- Answer the question directly and completely using the context above
- Use natural, conversational language
- Cite specific documents and sections when relevant (e.g., "According to [Document Name]...")
- If the context contains lists, features, or structured information, preserve that structure in your answer
- Be thorough - include ALL relevant information from the context${responseFormat}
- If the context doesn't fully answer the question, clearly state what information is missing
- DO NOT invent information not present in the context

YOUR ANSWER:`;
  }

  // Try models with detailed error logging
  const models = [
    { name: "gemini-1.5-flash-8b", maxTokens: 8192 },
    { name: "gemini-1.5-flash", maxTokens: 8192 },
    { name: "gemini-1.5-pro", maxTokens: 8192 }
  ];

  let lastError = null;

  for (const modelConfig of models) {
    try {
      console.log(`🤖 Trying ${modelConfig.name}...`);
      const model = genAI.getGenerativeModel({ 
        model: modelConfig.name,
        generationConfig: {
          maxOutputTokens: modelConfig.maxTokens,
          temperature: 0.7,
          topP: 0.9,
        }
      });
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      
      // Check if response was blocked
      if (response.promptFeedback?.blockReason) {
        console.log(`⚠️ ${modelConfig.name} blocked: ${response.promptFeedback.blockReason}`);
        lastError = `Content blocked: ${response.promptFeedback.blockReason}`;
        continue;
      }
      
      const text = response.text();
      
      if (!text || text.trim().length === 0) {
        console.log(`⚠️ ${modelConfig.name} returned empty response`);
        lastError = 'Empty response from model';
        continue;
      }
      
      console.log(`✅ Success with ${modelConfig.name} (${text.length} chars)`);
      return text;
      
    } catch (error) {
      console.error(`❌ ${modelConfig.name} failed:`, {
        message: error.message,
        code: error.code,
        status: error.status
      });
      lastError = error.message;
      continue;
    }
  }

  // If ALL models fail, return structured fallback with FULL context
  console.error('🚨 All AI models failed. Last error:', lastError);
  
  // Generate intelligent fallback based on context
  const fallbackAnswer = `I found relevant information in your documents, but I'm having trouble processing it right now. Here's what I found:

${contextChunks.map((chunk, idx) => {
  const source = chunk.metadata.source;
  const text = chunk.metadata.text;
  return `**From "${source}":**
${text}`;
}).join('\n\n')}

(Note: AI processing temporarily unavailable - showing raw context. Error: ${lastError})`;
  
  return fallbackAnswer;
}

// 🚀 Cross-Reference Mode - Find all mentions of a keyword
async function generateCrossReferenceResponse(keyword, matches) {
  const matchesBySource = {};
  
  matches.forEach(match => {
    const source = match.metadata.source;
    if (!matchesBySource[source]) {
      matchesBySource[source] = [];
    }
    matchesBySource[source].push(match);
  });

  const crossReferences = Object.entries(matchesBySource).map(([source, sourceMatches]) => ({
    source: source,
    mention_count: sourceMatches.length,
    mentions: sourceMatches.map(m => ({
      text: m.metadata.text,
      chunk_index: m.metadata.chunk_index + 1,
      total_chunks: m.metadata.total_chunks,
      score: m.adjustedScore || m.score
    }))
  }));

  return {
    keyword: keyword,
    total_mentions: matches.length,
    documents_found: Object.keys(matchesBySource).length,
    cross_references: crossReferences
  };
}

// 🚀 QUERY EXPANSION - Generate multiple search variations
function expandQuery(query) {
  const originalQuery = query.toLowerCase().trim();
  const expansions = [originalQuery];
  
  // Remove common question words for keyword extraction
  if (originalQuery.includes('what are')) {
    const extracted = originalQuery.replace('what are', '').replace('the', '').trim();
    if (extracted) expansions.push(extracted);
  }
  
  if (originalQuery.includes('what is')) {
    expansions.push(originalQuery.replace('what is', '').trim());
    expansions.push(originalQuery.replace('what is', 'define').trim());
  }
  
  if (originalQuery.includes('how to')) {
    expansions.push(originalQuery.replace('how to', 'steps to').trim());
    expansions.push(originalQuery.replace('how to', 'tutorial').trim());
  }

  // Add just the main keywords
  const keywords = originalQuery
    .replace(/what|are|is|the|how|to|of|for|in|on|with/g, '')
    .split(' ')
    .filter(word => word.length > 2);
  
  if (keywords.length > 0) {
    expansions.push(keywords.join(' '));
  }
  
  return [...new Set(expansions)].filter(q => q.length > 0);
}

// 🚀 SEMANTIC RERANKING based on query relevance
function reRankResults(query, matches) {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(' ').filter(word => word.length > 2);
  
  return matches.map(match => {
    const text = match.metadata.text.toLowerCase();
    const keywords = match.metadata.keywords ? match.metadata.keywords.toLowerCase() : '';
    
    let relevanceBoost = 0;
    
    // Exact phrase match gets highest boost
    if (text.includes(queryLower)) {
      relevanceBoost += 0.25;
    }
    
    // Word-by-word matching
    const wordMatches = queryWords.filter(word => text.includes(word)).length;
    relevanceBoost += (wordMatches / queryWords.length) * 0.2;
    
    // Keyword matching
    const keywordMatches = queryWords.filter(word => keywords.includes(word)).length;
    relevanceBoost += (keywordMatches / queryWords.length) * 0.15;
    
    // Content type matching
    if (queryLower.includes('how') && match.metadata.content_type === 'tutorial') {
      relevanceBoost += 0.1;
    }
    if (queryLower.includes('what') && match.metadata.content_type === 'definition') {
      relevanceBoost += 0.1;
    }
    
    // Boost for chunks with lists/features (often have bullet points or numbers)
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

// POST /api/chat-pinecone - 🚀 PROTECTED WITH AUTH
router.post("/", protect, async (req, res) => {
  try {
    const { query, source_filters, compare_mode, cross_ref_mode } = req.body;
    if (!query) return res.status(400).json({ error: "Query required" });

    const searchScope = source_filters && source_filters.length > 0
      ? `${source_filters.length} selected PDF${source_filters.length > 1 ? 's' : ''}`
      : `All your documents`;
    
    let modeLabel = '🔍 Searching';
    if (compare_mode) modeLabel = '⚖️ Comparing';
    if (cross_ref_mode) modeLabel = '🔗 Cross-Referencing';
    
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
          topK: cross_ref_mode ? 50 : 15, // More results for cross-reference
          includeMetadata: true,
          filter: searchFilter
        });

        allMatches.push(...queryResponse.matches);
      } catch (queryError) {
        console.error(`Error with query "${expandedQuery}":`, queryError);
        continue;
      }
    }

    // Remove duplicates
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
    
    console.log('🎯 Top 5 matches after reranking:');
    rerankedMatches.slice(0, 5).forEach((match, idx) => {
      console.log(`${idx + 1}. Score: ${match.adjustedScore.toFixed(3)} (orig: ${match.originalScore.toFixed(3)}, boost: +${match.relevanceBoost.toFixed(3)})`);
      console.log(`   Source: ${match.metadata.source}`);
      console.log(`   Preview: ${match.metadata.text.substring(0, 100)}...`);
    });

    // 🚀 CROSS-REFERENCE MODE - Return all mentions
    if (cross_ref_mode) {
      console.log('🔗 Cross-reference mode activated');
      
      const relevantMatches = rerankedMatches.filter(m => m.adjustedScore > 0.25);
      
      if (relevantMatches.length === 0) {
        return res.json({
          answer: `No mentions of "${query}" found in your selected documents.`,
          confidence: 0,
          type: 'cross_reference',
          searched_in: searchScope
        });
      }

      const crossRefData = await generateCrossReferenceResponse(query, relevantMatches);
      
      return res.json({
        type: 'cross_reference',
        crossReference: crossRefData,
        confidence: relevantMatches[0].adjustedScore,
        searched_in: searchScope,
        selected_pdfs: source_filters || []
      });
    }

    // Filter by relevance threshold
    const topRelevantChunks = rerankedMatches
      .filter(match => match.adjustedScore > 0.25) // Lowered threshold for better recall
      .slice(0, compare_mode ? 20 : 5); // More chunks for better context

    if (topRelevantChunks.length === 0) {
      return res.json({
        answer: "I found some information but it doesn't seem very relevant to your question. Try rephrasing your query or checking if the right documents are selected.",
        confidence: rerankedMatches[0]?.adjustedScore || 0,
        type: 'low_relevance',
        searched_in: searchScope,
        top_score: rerankedMatches[0]?.adjustedScore.toFixed(3)
      });
    }

    // 🚀 Generate AI Response (works for both compare and normal mode)
    console.log(`🤖 Generating AI response (${compare_mode ? 'compare' : 'normal'} mode)...`);
    
    const aiResponse = await generateAIResponse(query, topRelevantChunks, {
      compareMode: compare_mode,
      crossRefMode: false
    });
    
    // Build detailed citations
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

    // Get unique sources
    const sources = [...new Set(topRelevantChunks.map(m => m.metadata.source))];

    // Build comparison data if in compare mode
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
      type: 'server_error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

module.exports = router;