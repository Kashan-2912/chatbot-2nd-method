'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  addKnowledgeChunk, 
  getAllKnowledge, 
  clearAllKnowledge,
  searchKnowledge,
  addChatMessage,
  getChatHistory,
  clearChatHistory,
  ChatMessage,
} from '@/lib/indexedDB';
import { createKnowledgeChunks } from '@/lib/fileProcessor';

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [knowledgeFiles, setKnowledgeFiles] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history and knowledge files on mount
  useEffect(() => {
    const loadData = async () => {
      const history = await getChatHistory();
      setMessages(history);
      
      const knowledge = await getAllKnowledge();
      const uniqueFiles = [...new Set(knowledge.map(k => k.fileName))];
      setKnowledgeFiles(uniqueFiles);
    };
    loadData();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    try {
      for (const file of Array.from(files)) {
        const chunks = await createKnowledgeChunks(file);
        for (const chunk of chunks) {
          await addKnowledgeChunk(chunk);
        }
      }
      
      // Refresh knowledge files list
      const knowledge = await getAllKnowledge();
      const uniqueFiles = [...new Set(knowledge.map(k => k.fileName))];
      setKnowledgeFiles(uniqueFiles);
      
      alert(`Successfully uploaded ${files.length} file(s)`);
      setShowUpload(false);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error uploading files. Please try again.');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    await addChatMessage(userMessage);
    setInput('');
    setIsLoading(true);

    try {
      // Search for relevant context
      const relevantChunks = await searchKnowledge(input);

      // Call API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          context: relevantChunks
        })
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: Date.now()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        await addChatMessage(assistantMessage);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Something went wrong'}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (confirm('Clear all chat history?')) {
      await clearChatHistory();
      setMessages([]);
    }
  };

  const handleClearKnowledge = async () => {
    if (confirm('Clear all knowledge base files? This cannot be undone.')) {
      await clearAllKnowledge();
      setKnowledgeFiles([]);
      alert('Knowledge base cleared');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Knowledge Chatbot</h1>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Knowledge Base</h2>
          <div className="space-y-2 mb-4">
            {knowledgeFiles.length === 0 ? (
              <p className="text-sm text-gray-500">No files uploaded</p>
            ) : (
              knowledgeFiles.map((file, idx) => (
                <div key={idx} className="text-sm text-gray-600 dark:text-gray-400 truncate" title={file}>
                  📄 {file}
                </div>
              ))
            )}
          </div>
          
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 mb-2"
          >
            Upload Files
          </button>
          
          {showUpload && (
            <input
              type="file"
              multiple
              accept="*/*"
              onChange={handleFileUpload}
              className="w-full text-sm mb-2"
            />
          )}
          
          <button
            onClick={handleClearKnowledge}
            className="w-full px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            disabled={knowledgeFiles.length === 0}
          >
            Clear Knowledge Base
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <p className="text-lg mb-2">👋 Welcome to Knowledge Chatbot</p>
              <p className="text-sm">Upload files to the knowledge base and start asking questions!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500">Thinking...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask a question about your knowledge base..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Send
            </button>
            <button
              onClick={handleClearChat}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              disabled={messages.length === 0}
            >
              Clear
            </button>
          </div>
          <p className="text-xs text-gray-500">
            {knowledgeFiles.length} file(s) in knowledge base
          </p>
        </div>
      </div>
    </div>
  );
}