// src/api.js
import axios from "axios";

const API = axios.create({
  baseURL: `${process.env.REACT_APP_API_BASE_URL}/api`,
  timeout: 600000,
});

// 🚀 Add token to all requests
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 🚀 Handle auth errors globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Upload PDF (FormData) - Now automatically includes auth token
export const uploadPdf = (formData) =>
  API.post("/uploadpdf", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Chat (query) - Now automatically includes auth token
export const sendQuery = (queryData) => {
  const payload = typeof queryData === 'string' 
    ? { query: queryData } 
    : queryData;
  
  return API.post("/chat-pinecone", payload);
};

// Get list of uploaded PDFs - Now automatically includes auth token
export const getUploadedPdfs = () => API.get("/get-uploaded-pdfs");