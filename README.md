# 🤖 AI PDF Chatbot

An intelligent chatbot that allows users to upload PDF documents and ask questions about their content using advanced AI and vector search technology.

## ✨ Features

- **📄 PDF Upload & Processing** - Smart chunking with sentence-aware splitting
- **🧠 AI-Powered Chat** - Ask questions about your uploaded documents
- **🎯 Document-Specific Search** - Choose to search all documents or specific PDFs
- **🔍 Semantic Search** - Advanced vector similarity search with reranking
- **📊 Rich Metadata** - Keyword extraction, content type detection, and source tracking
- **⚡ Real-time Updates** - Instant PDF list refresh after uploads

## 🛠️ Tech Stack

**Frontend:**
- React.js with modern hooks
- Tailwind CSS for styling
- Axios for API calls

**Backend:**
- Node.js with Express.js
- Pinecone Vector Database
- Google Gemini AI (text-embedding-004)
- PDF-parse for document processing
- Multer for file uploads

**AI/ML:**
- Vector embeddings for semantic search
- Smart text chunking with overlap
- Query expansion and result reranking
- Multi-context answer generation

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- Pinecone API key
- Google AI (Gemini) API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-pdf-chatbot.git
   cd ai-pdf-chatbot
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up environment variables**
   
   Create `.env` file in the backend directory:
   ```env
   PORT=5000
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX_NAME=vector
   GEMINI_API_KEY=your_gemini_api_key
   ```

5. **Create Pinecone Index**
   - Create an index named "vector" with 768 dimensions
   - Use "cosine" similarity metric

6. **Start the application**
   
   Backend:
   ```bash
   cd backend
   npm start
   ```
   
   Frontend:
   ```bash
   cd frontend
   npm start
   ```

7. **Open your browser** and navigate to `http://localhost:3000`

## 📱 How to Use

1. **Upload PDFs** - Use the file uploader to add your documents
2. **Select Search Scope** - Choose "All Documents" or a specific PDF
3. **Ask Questions** - Chat with your documents using natural language
4. **Get Smart Answers** - Receive contextual responses with source information

## 🎯 Key Features in Detail

### Smart Document Processing
- **Intelligent Chunking**: Preserves sentence boundaries and context
- **Metadata Enrichment**: Automatic keyword extraction and content classification
- **Overlap Strategy**: Ensures no information is lost between chunks

### Advanced Search Capabilities
- **Query Expansion**: Multiple search variations for better matching
- **Semantic Reranking**: Boosts relevance based on content analysis
- **Multi-Context Answers**: Combines information from multiple sources

### User Experience
- **Real-time Feedback**: Upload progress and processing status
- **Source Transparency**: Shows which documents provided the answers
- **Confidence Scoring**: Displays answer reliability metrics
  
### Screenshot 
<img width="1603" height="931" alt="image" src="https://github.com/user-attachments/assets/ff3e8547-3e52-4c00-984e-886386052e02" />

## 🔮 Upcoming Features

This project is actively being developed! Planned enhancements include:

- 🔐 **User Authentication** - Personal document libraries
- 📊 **Analytics Dashboard** - Usage statistics and insights  
- 🎨 **Enhanced UI/UX** - Modern, responsive design
- 📝 **Multi-format Support** - Word docs, text files, and more
- 💾 **Conversation History** - Save and revisit past chats
- 🌐 **Cloud Deployment** - Live demo with hosting
- 🔍 **Advanced Filters** - Search by date, document type, etc.
- 📈 **Performance Optimization** - Faster processing and responses
- 🤖 **Multiple AI Models** - Support for different LLMs
- 📱 **Mobile App** - React Native implementation

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features  
- Submit pull requests
- Improve documentation


## 🙋‍♂️ Contact

Md. Omar Khan - mdomarkhan314@gmail.com



---

⭐ **Star this repo if you found it helpful!**
