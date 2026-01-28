// File processing utilities
import { KnowledgeChunk } from './indexedDB';

// Chunk size in characters
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

// Parse file content based on type
export const processFile = async (file: File): Promise<string> => {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
    return await file.text();
  } else if (fileName.endsWith('.json')) {
    const text = await file.text();
    const json = JSON.parse(text);
    return JSON.stringify(json, null, 2);
  } else if (fileName.endsWith('.csv')) {
    return await file.text();
  } else {
    // Try to read as text for other types
    return await file.text();
  }
};

// Split text into overlapping chunks
export const chunkText = (text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] => {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);

    // Try to end at a sentence boundary
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const lastBreak = Math.max(lastPeriod, lastNewline);

      if (lastBreak > chunkSize * 0.5) {
        chunk = chunk.slice(0, lastBreak + 1);
      }
    }

    chunks.push(chunk.trim());
    start += chunk.length - overlap;

    if (start >= text.length) break;
  }

  return chunks.filter(chunk => chunk.length > 0);
};

// Process file and create knowledge chunks
export const createKnowledgeChunks = async (file: File): Promise<KnowledgeChunk[]> => {
  try {
    const content = await processFile(file);
    const textChunks = chunkText(content);
    const timestamp = Date.now();

    return textChunks.map((chunk, index) => ({
      id: `${file.name}-${timestamp}-${index}`,
      fileName: file.name,
      content: chunk,
      timestamp
    }));
  } catch (error) {
    console.error('Error processing file:', error);
    throw new Error(`Failed to process file: ${file.name}`);
  }
};

// Extract metadata from file
export const getFileMetadata = (file: File) => {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified).toISOString()
  };
};
