import React from "react";
import FileUploader from "./components/FileUploader";
import ChatWindow from "./components/ChatWindow";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-gray-900/20 to-transparent"></div>
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      {/* Glass morphism overlay */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
      
      <div className="relative z-10 p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Modern header with enhanced typography */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mb-6 shadow-2xl shadow-purple-500/25">
              <span className="text-3xl">📚</span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-4 leading-tight">
              PDF Chat Assistant
            </h1>
            
            <p className="text-xl text-gray-300/80 font-light max-w-2xl mx-auto leading-relaxed">
              Transform your documents into interactive conversations with our AI-powered assistant
            </p>
            
            {/* Subtle accent line */}
            <div className="w-24 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-6 rounded-full"></div>
          </div>
          
          {/* Modern card container */}
          <div className="space-y-8">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/20 hover:shadow-purple-500/5 transition-all duration-500">
              <FileUploader />
            </div>
            
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/20 hover:shadow-blue-500/5 transition-all duration-500">
              <ChatWindow />
            </div>
          </div>
          
          {/* Modern footer accent */}
          <div className="text-center mt-12 opacity-50">
            <div className="inline-flex items-center space-x-2 text-sm text-gray-400">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span>Powered by AI</span>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-500"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;