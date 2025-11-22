// src/components/DashboardStats.js
import React, { useState, useEffect } from 'react';
import { getUploadedPdfs } from '../api';
import { useAuth } from '../context/AuthContext';

const DashboardStats = () => {
  const [stats, setStats] = useState({
    totalPdfs: 0,
    totalChunks: 0,
    loading: true
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await getUploadedPdfs();
      if (response.data.success) {
        setStats({
          totalPdfs: response.data.total_pdfs,
          totalChunks: response.data.total_chunks,
          loading: false
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  // Expose refresh function for FileUploader
  useEffect(() => {
    window.refreshDashboardStats = fetchStats;
    return () => {
      delete window.refreshDashboardStats;
    };
  }, []);

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">📊 Your Dashboard</h2>
        <div className="text-sm text-gray-300">
          👤 {user?.name}
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
            <div className="text-blue-200 text-sm font-medium">Total PDFs</div>
            <div className="text-white text-2xl font-bold">
              {stats.loading ? '...' : stats.totalPdfs}
            </div>
          </div>
          
          <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
            <div className="text-green-200 text-sm font-medium">Text Chunks</div>
            <div className="text-white text-2xl font-bold">
              {stats.loading ? '...' : stats.totalChunks}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Account Status:</span>
            <span className="text-green-400 font-medium">🟢 Active</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">AI Model:</span>
            <span className="text-blue-400 font-medium">🤖 Gemini</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Storage:</span>
            <span className="text-purple-400 font-medium">☁️ Pinecone</span>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/30">
          <p className="text-purple-200 text-sm">
            💡 <strong>Pro Tip:</strong> Upload PDFs above, then use the chat below to ask intelligent questions about your documents!
          </p>
        </div>

        {stats.totalPdfs === 0 && !stats.loading && (
          <div className="mt-4 p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
            <p className="text-yellow-200 text-sm">
              🚀 <strong>Get Started:</strong> Upload your first PDF to begin chatting with your documents!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardStats;