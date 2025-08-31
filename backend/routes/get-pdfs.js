// backend/routes/get-pdfs.js
const express = require("express");
const router = express.Router();
const { initPinecone } = require("../pinecone");

// GET /api/get-uploaded-pdfs
router.get("/", async (req, res) => {
  try {
    console.log("📋 Fetching list of uploaded PDFs...");
    
    const index = await initPinecone();
    
    // Get index stats to see all namespaces and data
    const stats = await index.describeIndexStats();
    
    // Query for all vectors to get unique sources
    // We'll get a sample of vectors and extract unique PDF sources
    const queryResponse = await index.query({
      vector: new Array(768).fill(0), // Dummy vector to get all results
      topK: 1000, // Get many results to find all PDFs
      includeMetadata: true
    });

    // Extract unique PDF sources
    const pdfSources = new Set();
    
    queryResponse.matches.forEach(match => {
      if (match.metadata && match.metadata.source && match.metadata.source_type === 'pdf') {
        pdfSources.add(match.metadata.source);
      }
    });

    // Convert to array and add upload info
    const pdfs = Array.from(pdfSources).map(filename => {
      // Find a sample chunk to get upload info
      const sampleChunk = queryResponse.matches.find(
        match => match.metadata.source === filename
      );
      
      return {
        filename: filename,
        upload_date: sampleChunk?.metadata.upload_date || null,
        total_chunks: queryResponse.matches.filter(
          match => match.metadata.source === filename
        ).length
      };
    });

    // Sort by upload date (newest first)
    pdfs.sort((a, b) => {
      if (!a.upload_date) return 1;
      if (!b.upload_date) return -1;
      return new Date(b.upload_date) - new Date(a.upload_date);
    });

    console.log(`📋 Found ${pdfs.length} uploaded PDFs`);

    res.json({
      success: true,
      pdfs: pdfs,
      total_pdfs: pdfs.length,
      total_vectors: stats.totalRecordCount || 0
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