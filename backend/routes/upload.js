// backend/routes/upload.js
const express = require("express");
const router = express.Router();
const { initPinecone } = require("../pinecone");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to generate embeddings (768 dimensions)
async function generateEmbedding(text) {
  const result = await genAI.getGenerativeModel({ model: "text-embedding-004" })
    .embedContent({
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_DOCUMENT",
    });
  
  const embedding = result.embedding.values;
  console.log(`Generated embedding dimension: ${embedding.length}`);
  return embedding;
}

// POST /api/upload
router.post("/", async (req, res) => {
  try {
    const { text, id } = req.body;
    if (!text || !id) return res.status(400).json({ error: "text and id required" });

    const embedding = await generateEmbedding(text);

    // Get the index from initPinecone
    const index = await initPinecone();

    // Upsert the vector to Pinecone
    await index.upsert([
      {
        id: id,
        values: embedding,
        metadata: { text }
      }
    ]);

    res.json({ success: true, message: "Text uploaded to Pinecone!" });
  } catch (err) {
    console.error("❌ Error uploading:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;