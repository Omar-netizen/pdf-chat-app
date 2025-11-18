// src/App.js
import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './components/AuthPage';
import ProtectedRoute from './components/ProtectedRoute';
import ChatWindow from './components/ChatWindow';
import FileUploader from './components/FileUploader';
import './App.css';

// Main App Content (protected)
const AppContent = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* File Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FileUploader />
        
        {/* Quick Stats Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-lg">
          <h2 className="text-lg font-semibold mb-4 text-white">📊 Your Dashboard</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total PDFs:</span>
              <span className="text-white font-medium" id="pdf-count">Loading...</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Status:</span>
              <span className="text-green-400 font-medium">🟢 Ready to chat</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Last upload:</span>
              <span className="text-gray-400 text-sm">Check chat dropdown</span>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
            <p className="text-blue-200 text-sm">
              💡 <strong>Tip:</strong> Upload PDFs above, then use the chat below to ask questions about your documents!
            </p>
          </div>
        </div>
      </div>

      {/* Chat Section */}
      <ChatWindow />

      {/* Footer */}
      <div className="text-center text-gray-400 text-sm py-4">
        <p>🤖 AI-powered PDF chatbot with secure user authentication</p>
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