// backend/routes/get-pdfs.js
const express = require("express");
const router = express.Router();
const { initPinecone } = require("../pinecone");
const { protect } = require("../middleware/auth"); // 🚀 Import auth middleware

// GET /api/get-uploaded-pdfs - 🚀 NOW PROTECTED WITH AUTH
router.get("/", protect, async (req, res) => {
  try {
    console.log(`📋 Fetching PDFs for user: ${req.user.email}`);
    
    const index = await initPinecone();
    
    // Query for vectors with PDF metadata FOR THIS USER ONLY
    const queryResponse = await index.query({
      vector: new Array(768).fill(0.1),
      topK: 10000,
      includeMetadata: true,
      filter: { 
        source_type: "pdf",
        user_id: req.user.id // 🚀 FILTER BY USER ID
      }
    });

    console.log(`📊 Found ${queryResponse.matches.length} PDF chunks for user ${req.user.email}`);

    // Extract unique PDF sources
    const pdfMap = new Map();
    
    queryResponse.matches.forEach(match => {
      if (match.metadata && match.metadata.source) {
        const filename = match.metadata.source;
        
        if (!pdfMap.has(filename)) {
          pdfMap.set(filename, {
            filename: filename,
            upload_date: match.metadata.upload_date || null,
            total_chunks: 0,
            file_size: match.metadata.file_size || null
          });
        }
        
        // Increment chunk count
        pdfMap.get(filename).total_chunks += 1;
      }
    });

    // Convert to array
    const pdfs = Array.from(pdfMap.values());

    // Sort by upload date (newest first)
    pdfs.sort((a, b) => {
      if (!a.upload_date) return 1;
      if (!b.upload_date) return -1;
      return new Date(b.upload_date) - new Date(a.upload_date);
    });

    console.log(`📋 Found ${pdfs.length} unique PDFs for ${req.user.email}:`, pdfs.map(p => p.filename));

    res.json({
      success: true,
      pdfs: pdfs,
      total_pdfs: pdfs.length,
      total_chunks: queryResponse.matches.length,
      user: req.user.name
    });

  } catch (err) {
    console.error("❌ Error fetching PDFs:", err);
    res.status(500).json({ 
      error: err.message,
      success: false 
    });
  }
});

module.exports = router;