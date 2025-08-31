require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function run() {
  try {
    // Correctly instantiate the client
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Correctly call the embedContent method directly from the genAI client
    const result = await genAI.getGenerativeModel({
      model: "text-embedding-004", // This line is for specifying the model
    }).embedContent({
      // 🚨 Correct input format
      content: {
        parts: [
          { text: "Hello world" }
        ]
      },
      // ✅ Best practice for RAG, to optimize the embedding
      taskType: "RETRIEVAL_DOCUMENT"
    });

    console.log("✅ Embedding vector length:", result.embedding.values.length);
    console.log(result.embedding.values.slice(0, 5)); // preview first 5 numbers
  } catch (err) {
    console.error("❌ Error generating embedding:", err);
  }
}

run();