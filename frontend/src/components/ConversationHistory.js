// src/components/ConversationHistory.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const ConversationHistory = ({ onSelectConversation, currentConversationId, onNewConversation }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (id, e) => {
    e.stopPropagation();
    
    if (!window.confirm('Delete this conversation?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/conversations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setConversations(conversations.filter(c => c.id !== id));
        
        // If deleted conversation was active, start new one
        if (currentConversationId === id) {
          onNewConversation();
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Expose refresh function
  useEffect(() => {
    window.refreshConversationHistory = fetchConversations;
    return () => {
      delete window.refreshConversationHistory;
    };
  }, []);

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 shadow-lg h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-semibold text-lg">💬 Chat History</h3>
        <button
          onClick={onNewConversation}
          className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded-lg transition-colors"
          title="Start new conversation"
        >
          ➕ New
        </button>
      </div>

      {loading ? (
        <div className="text-gray-300 text-center py-8">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading...
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-gray-400 text-center py-8 text-sm">
          <div className="text-4xl mb-2">💭</div>
          No conversations yet.<br/>Start chatting to see history!
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-white/20 ${
                currentConversationId === conv.id 
                  ? 'bg-blue-500/30 border-2 border-blue-400' 
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-2">
                  <div className="text-white text-sm font-medium line-clamp-2 mb-1">
                    {conv.title}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>💬 {conv.messageCount} msg{conv.messageCount !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>{formatDate(conv.updatedAt)}</span>
                  </div>
                  {conv.selectedPdfs && conv.selectedPdfs.length > 0 && (
                    <div className="text-xs text-blue-300 mt-1">
                      📄 {conv.selectedPdfs.length} PDF{conv.selectedPdfs.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  {(conv.compareMode || conv.crossRefMode) && (
                    <div className="flex gap-1 mt-1">
                      {conv.compareMode && (
                        <span className="text-xs bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded">
                          ⚖️ Compare
                        </span>
                      )}
                      {conv.crossRefMode && (
                        <span className="text-xs bg-orange-500/30 text-orange-200 px-2 py-0.5 rounded">
                          🔗 Cross-Ref
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  title="Delete conversation"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-400">
        <div>👤 {user?.name}</div>
        <div>{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</div>
      </div>
    </div>
  );
};

export default ConversationHistory;