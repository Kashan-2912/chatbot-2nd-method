// IndexedDB utility for storing knowledge base and chat history
const DB_NAME = 'ChatbotDB';
const DB_VERSION = 1;
const KNOWLEDGE_STORE = 'knowledgeBase';
const CHAT_STORE = 'chatHistory';

export interface KnowledgeChunk {
  id: string;
  fileName: string;
  content: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Initialize IndexedDB
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create knowledge base store
      if (!db.objectStoreNames.contains(KNOWLEDGE_STORE)) {
        const knowledgeStore = db.createObjectStore(KNOWLEDGE_STORE, { keyPath: 'id' });
        knowledgeStore.createIndex('fileName', 'fileName', { unique: false });
        knowledgeStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create chat history store
      if (!db.objectStoreNames.contains(CHAT_STORE)) {
        const chatStore = db.createObjectStore(CHAT_STORE, { keyPath: 'id' });
        chatStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

// Knowledge Base Operations
export const addKnowledgeChunk = async (chunk: KnowledgeChunk): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([KNOWLEDGE_STORE], 'readwrite');
  const store = transaction.objectStore(KNOWLEDGE_STORE);
  await store.add(chunk);
};

export const getAllKnowledge = async (): Promise<KnowledgeChunk[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KNOWLEDGE_STORE], 'readonly');
    const store = transaction.objectStore(KNOWLEDGE_STORE);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteKnowledgeByFileName = async (fileName: string): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([KNOWLEDGE_STORE], 'readwrite');
  const store = transaction.objectStore(KNOWLEDGE_STORE);
  const index = store.index('fileName');
  const request = index.openCursor(IDBKeyRange.only(fileName));

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const clearAllKnowledge = async (): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([KNOWLEDGE_STORE], 'readwrite');
  const store = transaction.objectStore(KNOWLEDGE_STORE);
  await store.clear();
};

// Chat History Operations
export const addChatMessage = async (message: ChatMessage): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([CHAT_STORE], 'readwrite');
  const store = transaction.objectStore(CHAT_STORE);
  await store.add(message);
};

export const getChatHistory = async (): Promise<ChatMessage[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHAT_STORE], 'readonly');
    const store = transaction.objectStore(CHAT_STORE);
    const index = store.index('timestamp');
    const request = index.openCursor();
    const messages: ChatMessage[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        messages.push(cursor.value);
        cursor.continue();
      } else {
        resolve(messages);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const clearChatHistory = async (): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([CHAT_STORE], 'readwrite');
  const store = transaction.objectStore(CHAT_STORE);
  await store.clear();
};

// Search knowledge base for relevant content
export const searchKnowledge = async (query: string): Promise<KnowledgeChunk[]> => {
  const allKnowledge = await getAllKnowledge();
  const lowerQuery = query.toLowerCase();
  
  // Simple keyword-based search with scoring
  const scored = allKnowledge.map(chunk => {
    const lowerContent = chunk.content.toLowerCase();
    const words = lowerQuery.split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      const count = (lowerContent.match(new RegExp(word, 'g')) || []).length;
      score += count;
    });
    
    return { chunk, score };
  });
  
  // Filter and sort by relevance
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5) // Top 5 most relevant chunks
    .map(item => item.chunk);
};
