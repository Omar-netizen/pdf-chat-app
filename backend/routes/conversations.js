// backend/routes/conversations.js
const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const { protect } = require('../middleware/auth');

// @desc    Get all conversations for user
// @route   GET /api/conversations
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({ 
      user_id: req.user.id,
      isArchived: false 
    })
    .select('title createdAt updatedAt messages selectedPdfs compareMode crossRefMode')
    .sort({ updatedAt: -1 })
    .limit(50);

    // Add message count to each conversation
    const conversationsWithCount = conversations.map(conv => ({
      id: conv._id,
      title: conv.title,
      messageCount: conv.messages.length,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      selectedPdfs: conv.selectedPdfs,
      compareMode: conv.compareMode,
      crossRefMode: conv.crossRefMode
    }));

    res.json({
      success: true,
      conversations: conversationsWithCount,
      total: conversations.length
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations'
    });
  }
});

// @desc    Get single conversation by ID
// @route   GET /api/conversations/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      user_id: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      conversation: conversation
    });

  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation'
    });
  }
});

// @desc    Create new conversation
// @route   POST /api/conversations
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { title, selectedPdfs, compareMode, crossRefMode } = req.body;

    const conversation = await Conversation.create({
      user_id: req.user.id,
      title: title || 'New Conversation',
      selectedPdfs: selectedPdfs || [],
      compareMode: compareMode || false,
      crossRefMode: crossRefMode || false,
      messages: []
    });

    console.log(`✅ Created conversation ${conversation._id} for user ${req.user.email}`);

    res.status(201).json({
      success: true,
      conversation: conversation
    });

  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation'
    });
  }
});

// @desc    Add message to conversation
// @route   POST /api/conversations/:id/messages
// @access  Private
router.post('/:id/messages', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      user_id: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message required'
      });
    }

    // Add message to conversation
    conversation.messages.push(message);

    // Auto-generate title from first message if needed
    if (conversation.messages.length === 1) {
      conversation.generateTitle();
    }

    await conversation.save();

    res.json({
      success: true,
      conversation: conversation
    });

  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add message'
    });
  }
});

// @desc    Update conversation settings
// @route   PATCH /api/conversations/:id
// @access  Private
router.patch('/:id', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      user_id: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    const { title, selectedPdfs, compareMode, crossRefMode } = req.body;

    if (title !== undefined) conversation.title = title;
    if (selectedPdfs !== undefined) conversation.selectedPdfs = selectedPdfs;
    if (compareMode !== undefined) conversation.compareMode = compareMode;
    if (crossRefMode !== undefined) conversation.crossRefMode = crossRefMode;

    await conversation.save();

    res.json({
      success: true,
      conversation: conversation
    });

  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update conversation'
    });
  }
});

// @desc    Delete conversation
// @route   DELETE /api/conversations/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      user_id: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Soft delete - archive instead of removing
    conversation.isArchived = true;
    await conversation.save();

    console.log(`🗑️ Archived conversation ${conversation._id} for user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete conversation'
    });
  }
});

// @desc    Clear all messages in conversation
// @route   POST /api/conversations/:id/clear
// @access  Private
router.post('/:id/clear', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      user_id: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    conversation.messages = [];
    conversation.title = 'New Conversation';
    await conversation.save();

    res.json({
      success: true,
      message: 'Conversation cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear conversation'
    });
  }
});

module.exports = router;