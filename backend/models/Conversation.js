// backend/models/Conversation.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'bot'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  confidence: Number,
  sources: [String],
  searchedIn: String,
  citations: [{
    id: Number,
    source: String,
    chunk_index: Number,
    total_chunks: Number,
    text_preview: String,
    confidence: String,
    keywords: String,
    content_type: String
  }],
  comparison: [{
    source: String,
    content: String,
    score: Number
  }],
  crossReference: {
    keyword: String,
    total_mentions: Number,
    documents_found: Number,
    cross_references: [{
      source: String,
      mention_count: Number,
      mentions: [{
        chunk_index: Number,
        total_chunks: Number,
        text: String,
        score: String,
        keywords: String
      }]
    }]
  },
  type: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const conversationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    default: 'New Conversation'
  },
  messages: [messageSchema],
  selectedPdfs: [String],
  compareMode: {
    type: Boolean,
    default: false
  },
  crossRefMode: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isArchived: {
    type: Boolean,
    default: false
  }
});

// Update the updatedAt timestamp before saving
conversationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Generate title from first user message if not set
conversationSchema.methods.generateTitle = function() {
  if (this.title === 'New Conversation' && this.messages.length > 0) {
    const firstUserMsg = this.messages.find(m => m.sender === 'user');
    if (firstUserMsg) {
      // Take first 50 chars of first message as title
      this.title = firstUserMsg.text.substring(0, 50) + (firstUserMsg.text.length > 50 ? '...' : '');
    }
  }
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;