// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000', // Local development
    'https://pdf-chat-app-two.vercel.app/' // Your Vercel domain
  ],
  credentials: true
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('📊 MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth')); // 🚀 NEW: Auth routes
app.use('/api/upload', require('./routes/upload'));
app.use('/api/uploadpdf', require('./routes/uploadpdf'));
app.use('/api/chat-pinecone', require('./routes/chatPinecone'));
app.use('/api/get-uploaded-pdfs', require('./routes/get-pdfs'));
app.use('/api/cross-reference', require('./routes/cross-reference'));
app.use('/api/conversations', require('./routes/conversations'));

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: '🤖 AI PDF Chatbot API is running!',
    status: 'active',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Something went wrong!' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found' 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});