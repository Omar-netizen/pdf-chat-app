// src/components/FileUploader.js
import React, { useState } from "react";
import { uploadPdf } from "../api";
import { useAuth } from "../context/AuthContext"; // 🚀 Import auth context

export default function FileUploader() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const { user } = useAuth(); // 🚀 Get user info

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus({ type: "error", text: "Please choose a PDF file first." });
      return;
    }
    setUploading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      console.log(`📤 Uploading: ${file.name}`);
      const res = await uploadPdf(formData);
      
      // Enhanced success message with upload details
      const uploadData = res.data;
      const successMessage = uploadData.success 
        ? `✅ ${uploadData.filename} uploaded successfully! (${uploadData.chunks_uploaded} chunks created)`
        : res.data?.message || "Uploaded";

      setStatus({ 
        type: "success", 
        text: successMessage,
        details: uploadData
      });

      // 🚀 Refresh the PDF list in ChatWindow
      if (window.refreshChatPdfList) {
        console.log("🔄 Refreshing PDF list in chat...");
        window.refreshChatPdfList();
      }

    } catch (err) {
      console.error("Upload error:", err);
      setStatus({
        type: "error",
        text: err?.response?.data?.error || err.message || "Upload failed",
      });
    } finally {
      setUploading(false);
      setFile(null);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">📄 Upload PDF</h2>
        <div className="text-sm text-gray-300">
          👤 {user?.name}'s Library
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500 file:text-white file:cursor-pointer hover:file:bg-blue-600"
          />
          <button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            {uploading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {uploading ? "Processing..." : "Upload PDF"}
          </button>
        </div>

        {/* File preview */}
        {file && !uploading && (
          <div className="bg-white/5 p-3 rounded-lg border border-white/10">
            <div className="text-sm text-gray-300">
              📄 Selected: <span className="text-white font-medium">{file.name}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Size: {(file.size / 1024 / 1024).toFixed(2)} MB • Will be added to {user?.name}'s library
            </div>
          </div>
        )}

        {status && (
          <div className={`p-4 rounded-lg text-sm ${
            status.type === "success" 
              ? "bg-green-500/20 text-green-200 border border-green-500/30" 
              : "bg-red-500/20 text-red-200 border border-red-500/30"
          }`}>
            <div className="font-medium">{status.text}</div>
            
            {/* Enhanced success details */}
            {status.type === "success" && status.details && (
              <div className="mt-2 text-xs opacity-80 space-y-1">
                {status.details.chunks_created && (
                  <div>📦 Chunks created: {status.details.chunks_created}</div>
                )}
                {status.details.totalCharacters && (
                  <div>📊 Characters processed: {status.details.totalCharacters.toLocaleString()}</div>
                )}
                {status.details.fileSize && (
                  <div>📏 File size: {(status.details.fileSize / 1024 / 1024).toFixed(2)} MB</div>
                )}
                <div className="text-blue-200 mt-2">
                  💡 Perfect! You can now ask questions about this PDF in your personal chat below!
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}