// src/components/ProtectedRoute.js
import React from 'react';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 shadow-lg text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render children (App.js will handle showing login)
  if (!isAuthenticated) {
    return null;
  }

  // If authenticated, render the protected content
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* User Info Bar */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">🤖 AI PDF Chatbot</h1>
            <span className="text-gray-300">|</span>
            <span className="text-gray-300">Welcome, {user?.name}!</span>
          </div>
          <UserMenu />
        </div>
      </div>

      {/* Protected Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

// User Menu Component
const UserMenu = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="text-right">
        <p className="text-white font-medium">{user?.name}</p>
        <p className="text-gray-400 text-sm">{user?.email}</p>
      </div>
      <button
        onClick={handleLogout}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
      >
        <span>🚪</span>
        <span>Logout</span>
      </button>
    </div>
  );
};

export default ProtectedRoute;