// backend/routes/cross-reference.js
const express = require("express");
const router = express.Router();
const { initPinecone } = require("../pinecone");
const { protect } = require("../middleware/auth");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Validate API key on startup
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-api-key-here') {
  console.error('⚠️ WARNING: GEMINI_API_KEY not properly configured for cross-reference!');
} else {
  console.log('✅ Cross-reference module: Gemini API key configured');
}

// Function to generate embeddings
async function generateEmbedding(text) {
  try {
    const result = await genAI.getGenerativeModel({ model: "text-embedding-004" })
      .embedContent({
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_QUERY",
      });
    return result.embedding.values;
  } catch (error) {
    console.error('❌ Embedding generation failed:', error.message);
    throw error;
  }
}

// 🚀 Generate keyword variations for better search coverage
function generateKeywordVariations(keyword) {
  const variations = new Set([keyword.toLowerCase().trim()]);
  
  // Add plural/singular forms
  if (keyword.endsWith('s') && keyword.length > 3) {
    variations.add(keyword.slice(0, -1)); // Remove 's'
  } else {
    variations.add(keyword + 's'); // Add 's'
  }
  
  // Add with common prefixes/suffixes removed
  const cleaned = keyword.replace(/ing$|ed$|ly$|tion$/gi, '');
  if (cleaned.length > 2) {
    variations.add(cleaned.toLowerCase());
  }
  
  // Add hyphenated versions
  if (keyword.includes(' ')) {
    variations.add(keyword.replace(/\s+/g, '-'));
    variations.add(keyword.replace(/\s+/g, ''));
  }
  if (keyword.includes('-')) {
    variations.add(keyword.replace(/-/g, ' '));
    variations.add(keyword.replace(/-/g, ''));
  }
  
  return Array.from(variations);
}

// 🚀 Enhanced matching - checks for keyword in context
function findKeywordMatches(text, keyword, variations) {
  const textLower = text.toLowerCase();
  const matches = [];
  
  // Check each variation
  variations.forEach(variant => {
    if (textLower.includes(variant)) {
      // Find the position(s) of the keyword
      let pos = 0;
      while ((pos = textLower.indexOf(variant, pos)) !== -1) {
        // Extract context around the keyword (150 chars before and after)
        const start = Math.max(0, pos - 150);
        const end = Math.min(text.length, pos + variant.length + 150);
        const context = text.substring(start, end);
        
        matches.push({
          variant: variant,
          position: pos,
          context: context,
          exact_match: text.substring(pos, pos + variant.length)
        });
        
        pos += variant.length;
      }
    }
  });
  
  return matches;
}

// 🚀 Generate AI summary of cross-references
async function generateCrossReferenceSummary(keyword, crossReferences) {
  // ✅ WORKING MODEL: gemini-2.5-flash
  const models = ["gemini-2.5-flash", "gemini-1.5-flash"];

  // Build context from all mentions
  const context = crossReferences.map(ref => {
    const mentionsText = ref.mentions.slice(0, 3).map((m, idx) => 
      `  ${idx + 1}. Section ${m.chunk_index}: "${m.text.substring(0, 200)}..."`
    ).join('\n');
    
    return `**${ref.source}** (${ref.mention_count} mention${ref.mention_count > 1 ? 's' : ''}):\n${mentionsText}`;
  }).join('\n\n');

  const prompt = `You are an AI assistant helping users understand how a keyword is used across multiple documents.

KEYWORD: "${keyword}"

FOUND IN THESE DOCUMENTS:
${context}

TASK:
Provide a concise summary (3-5 sentences) explaining:
1. What "${keyword}" refers to based on the mentions
2. How it's used or discussed across the different documents
3. Any notable differences in how each document treats "${keyword}"
4. Key insights or patterns you notice

Keep it conversational and informative. Focus on synthesis, not just listing facts.

SUMMARY:`;

  for (const modelName of models) {
    try {
      console.log(`🤖 Generating summary with ${modelName}...`);
      
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 1024,
        }
      });
      
      const summary = result.response.text();
      console.log(`✅ Summary generated (${summary.length} chars)`);
      return summary;
      
    } catch (error) {
      console.log(`❌ ${modelName} failed: ${error.message}`);
      continue;
    }
  }
  
  // Fallback if AI fails
  return `Found "${keyword}" mentioned ${crossReferences.reduce((sum, ref) => sum + ref.mention_count, 0)} times across ${crossReferences.length} document(s). The keyword appears in various contexts throughout your documents.`;
}

// POST /api/cross-reference - Find all mentions across documents
router.post("/", protect, async (req, res) => {
  try {
    const { keyword, source_filters } = req.body;
    
    if (!keyword) {
      return res.status(400).json({ 
        success: false,
        error: "Keyword required" 
      });
    }

    if (!keyword.trim() || keyword.trim().length < 2) {
      return res.status(400).json({ 
        success: false,
        error: "Keyword must be at least 2 characters long" 
      });
    }

    const cleanKeyword = keyword.trim();
    console.log(`🔗 Cross-referencing "${cleanKeyword}" for user ${req.user.email}`);
    
    if (source_filters && source_filters.length > 0) {
      console.log(`📄 Searching in: ${source_filters.join(', ')}`);
    }

    const index = await initPinecone();
    
    // Generate keyword variations for better coverage
    const keywordVariations = generateKeywordVariations(cleanKeyword);
    console.log(`🔍 Searching for variations: ${keywordVariations.join(', ')}`);
    
    // Generate embedding for the main keyword
    const keywordEmbedding = await generateEmbedding(cleanKeyword);

    // Build filter
    const searchFilter = {
      user_id: req.user.id
    };
    
    if (source_filters && source_filters.length > 0) {
      searchFilter.source = { $in: source_filters };
    }

    // Search for all mentions with increased topK
    const queryResponse = await index.query({
      vector: keywordEmbedding,
      topK: 100, // Get many results to find all mentions
      includeMetadata: true,
      filter: searchFilter
    });

    console.log(`📊 Found ${queryResponse.matches.length} semantic matches`);

    if (queryResponse.matches.length === 0) {
      const noResultsMsg = source_filters && source_filters.length > 0
        ? `No mentions of "${cleanKeyword}" found in your selected documents: ${source_filters.join(', ')}`
        : `No mentions of "${cleanKeyword}" found in your uploaded documents`;
        
      return res.json({
        success: true,
        keyword: cleanKeyword,
        total_mentions: 0,
        documents_found: 0,
        cross_references: [],
        message: noResultsMsg,
        user: req.user.name
      });
    }

    // 🚀 Enhanced filtering: Check for keyword variations in text
    const relevantMatches = queryResponse.matches.filter(match => {
      const matchResults = findKeywordMatches(
        match.metadata.text, 
        cleanKeyword, 
        keywordVariations
      );
      
      if (matchResults.length > 0) {
        match.keywordMatches = matchResults; // Store for later use
        return true;
      }
      return false;
    });

    console.log(`✅ ${relevantMatches.length} confirmed mentions of "${cleanKeyword}"`);

    if (relevantMatches.length === 0) {
      return res.json({
        success: true,
        keyword: cleanKeyword,
        total_mentions: 0,
        documents_found: 0,
        cross_references: [],
        message: `No exact mentions of "${cleanKeyword}" found, though semantically similar content was detected. Try different keywords or variations.`,
        user: req.user.name
      });
    }

    // Group by source document with enhanced details
    const mentionsBySource = {};
    relevantMatches.forEach(match => {
      const source = match.metadata.source;
      if (!mentionsBySource[source]) {
        mentionsBySource[source] = [];
      }
      
      // Get the best keyword match context
      const primaryMatch = match.keywordMatches[0];
      
      mentionsBySource[source].push({
        chunk_index: match.metadata.chunk_index + 1,
        total_chunks: match.metadata.total_chunks,
        text: match.metadata.text,
        score: parseFloat(match.score.toFixed(3)),
        keywords: match.metadata.keywords || '',
        matched_variant: primaryMatch?.variant || cleanKeyword,
        context: primaryMatch?.context || match.metadata.text.substring(0, 300),
        occurrence_count: match.keywordMatches.length // How many times in this chunk
      });
    });

    // Sort mentions within each source by score
    Object.keys(mentionsBySource).forEach(source => {
      mentionsBySource[source].sort((a, b) => b.score - a.score);
    });

    // Create detailed summary
    const crossRefSummary = Object.entries(mentionsBySource).map(([source, mentions]) => ({
      source: source,
      mention_count: mentions.length,
      total_occurrences: mentions.reduce((sum, m) => sum + m.occurrence_count, 0),
      mentions: mentions.slice(0, 10), // Show top 10 per document
      top_score: mentions[0].score
    }));

    // Sort by mention count (most mentions first)
    crossRefSummary.sort((a, b) => b.mention_count - a.mention_count);

    // 🚀 Generate AI summary
    let aiSummary = null;
    try {
      console.log('🤖 Generating AI summary of cross-references...');
      aiSummary = await generateCrossReferenceSummary(cleanKeyword, crossRefSummary);
    } catch (summaryError) {
      console.log('⚠️ AI summary generation failed:', summaryError.message);
    }

    // Calculate statistics
    const totalMentions = relevantMatches.length;
    const totalOccurrences = crossRefSummary.reduce((sum, ref) => sum + ref.total_occurrences, 0);
    const documentsFound = Object.keys(mentionsBySource).length;

    res.json({
      success: true,
      keyword: cleanKeyword,
      variations_searched: keywordVariations,
      total_mentions: totalMentions,
      total_occurrences: totalOccurrences,
      documents_found: documentsFound,
      cross_references: crossRefSummary,
      ai_summary: aiSummary,
      statistics: {
        avg_mentions_per_doc: (totalMentions / documentsFound).toFixed(1),
        most_mentioned_in: crossRefSummary[0]?.source || 'N/A',
        highest_relevance_score: crossRefSummary[0]?.top_score || 0
      },
      searched_in: source_filters && source_filters.length > 0 
        ? source_filters.join(', ')
        : 'All documents',
      user: req.user.name
    });

  } catch (error) {
    console.error("❌ Error in cross-reference search:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      success: false,
      error: error.message,
      type: 'server_error'
    });
  }
});

module.exports = router;