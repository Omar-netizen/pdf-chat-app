// backend/utils/gemini.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getEmbedding(text) {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" }); // embedding model
  const result = await model.embedContent(text);
  return result.embedding.values; // array of floats
}

module.exports = { getEmbedding };
