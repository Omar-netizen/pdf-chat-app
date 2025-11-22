// src/components/ChatWindow.js
import React, { useEffect, useRef, useState } from "react";
import { sendQuery, getUploadedPdfs } from "../api";
import { useAuth } from "../context/AuthContext"; // 🚀 Import auth context

export default function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfs, setPdfs] = useState([]);
  const [selectedPdfs, setSelectedPdfs] = useState([]); // 🚀 Changed to array for multi-select
  const [loadingPdfs, setLoadingPdfs] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversationTitle, setConversationTitle] = useState("New Conversation");
  const [compareMode, setCompareMode] = useState(false);
  const [crossRefMode, setCrossRefMode] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const listRef = useRef(null);
  
  const { user } = useAuth(); // 🚀 Get user info

  // Fetch uploaded PDFs on component mount
  useEffect(() => {
    fetchUploadedPdfs();
    createNewConversation(); // 🚀 Create initial conversation
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // 🚀 Create new conversation
  const createNewConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'New Conversation',
          selectedPdfs: [],
          compareMode: false,
          crossRefMode: false
        })
      });

      const data = await response.json();
      if (data.success) {
        setCurrentConversationId(data.conversation._id);
        setConversationTitle(data.conversation.title);
        setMessages([]);
        setSelectedPdfs([]);
        setCompareMode(false);
        setCrossRefMode(false);
        console.log(`✅ Created new conversation: ${data.conversation._id}`);
        
        // Refresh conversation history
        if (window.refreshConversationHistory) {
          window.refreshConversationHistory();
        }
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  // 🚀 Load existing conversation
  const loadConversation = async (conversationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/conversations/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        const conv = data.conversation;
        setCurrentConversationId(conv._id);
        setConversationTitle(conv.title);
        setMessages(conv.messages || []);
        setSelectedPdfs(conv.selectedPdfs || []);
        setCompareMode(conv.compareMode || false);
        setCrossRefMode(conv.crossRefMode || false);
        console.log(`📖 Loaded conversation: ${conv.title}`);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  // 🚀 Save message to conversation
  const saveMessageToConversation = async (message) => {
    if (!currentConversationId) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/conversations/${currentConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message })
      });

      // Update conversation settings
      await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/conversations/${currentConversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          selectedPdfs,
          compareMode,
          crossRefMode
        })
      });

      // Refresh conversation history
      if (window.refreshConversationHistory) {
        window.refreshConversationHistory();
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

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
      // Prepare query with optional multi-PDF filter
      const queryData = { 
        query: trimmed,
        compare_mode: compareMode // 🚀 Include compare mode flag
      };
      
      // Handle multiple PDF selection
      if (selectedPdfs.length > 0) {
        queryData.source_filters = selectedPdfs;
      }

      const res = await sendQuery(queryData);
      const answer = res.data?.answer ?? "Sorry, no answer.";
      const confidence = res.data?.confidence;
      const sources = res.data?.sources;
      const searchedIn = res.data?.searched_in;
      const comparison = res.data?.comparison; // 🚀 Comparison data
      
      const botMsg = { 
        sender: "bot", 
        text: answer, 
        confidence,
        sources,
        searchedIn,
        comparison // 🚀 Include comparison data
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

  // 🚀 Handle multi-select PDF checkbox changes
  const handlePdfToggle = (filename) => {
    setSelectedPdfs(prev => {
      if (prev.includes(filename)) {
        // Remove if already selected
        return prev.filter(f => f !== filename);
      } else {
        // Add if not selected
        return [...prev, filename];
      }
    });
  };

  // 🚀 Select/Deselect all PDFs
  const handleSelectAll = () => {
    if (selectedPdfs.length === pdfs.length) {
      // Deselect all
      setSelectedPdfs([]);
    } else {
      // Select all
      setSelectedPdfs(pdfs.map(pdf => pdf.filename));
    }
  };

  const handlePdfChange = (e) => {
    setSelectedPdf(e.target.value);
    console.log(`🎯 Selected: ${e.target.value === "all" ? "All Documents" : e.target.value}`);
  };

  // Expose functions for ConversationHistory component
  useEffect(() => {
    window.chatWindowFunctions = {
      loadConversation,
      createNewConversation
    };
    return () => {
      delete window.chatWindowFunctions;
    };
  }, []);

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
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">💬 {conversationTitle}</h2>
          {currentConversationId && (
            <button
              onClick={createNewConversation}
              className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition-colors"
              title="Start new conversation"
            >
              ➕ New Chat
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* 🚀 Citations Toggle */}
          <button
            onClick={() => setShowCitations(!showCitations)}
            className={`text-xs px-3 py-1 rounded-lg transition-colors ${
              showCitations 
                ? 'bg-blue-600 text-white' 
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
            title="Toggle detailed citations"
          >
            {showCitations ? '🔗 Citations ON' : '🔗 Citations'}
          </button>
          <div className="text-sm text-gray-300">
            👤 {user?.name}
          </div>
        </div>
      </div>

      {/* 🚀 Multi-PDF Selection */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-white text-sm font-medium">
            📚 Select PDFs to search:
          </label>
          <div className="flex gap-2">
            {/* 🚀 Cross-Reference Mode Toggle */}
            <button
              onClick={() => {
                setCrossRefMode(!crossRefMode);
                if (!crossRefMode) setCompareMode(false); // Disable compare when enabling cross-ref
              }}
              className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                crossRefMode 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
              title="Find all mentions of a keyword across documents"
            >
              {crossRefMode ? '🔗 Cross-Ref ON' : '🔗 Cross-Reference'}
            </button>
            {/* 🚀 Compare Mode Toggle */}
            <button
              onClick={() => {
                setCompareMode(!compareMode);
                if (!compareMode) setCrossRefMode(false); // Disable cross-ref when enabling compare
              }}
              disabled={selectedPdfs.length < 2}
              className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                compareMode 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              } ${selectedPdfs.length < 2 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={selectedPdfs.length < 2 ? 'Select 2+ PDFs to enable compare mode' : 'Toggle compare mode'}
            >
              {compareMode ? '🔍 Compare Mode ON' : '⚖️ Compare Mode'}
            </button>
            <button
              onClick={handleSelectAll}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              {selectedPdfs.length === pdfs.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        {/* 🚀 Cross-Reference Mode Info Banner */}
        {crossRefMode && (
          <div className="mb-2 p-2 bg-orange-500/20 rounded-lg border border-orange-500/30">
            <p className="text-orange-200 text-xs">
              🔗 <strong>Cross-Reference Mode Active:</strong> Enter a keyword to find ALL mentions across your selected documents. Example: "neural networks", "pricing", "methodology"
            </p>
          </div>
        )}
        
        {/* 🚀 Compare Mode Info Banner */}
        {compareMode && selectedPdfs.length >= 2 && (
          <div className="mb-2 p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
            <p className="text-purple-200 text-xs">
              ⚖️ <strong>Compare Mode Active:</strong> Ask comparison questions like "What are the differences?", "Compare pricing", "Which document mentions X more?"
            </p>
          </div>
        )}

        {loadingPdfs ? (
          <div className="text-xs text-gray-300">Loading PDFs...</div>
        ) : pdfs.length === 0 ? (
          <div className="text-xs text-gray-300 p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
            No PDFs uploaded yet. Upload some PDFs above to get started!
          </div>
        ) : (
          <>
            {/* PDF Checkboxes */}
            <div className="max-h-48 overflow-y-auto p-3 bg-white/5 rounded-lg border border-white/10 space-y-2">
              {pdfs.map((pdf, index) => (
                <label
                  key={index}
                  className="flex items-center space-x-3 p-2 hover:bg-white/10 rounded cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedPdfs.includes(pdf.filename)}
                    onChange={() => handlePdfToggle(pdf.filename)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-white text-sm">{pdf.filename}</div>
                    <div className="text-gray-400 text-xs">
                      {pdf.total_chunks} chunks
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* Selection Summary */}
            <div className="mt-2 text-sm">
              {selectedPdfs.length === 0 ? (
                <div className="text-blue-200 bg-blue-500/20 p-2 rounded border border-blue-500/30">
                  🌐 Searching ALL {pdfs.length} documents
                </div>
              ) : (
                <div className={`p-2 rounded border ${
                  compareMode 
                    ? 'text-purple-200 bg-purple-500/20 border-purple-500/30' 
                    : 'text-green-200 bg-green-500/20 border-green-500/30'
                }`}>
                  {compareMode ? '⚖️ Comparing' : '🎯 Searching'} {selectedPdfs.length} selected document{selectedPdfs.length > 1 ? 's' : ''}: 
                  <span className="font-medium ml-1">
                    {selectedPdfs.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </>
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
              
              {/* 🚀 Cross-Reference Results Display */}
              {m.type === "cross_reference" && m.crossReference ? (
                <div className="space-y-3">
                  <div className="font-bold text-lg text-orange-700">
                    🔗 Cross-Reference Results for "{m.crossReference.keyword}"
                  </div>
                  
                  <div className="text-sm bg-orange-50 p-2 rounded border border-orange-200">
                    <div className="font-semibold">📊 Summary:</div>
                    <div>✅ Found <strong>{m.crossReference.total_mentions}</strong> mentions</div>
                    <div>📄 Across <strong>{m.crossReference.documents_found}</strong> document(s)</div>
                  </div>

                  {m.crossReference.cross_references.map((ref, idx) => (
                    <div key={idx} className="border border-orange-200 rounded p-3 bg-orange-50">
                      <div className="font-semibold text-orange-800 mb-2">
                        📄 {ref.source} ({ref.mention_count} mention{ref.mention_count > 1 ? 's' : ''})
                      </div>
                      <div className="space-y-2">
                        {ref.mentions.map((mention, mIdx) => (
                          <div key={mIdx} className="bg-white p-2 rounded text-xs border border-gray-200">
                            <div className="text-gray-600 mb-1">
                              📍 Section {mention.chunk_index}/{mention.total_chunks}
                            </div>
                            <div className="italic text-gray-800">
                              "{mention.text.substring(0, 200)}..."
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{m.text}</div>
              )}
              
              {/* Regular message content continues... */}
              {m.sender === "bot" && !m.crossReference && (
                <>
              {/* 🚀 Citations Display */}
              {m.citations && showCitations && m.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <div className="text-sm font-semibold mb-2 text-blue-700 flex items-center gap-2">
                    🔗 References & Citations
                    <span className="text-xs font-normal text-gray-600">
                      ({m.citations.length} source{m.citations.length > 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {m.citations.map((citation, idx) => (
                      <div key={idx} className="p-2 bg-blue-50 rounded border border-blue-200">
                        <div className="flex items-start gap-2">
                          <div className="bg-blue-600 text-white text-xs font-bold rounded px-2 py-1 min-w-[28px] text-center">
                            [{citation.id}]
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-xs text-blue-800 mb-1">
                              📄 {citation.source}
                            </div>
                            <div className="text-xs text-gray-600 mb-1">
                              📍 Section {citation.chunk_index} of {citation.total_chunks}
                              {citation.keywords && citation.keywords !== 'N/A' && (
                                <span className="ml-2">
                                  🏷️ {citation.keywords.split(',').slice(0, 3).join(', ')}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-700 italic bg-white p-2 rounded">
                              "{citation.text_preview}"
                            </div>
                            {citation.confidence && (
                              <div className="text-xs text-gray-500 mt-1">
                                ⭐ Relevance: {(citation.confidence * 100).toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-gray-600 italic">
                    💡 Click citation numbers [1], [2], etc. in the answer to see full context
                  </div>
                </div>
              )}
              
              {/* 🚀 Comparison Data Display */}
              {m.sender === "bot" && m.comparison && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <div className="text-sm font-semibold mb-2 text-purple-700">
                    📊 Detailed Comparison:
                  </div>
                  {m.comparison.map((item, idx) => (
                    <div key={idx} className="mb-2 p-2 bg-gray-100 rounded">
                      <div className="font-medium text-xs text-blue-600">
                        📄 {item.source}
                      </div>
                      <div className="text-xs mt-1">{item.content}</div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Enhanced bot message info */}
              {m.confidence !== undefined && (
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
                </>
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
                  {selectedPdfs.length === 0
                    ? `Searching all ${pdfs.length} documents...` 
                    : `Searching ${selectedPdfs.length} selected document${selectedPdfs.length > 1 ? 's' : ''}...`
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
          placeholder={
            crossRefMode
              ? "Enter keyword to find all mentions (e.g., 'pricing', 'methodology')..."
              : compareMode && selectedPdfs.length >= 2
              ? `Compare: "${selectedPdfs.join('" vs "')}"...`
              : selectedPdfs.length === 0 
              ? "Ask about all your documents..." 
              : `Ask about ${selectedPdfs.length} selected document${selectedPdfs.length > 1 ? 's' : ''}...`
          }
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