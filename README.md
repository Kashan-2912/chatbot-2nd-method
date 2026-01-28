# Knowledge Base Chatbot

A Next.js chatbot that learns from your documents and answers questions based on your custom knowledge base. All data is stored locally in your browser using IndexedDB - no external database needed!

## Features

- 📁 **Upload Knowledge Base**: Support for .txt, .md, .json, .csv, and other text files
- 💬 **Intelligent Responses**: Uses Google Gemini AI to answer questions based on your documents
- 🔍 **Smart Search**: Automatically finds relevant context from your knowledge base
- 💾 **Local Storage**: All data stored in browser using IndexedDB
- 🎨 **Clean UI**: Modern, responsive interface with dark mode support
- 📝 **Chat History**: Persistent conversation history

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Google Gemini API Key (FREE!)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API Key" or "Create API Key"
4. Copy your API key

**Note**: Gemini has a generous free tier - 15 requests per minute with no cost!

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

### Upload Knowledge Base

1. Click **"Upload Files"** button in the sidebar
2. Select one or multiple files (.txt, .md, .json, .csv)
3. Files are automatically processed and chunked for optimal retrieval
4. Uploaded files appear in the sidebar

### Ask Questions

1. Type your question in the input field
2. The system searches for relevant context from your knowledge base
3. Get AI-powered answers based on your documents
4. View sources used for each answer

### Manage Data

- **Clear Chat**: Removes chat history but keeps knowledge base
- **Clear Knowledge Base**: Removes all uploaded documents

## File Structure

```
chatbot-2nd/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # Chat API endpoint
│   ├── page.tsx                  # Main chat interface
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── lib/
│   ├── indexedDB.ts              # Browser storage utilities
│   └── fileProcessor.ts          # File parsing and chunking
├── .env.local                    # Environment variables (create this)
└── package.json
```

## How It Works

1. **File Upload**: Files are read and split into overlapping chunks (1000 chars with 200 char overlap)
2. **Storage**: Chunks are stored in browser's IndexedDB
3. **Query Processing**: When you ask a question, the system searches for relevant chunks
4. **Context Retrieval**: Top 5 most relevant chunks are selected based on keyword matching
5. **AI Response**: Google Gemini generates an answer using the retrieved context
6. **Persistence**: Chat history and knowledge base persist across browser sessions

## Supported File Types

- `.txt` - Plain text files
- `.md` - Markdown files
- `.json` - JSON files
- `.csv` - CSV files
- Any text-based file

## Browser Compatibility

Requires a modern browser with IndexedDB support:
- Chrome 24+
- Firefox 16+
- Safari 10+
- Edge 12+

## Privacy & Security

- All data stored locally in your browser
- No external database or cloud storage
- Knowledge base never leaves your device
- Only chat messages sent to Google Gemini API

## Limitations

- Storage limited by browser's IndexedDB quota (typically 50-100MB)
- Basic keyword-based search (not semantic vector search)
- No user authentication or multi-user support
- Requires internet connection for AI responses

## Future Enhancements

- [ ] PDF file support
- [ ] Vector embeddings for better search
- [ ] Export/Import knowledge base
- [ ] Custom AI model selection
- [ ] File preview and editing
- [ ] Statistics and analytics

## Troubleshooting

**No response from chatbot**
- Check that GEMINI_API_KEY is set in .env.local
- Verify your Gemini API key is valid and active
- Check browser console for errors
- Ensure you haven't exceeded the free tier rate limits (15 req/min)

**Files not uploading**
- Ensure file is text-based
- Check file size (large files may take time)
- Try refreshing the page

**Chat history lost**
- IndexedDB data cleared by browser
- Using incognito/private mode
- Browser storage quota exceeded

## License

MIT

## Contributing

Feel free to open issues or submit pull requests!

