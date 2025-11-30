# 🤖 AI PDF Chatbot

An intelligent, multi-user chatbot application that allows users to upload PDF documents, organize them in personal libraries, and ask questions about their content using advanced AI and vector search technology.

## ✨ Features

### 📄 Document Management
- **Smart PDF Upload & Processing** - Intelligent chunking with sentence-aware splitting
- **Multi-PDF Selection** - Search across all documents or select specific PDFs
- **Personal Document Libraries** - User-specific file management with authentication
- **Real-time PDF List Updates** - Instant refresh after uploads

### 🔐 User Authentication
- **Secure Login/Signup** - JWT-based authentication system
- **Protected Routes** - User-specific data isolation
- **Session Management** - Secure token-based authorization

### 💬 Advanced Chat Features
- **AI-Powered Responses** - Context-aware answers using Google Gemini 2.5 Flash
- **Conversation History** - Save and revisit past chats
- **Multi-Document Search** - Query across your entire document library
- **Compare Mode** - Compare information across 2+ selected PDFs
- **Cross-Reference Mode** - Find all mentions of keywords across documents

### 🔍 Intelligent Search
- **Semantic Vector Search** - Advanced similarity search with Pinecone
- **Query Expansion** - Multiple search variations for better matching
- **Smart Reranking** - Context-aware relevance boosting
- **Citation Support** - See exactly where information came from with detailed references

### 📊 Rich Metadata & Analytics
- **Confidence Scoring** - Answer reliability metrics
- **Source Tracking** - Document and section references
- **Keyword Extraction** - Automatic content tagging
- **Content Type Detection** - Intelligent document classification

## 🛠️ Tech Stack

### Frontend
- **React.js** - Modern hooks and functional components
- **Tailwind CSS** - Responsive, utility-first styling
- **Axios** - API communication
- **React Context API** - State management and authentication
- **Deployed on Vercel** - Fast, global CDN deployment

### Backend
- **Node.js + Express.js** - RESTful API server
- **MongoDB + Mongoose** - User data and conversation storage
- **Pinecone Vector Database** - 768-dimensional embeddings for semantic search
- **Google Gemini AI** - text-embedding-004 for embeddings, gemini-2.5-flash for chat
- **JWT Authentication** - Secure user sessions
- **PDF-parse** - Document text extraction
- **Multer** - File upload handling
- **Deployed on Render** - Reliable cloud hosting

### AI/ML Pipeline
- **Vector Embeddings** - Semantic document representation
- **Smart Chunking** - Context-preserving text splitting with overlap
- **Query Expansion** - Multi-variation search strategies
- **Result Reranking** - Confidence-based answer optimization
- **Multi-Context Synthesis** - Information combination from multiple sources

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB database
- Pinecone account and API key
- Google AI Studio API key (Gemini)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Omar-netizen/pdf-chat-app.git
   cd pdf-chat-app
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

4. **Set up backend environment variables**
   
   Create `.env` file in the backend directory:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX_NAME=pdf-chat-index
   PINECONE_ENVIRONMENT=your_pinecone_environment
   GEMINI_API_KEY=your_gemini_api_key
   NODE_ENV=development
   ```

5. **Set up frontend environment variables**
   
   Create `.env` file in the frontend directory:
   ```env
   REACT_APP_API_BASE_URL=http://localhost:5000
   ```

6. **Create Pinecone Index**
   - Log into Pinecone dashboard
   - Create a new index with:
     - Name: `pdf-chat-index`
     - Dimensions: `768`
     - Metric: `cosine`

7. **Start the application**
   
   Backend (in backend directory):
   ```bash
   npm start
   ```
   
   Frontend (in frontend directory):
   ```bash
   npm start
   ```

8. **Open your browser** and navigate to `http://localhost:3000`

## 📱 How to Use

### Getting Started
1. **Sign Up / Login** - Create your account or sign in
2. **Upload PDFs** - Add documents to your personal library
3. **View Documents** - See all your uploaded PDFs with metadata

### Chatting with Documents
1. **Select Documents** - Choose specific PDFs or search all
2. **Choose Mode**:
   - **Normal Mode** - Ask questions, get AI-generated answers
   - **Compare Mode** - Select 2+ PDFs to compare content
   - **Cross-Reference Mode** - Find all mentions of a keyword
3. **Ask Questions** - Use natural language queries
4. **View Citations** - Toggle detailed source references

### Advanced Features
- **Conversation History** - Access past chats from sidebar
- **New Chat** - Start fresh conversations anytime
- **Citations Toggle** - Show/hide detailed references
- **Multi-PDF Search** - Search across your entire library

## 🎯 Key Features in Detail

### 🔐 Multi-User Authentication
- Secure JWT-based authentication
- User-specific document isolation
- Protected API routes with middleware
- Persistent sessions across devices

### 📄 Smart Document Processing
- **Intelligent Chunking**: Preserves sentence boundaries (400-600 chars per chunk)
- **Context Overlap**: 50-character overlap prevents information loss
- **Metadata Enrichment**: Automatic keyword extraction and content classification
- **User Isolation**: Each user's documents stored separately in vector DB

### 🔍 Advanced Search & Chat
- **Query Expansion**: Generates search variations for better coverage
- **Semantic Reranking**: Boosts results based on keyword density and content type
- **Multi-Context Answers**: Synthesizes information from top 5-20 chunks
- **Compare Mode**: Side-by-side analysis of multiple documents
- **Cross-Reference**: Find all occurrences of terms across documents

### 💬 Conversation Management
- **Persistent History**: All chats saved to MongoDB
- **Resume Conversations**: Pick up where you left off
- **Context Preservation**: Document selections and modes saved per conversation
- **New Chat Creation**: Start fresh while keeping old conversations

### 📊 Citations & Transparency
- **Source Attribution**: Every answer shows which PDFs were used
- **Section References**: Exact chunk numbers and locations
- **Text Previews**: See actual text snippets used for answers
- **Confidence Scores**: Relevance metrics for each citation
- **Keyword Highlights**: Important terms from matched content

## 🌐 Live Demo

**Frontend:** https://pdf-chat-app-two.vercel.app  
**Backend:** https://pdf-chat-app-anix.onrender.com

*Note: Backend may take 30-60 seconds to wake up on first request (free tier hosting)*


## 🔮 Completed Features

✅ **User Authentication** - Secure login/signup with JWT  
✅ **Personal Document Libraries** - User-specific PDF storage  
✅ **Conversation History** - Save and resume chats  
✅ **Multi-PDF Selection** - Search across selected documents  
✅ **Compare Mode** - Compare content across documents  
✅ **Cross-Reference Mode** - Find keyword mentions  
✅ **Citation System** - Detailed source references  
✅ **Cloud Deployment** - Live on Vercel + Render  
✅ **Modern UI/UX** - Responsive, glass-morphism design

## 🚧 Planned Enhancements

- 🖼️ **OCR Support** - Extract text from scanned PDFs and images
- 📊 **Analytics Dashboard** - Usage statistics and document insights
- 📝 **Multi-Format Support** - Word docs, text files, Excel
- 🔍 **Advanced Filters** - Filter by date, document type, tags
- 📈 **Performance Optimization** - Faster embeddings and search
- 🤖 **Multiple AI Models** - Support for GPT, Claude, etc.
- 📱 **Mobile App** - React Native implementation
- 🌍 **Multi-Language Support** - i18n for global users
- 📤 **Export Conversations** - Download chat history as PDF/TXT
- 🔔 **Notifications** - Upload completion alerts

## 🛡️ Security Features

- JWT token-based authentication
- Bcrypt password hashing
- User data isolation in vector DB
- Protected API routes with middleware
- CORS configuration for cross-origin security
- Input validation and sanitization

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Document Endpoints
- `POST /api/uploadpdf` - Upload PDF (protected)
- `GET /api/get-uploaded-pdfs` - List user's PDFs (protected)

### Chat Endpoints
- `POST /api/chat-pinecone` - Query documents (protected)
- `POST /api/cross-reference` - Find keyword mentions (protected)

### Conversation Endpoints
- `POST /api/conversations` - Create conversation (protected)
- `GET /api/conversations/:id` - Load conversation (protected)
- `POST /api/conversations/:id/messages` - Add message (protected)
- `PATCH /api/conversations/:id` - Update settings (protected)

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

**Areas for contribution:**
- Bug fixes and improvements
- New features from the planned enhancements
- UI/UX improvements
- Documentation updates
- Test coverage
- Performance optimizations

## 🙏 Acknowledgments

- Google Gemini AI for embeddings and chat generation
- Pinecone for vector database infrastructure
- MongoDB for document and user data storage
- Vercel and Render for hosting services

## 🙋‍♂️ Contact

**Md. Omar Khan**  
Email: mdomarkhan314@gmail.com  
GitHub: [@Omar-netizen](https://github.com/Omar-netizen)

---

⭐ **Star this repo if you found it helpful!**  
🐛 **Found a bug?** Open an issue!  
💡 **Have a feature idea?** Start a discussion!
