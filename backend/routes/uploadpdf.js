const express = require("express");
const router = express.Router();
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { initPinecone } = require("../pinecone");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { protect } = require("../middleware/auth"); // 🚀 Import auth middleware

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Function to generate embeddings
async function generateEmbedding(text) {
  const result = await genAI.getGenerativeModel({ model: "text-embedding-004" })
    .embedContent({
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_DOCUMENT",
    });
  return result.embedding.values;
}

// 🚀 SMART CHUNKING - Preserves context and meaning
function smartChunking(text, chunkSize = 800, overlap = 100) {
  // Clean and normalize text
  const cleanedText = text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\.\!\?\;\:\,\-\(\)]/g, ' ')
    .trim();

  // Split by sentences first to preserve meaning
  const sentences = cleanedText.match(/[^\.!?]+[\.!?]+/g) || [cleanedText];
  
  const chunks = [];
  let currentChunk = '';
  let currentSentences = [];

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    // Check if adding this sentence would exceed chunk size
    if ((currentChunk + ' ' + trimmedSentence).length > chunkSize && currentChunk) {
      // Save current chunk
      chunks.push({
        text: currentChunk.trim(),
        sentences: [...currentSentences]
      });

      // Start new chunk with overlap
      const overlapSentences = currentSentences.slice(-Math.floor(overlap/100));
      currentSentences = [...overlapSentences, trimmedSentence];
      currentChunk = currentSentences.join(' ');
    } else {
      currentSentences.push(trimmedSentence);
      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
    }
  }

  // Add the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      sentences: currentSentences
    });
  }

  return chunks.filter(chunk => chunk.text.length > 50);
}

// 🚀 KEYWORD EXTRACTION for better metadata
function extractKeywords(text, maxKeywords = 10) {
  // Simple keyword extraction
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['that', 'this', 'with', 'have', 'they', 'been', 'their', 'said', 'each', 'which', 'will', 'from', 'would', 'there', 'could', 'other'].includes(word));

  // Count frequency
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  // Get top keywords
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

// 🚀 CONTENT TYPE DETECTION
function detectContentType(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('function') || lowerText.includes('class') || lowerText.includes('import')) {
    return 'code';
  } else if (lowerText.includes('step') || lowerText.includes('tutorial') || lowerText.includes('how to')) {
    return 'tutorial';
  } else if (lowerText.includes('definition') || lowerText.includes('means') || lowerText.includes('refers to')) {
    return 'definition';
  } else if (lowerText.includes('example') || lowerText.includes('for instance')) {
    return 'example';
  }
  return 'general';
}

//======================
// Enhanced Upload PDF route - 🚀 NOW PROTECTED WITH AUTH
// ======================
router.post("/", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "PDF file required" });
    }

    console.log(`📄 Processing PDF: ${req.file.originalname}`);
    const index = await initPinecone();

    // Parse PDF
    const pdfData = await pdfParse(req.file.buffer);
    const fullText = pdfData.text;

    if (!fullText || fullText.trim().length === 0) {
      return res.status(400).json({ error: "PDF contains no readable text" });
    }

    console.log(`📊 Extracted ${fullText.length} characters from PDF`);

    // 🚀 Smart chunking with overlap
    const chunks = smartChunking(fullText, 800, 150);
    console.log(`📦 Created ${chunks.length} smart chunks`);

    if (chunks.length === 0) {
      return res.status(400).json({ error: "Could not create meaningful chunks from PDF" });
    }

    // 🚀 Enhanced batch processing with rich metadata
    const batchSize = 5; // Smaller batches for better processing
    const fileName = req.file.originalname.replace(/[^a-zA-Z0-9]/g, '_');
    const uploadTimestamp = Date.now();
    
    let totalUploaded = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const vectors = [];

      for (let j = 0; j < batch.length; j++) {
        const chunkIndex = i + j;
        const chunkData = batch[j];
        
        try {
          const embedding = await generateEmbedding(chunkData.text);
          const keywords = extractKeywords(chunkData.text);
          const contentType = detectContentType(chunkData.text);
          
          vectors.push({
            id: `pdf_${fileName}_${chunkIndex}_${uploadTimestamp}`,
            values: embedding,
            metadata: {
              text: chunkData.text,
              source: req.file.originalname,
              source_type: 'pdf',
              user_id: req.user.id, // 🚀 ADD USER ID HERE
              user_email: req.user.email, // 🚀 ADD USER EMAIL FOR REFERENCE
              chunk_index: chunkIndex,
              total_chunks: chunks.length,
              content_type: contentType,
              keywords: keywords.join(', '),
              char_count: chunkData.text.length,
              sentence_count: chunkData.sentences.length,
              upload_date: new Date().toISOString(),
              file_size: req.file.size
            }
          });
          
        } catch (embeddingError) {
          console.error(`❌ Error generating embedding for chunk ${chunkIndex}:`, embeddingError);
          continue; // Skip this chunk and continue with others
        }
      }

      if (vectors.length > 0) {
        await index.upsert(vectors);
        totalUploaded += vectors.length;
        console.log(`✅ Uploaded batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)} (${vectors.length} chunks)`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    res.json({
      success: true,
      message: `PDF uploaded and indexed successfully for ${req.user.name}!`,
      filename: req.file.originalname,
      chunks_created: chunks.length,
      chunks_uploaded: totalUploaded,
      totalCharacters: fullText.length,
      fileSize: req.file.size,
      user: req.user.name
    });

  } catch (err) {
    console.error("❌ Error uploading PDF:", err);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
    }
    
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;