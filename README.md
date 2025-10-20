📄 PDF Chat App

An AI-powered chat application that allows users to upload PDF files and ask questions about their content. The app extracts and embeds the document’s text, enabling a smooth conversational experience with the PDF using advanced LLMs.

✨ Features

📂 Upload a PDF and extract its text.

💬 Chat with your PDF using AI-powered responses.

⚡ Real-time Q&A with contextual understanding.

🔍 Vector embeddings for semantic search.

🔐 Secure backend APIs with Node.js + Express.

🌐 Frontend built with React.js (deployed on Vercel).

☁️ Backend hosted on Render.

(Planned) 🖼️ OCR support for image-based PDFs.

🛠️ Tech Stack

Frontend:

React.js

Axios

Tailwind CSS

Backend:

Node.js + Express

gemini-embedding-001

Pinecone

Multer (for file uploads)

Deployment:

Frontend → Vercel

Backend → Render

🚀 Getting Started
1. Clone the Repository
git clone https://github.com/Omar-netizen/pdf-chat-app.git
cd pdf-chat-app

2. Backend Setup
cd backend
npm install


Create a .env file in the backend/ 

GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_ KEY_HERE"


Run backend:

npm start

3. Frontend Setup
cd frontend
npm install


Create a .env file in the frontend/ folder:

REACT_APP_API_BASE_URL=https://your-backend-service.onrender.com


Run frontend:

npm start

🌍 Deployment

Backend (Render)
Push backend code to GitHub → Deploy via Render → Copy API URL.

Frontend (Vercel)
Push frontend code to GitHub → Deploy via Vercel → Add environment variable:

REACT_APP_API_BASE_URL=https://your-backend-service.onrender.com

📸 Screenshots
<img width="1044" height="897" alt="Screenshot 2025-09-18 122127" src="https://github.com/user-attachments/assets/67d2b008-9d39-4f01-97af-728b1dcd30cc" />



🧩 Future Improvements

✅ OCR support for scanned/image PDFs.

✅ Authentication & user history.

✅ More advanced AI models for faster responses.

🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you’d like to change.
