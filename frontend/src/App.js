// src/App.js
import React from "react";
import FileUploader from "./components/FileUploader";
import ChatWindow from "./components/ChatWindow";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            📚 PDF Chat Assistant
          </h1>
          <p className="text-gray-300">Chat with your documents using AI</p>
        </div>
        
        <div className="space-y-6">
          <FileUploader />
          <ChatWindow />
        </div>
      </div>
    </div>
  );
}

export default App;