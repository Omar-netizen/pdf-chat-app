// src/components/ChatWindow.js
import React, { useEffect, useRef, useState } from "react";
import { sendQuery, getUploadedPdfs } from "../api";
import { useAuth } from "../context/AuthContext"; // 🚀 Import auth context

export default function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfs, setPdfs] = useState([]);
  const [selectedPdf, setSelectedPdf] = useState("all");
  const [loadingPdfs, setLoadingPdfs] = useState(true);
  const listRef = useRef(null);
  
  const { user } = useAuth(); // 🚀 Get user info

  // Fetch uploaded PDFs on component mount
  useEffect(() => {
    fetchUploadedPdfs();
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchUploadedPdfs = async () => {
    try {
      setLoadingPdfs(true);
      console.log('🔍 Fetching uploaded PDFs...');
      
      // Use the API helper function
      const response = await getUploadedPdfs();
      console.log('📡 Response received:', response.status);
      
      const data = response.data;
      console.log('📋 PDF data received:', data);
      
      if (data.success) {
        setPdfs(data.pdfs);
        console.log(`📋 Loaded ${data.pdfs.length} PDFs:`, data.pdfs.map(p => p.filename));
      } else {
        console.error('❌ Failed to load PDFs:', data.error);
      }
    } catch (error) {
      console.error('❌ Error fetching PDFs:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
    } finally {
      setLoadingPdfs(false);
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg = { sender: "user", text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Prepare query with optional PDF filter
      const queryData = { query: trimmed };
      if (selectedPdf !== "all") {
        queryData.source_filter = selectedPdf;
      }

      const res = await sendQuery(queryData);
      const answer = res.data?.answer ?? "Sorry, no answer.";
      const confidence = res.data?.confidence;
      const sources = res.data?.sources;
      const searchedIn = res.data?.searched_in;
      
      const botMsg = { 
        sender: "bot", 
        text: answer, 
        confidence,
        sources,
        searchedIn
      };
      setMessages((m) => [...m, botMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((m) => [
        ...m,
        { sender: "bot", text: "Error getting response. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePdfChange = (e) => {
    setSelectedPdf(e.target.value);
    console.log(`🎯 Selected: ${e.target.value === "all" ? "All Documents" : e.target.value}`);
  };

  // Function to refresh PDF list (call this from FileUploader)
  const refreshPdfList = () => {
    fetchUploadedPdfs();
  };

  // Expose refresh function to parent components
  useEffect(() => {
    window.refreshChatPdfList = refreshPdfList;
    return () => {
      delete window.refreshChatPdfList;
    };
  }, []);

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">💬 Chat with your PDFs</h2>
        <div className="text-sm text-gray-300">
          👤 {user?.name}
        </div>
      </div>

      {/* PDF Selection Dropdown */}
      <div className="mb-4">
        <label className="block text-white text-sm font-medium mb-2">
          Search in:
        </label>
        <select
          value={selectedPdf}
          onChange={handlePdfChange}
          disabled={loadingPdfs}
          className="w-full p-3 border border-white/20 rounded-lg bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
        >
          <option value="all">🌐 All Your Documents ({pdfs.length} PDFs)</option>
          {pdfs.map((pdf, index) => (
            <option key={index} value={pdf.filename}>
              📄 {pdf.filename} ({pdf.total_chunks} chunks)
            </option>
          ))}
        </select>
        
        {loadingPdfs && (
          <div className="text-xs text-gray-300 mt-1">Loading PDFs...</div>
        )}
        
        {!loadingPdfs && pdfs.length === 0 && (
          <div className="text-xs text-gray-300 mt-1">No PDFs uploaded yet</div>
        )}
        
        {selectedPdf !== "all" && (
          <div className="text-xs text-blue-200 mt-1">
            🎯 Searching only in: {selectedPdf} (from your library)
          </div>
        )}
      </div>

      <div
        ref={listRef}
        className="h-96 overflow-y-auto p-4 mb-4 border border-white/10 rounded-lg bg-black/20"
      >
        {messages.length === 0 && (
          <div className="text-gray-400 text-center py-8">
            {pdfs.length > 0 
              ? `Hi ${user?.name}! Ask something about your ${pdfs.length} uploaded PDF${pdfs.length > 1 ? 's' : ''}...`
              : `Hi ${user?.name}! Upload some PDFs first, then ask questions about them...`
            }
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`mb-3 flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`${
              m.sender === "user" 
                ? "bg-blue-500 text-white" 
                : "bg-white/90 text-gray-900"
            } max-w-[80%] px-4 py-3 rounded-xl shadow-sm`}>
              <div className="whitespace-pre-wrap">{m.text}</div>
              
              {/* Enhanced bot message info */}
              {m.sender === "bot" && (
                <div className="text-xs opacity-70 mt-2 border-t border-gray-300 pt-2">
                  {m.confidence !== undefined && (
                    <div>📊 Confidence: {Number(m.confidence).toFixed(3)}</div>
                  )}
                  {m.searchedIn && (
                    <div>🔍 Searched in: {m.searchedIn}</div>
                  )}
                  {m.sources && m.sources.length > 0 && (
                    <div>📄 Sources: {m.sources.join(', ')}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-white/90 px-4 py-3 rounded-xl shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-gray-600 text-sm">
                  {selectedPdf === "all" 
                    ? `Searching your ${pdfs.length} documents...` 
                    : `Searching ${selectedPdf}...`
                  }
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          className="flex-1 p-3 border border-white/20 rounded-lg resize-none bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-500"
          placeholder={`Ask about ${selectedPdf === "all" ? "your documents" : selectedPdf}...`}
        />
        <button
          onClick={handleSend}
          disabled={loading || (pdfs.length === 0)}
          className="px-6 py-3 bg-green-600 text-white rounded-lg disabled:opacity-60 hover:bg-green-700 transition-colors"
        >
          {loading ? "Searching..." : "Send"}
        </button>
      </div>
    </div>
  );
}