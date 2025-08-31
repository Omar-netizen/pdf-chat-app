const express = require("express");
const cors = require("cors");

require("dotenv").config();

const uploadRoutes = require("./routes/upload");
const chatRoutes = require("./routes/chatPinecone");
const uploadPdfRoutes = require("./routes/uploadpdf");
const getPdfsRoutes = require("./routes/get-pdfs");


const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/upload", uploadRoutes);
app.use("/api/chat-pinecone", chatRoutes);
app.use("/api/uploadpdf", uploadPdfRoutes);
app.use("/api/get-uploaded-pdfs", getPdfsRoutes);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
