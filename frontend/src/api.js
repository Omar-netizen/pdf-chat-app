// src/api.js
import axios from "axios";

const API = axios.create({
  baseURL: `${process.env.REACT_APP_API_BASE_URL}/api`, // Uses deployed backend URL
  timeout: 600000,
});

// Upload PDF (FormData)
export const uploadPdf = (formData) =>
  API.post("/uploadpdf", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Chat (query) - Updated to accept object with query and optional source_filter
export const sendQuery = (queryData) => {
  // Handle both old string format and new object format for backward compatibility
  const payload = typeof queryData === 'string' 
    ? { query: queryData } 
    : queryData;
  
  return API.post("/chat-pinecone", payload);
};

// Get list of uploaded PDFs
export const getUploadedPdfs = () => API.get("/get-uploaded-pdfs");