// src/App.js
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './components/AuthPage';
import ProtectedRoute from './components/ProtectedRoute';
import ChatWindow from './components/ChatWindow';
import FileUploader from './components/FileUploader';
import DashboardStats from './components/DashboardStats';
import ConversationHistory from './components/ConversationHistory'; // 🚀 Import
import './App.css';

// Main App Content (protected)
const AppContent = () => {
  const [currentConversationId, setCurrentConversationId] = useState(null);

  const handleSelectConversation = (conversationId) => {
    setCurrentConversationId(conversationId);
    if (window.chatWindowFunctions) {
      window.chatWindowFunctions.loadConversation(conversationId);
    }
  };

  const handleNewConversation = () => {
    if (window.chatWindowFunctions) {
      window.chatWindowFunctions.createNewConversation();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* File Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FileUploader />
        <DashboardStats />
      </div>

      {/* Chat Section with History Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Conversation History Sidebar */}
        <div className="lg:col-span-1">
          <ConversationHistory 
            onSelectConversation={handleSelectConversation}
            currentConversationId={currentConversationId}
            onNewConversation={handleNewConversation}
          />
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-3">
          <ChatWindow />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-400 text-sm py-4">
        <p>🤖 AI-powered PDF chatbot with conversation history & advanced features</p>
      </div>
    </div>
  );
};

// Router component that decides what to show
const AppRouter = () => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 shadow-lg text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Initializing AI PDF Chatbot...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Show protected app content if authenticated
  return (
    <ProtectedRoute>
      <AppContent />
    </ProtectedRoute>
  );
};

// Main App component
function App() {
  return (
    <AuthProvider>
      <div className="App">
        <AppRouter />
      </div>
    </AuthProvider>
  );
}

export default App;