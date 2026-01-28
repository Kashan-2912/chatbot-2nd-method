// File processing utilities
import { KnowledgeChunk } from './indexedDB';

// Chunk size in characters
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

// Get file extension
const getFileExtension = (fileName: string): string => {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
};

// Check if file is binary (images, videos, etc. that can't be read as text)
const isBinaryFile = (fileName: string): boolean => {
  const binaryExtensions = [
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'svg',
    'mp3', 'mp4', 'avi', 'mov', 'wav', 'ogg', 'webm',
    'zip', 'rar', '7z', 'tar', 'gz',
    'exe', 'dll', 'so', 'bin',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'
  ];
  const ext = getFileExtension(fileName);
  return binaryExtensions.includes(ext);
};

// Extract text from PDF using pdf.js-like approach (basic text extraction)
const extractPDFText = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  // Convert to string and look for text content
  let text = '';
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const rawText = decoder.decode(bytes);
  
  // Extract text between BT and ET markers (PDF text objects)
  const textMatches = rawText.match(/\((.*?)\)/g);
  if (textMatches) {
    text = textMatches
      .map(match => match.slice(1, -1))
      .filter(t => t.length > 0 && /[a-zA-Z0-9]/.test(t))
      .join(' ');
  }
  
  // If no text found, try to extract any readable content
  if (text.length < 50) {
    text = rawText.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  return text || `[PDF file: ${file.name} - Text extraction limited. Consider using a text-based format for better results.]`;
};

// Extract text from Word documents (basic extraction)
const extractDocxText = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const rawText = decoder.decode(bytes);
  
  // Try to extract text content from XML
  const textMatches = rawText.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  if (textMatches) {
    return textMatches
      .map(match => match.replace(/<[^>]*>/g, ''))
      .join(' ');
  }
  
  return `[Word document: ${file.name} - Text extraction limited. Consider saving as .txt for better results.]`;
};

// Parse file content based on type
export const processFile = async (file: File): Promise<string> => {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  const ext = getFileExtension(fileName);

  try {
    // Text-based files
    if (fileType.startsWith('text/') || 
        ['txt', 'md', 'markdown', 'rst', 'log'].includes(ext)) {
      return await file.text();
    }
    
    // JSON files
    if (ext === 'json' || fileType === 'application/json') {
      const text = await file.text();
      try {
        const json = JSON.parse(text);
        return JSON.stringify(json, null, 2);
      } catch {
        return text;
      }
    }
    
    // CSV/TSV files
    if (['csv', 'tsv'].includes(ext)) {
      return await file.text();
    }
    
    // Code files
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 
         'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'scala', 'r',
         'html', 'htm', 'css', 'scss', 'sass', 'less',
         'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf',
         'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd',
         'sql', 'graphql', 'gql'].includes(ext)) {
      return await file.text();
    }
    
    // PDF files
    if (ext === 'pdf' || fileType === 'application/pdf') {
      return await extractPDFText(file);
    }
    
    // Word documents
    if (['doc', 'docx'].includes(ext) || 
        fileType.includes('word') || 
        fileType.includes('document')) {
      return await extractDocxText(file);
    }
    
    // Excel/Spreadsheet (basic extraction)
    if (['xls', 'xlsx'].includes(ext) || fileType.includes('spreadsheet')) {
      const arrayBuffer = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const rawText = decoder.decode(new Uint8Array(arrayBuffer));
      const textMatches = rawText.match(/<t[^>]*>([^<]*)<\/t>/g);
      if (textMatches) {
        return textMatches.map(m => m.replace(/<[^>]*>/g, '')).join(' | ');
      }
      return `[Excel file: ${file.name}]`;
    }
    
    // RTF files
    if (ext === 'rtf') {
      const text = await file.text();
      return text.replace(/\{[^}]*\}/g, '').replace(/\\[a-z]+\d*/g, ' ').trim();
    }
    
    // Image files - just store metadata
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
      return `[Image file: ${file.name}, Size: ${(file.size / 1024).toFixed(2)} KB, Type: ${file.type}]`;
    }
    
    // Audio/Video files - just store metadata  
    if (['mp3', 'mp4', 'avi', 'mov', 'wav', 'ogg', 'webm'].includes(ext)) {
      return `[Media file: ${file.name}, Size: ${(file.size / 1024 / 1024).toFixed(2)} MB, Type: ${file.type}]`;
    }
    
    // Try to read as text for any other file
    try {
      const text = await file.text();
      // Check if it's mostly readable text
      const readableChars = text.replace(/[^\x20-\x7E\n\r\t]/g, '');
      if (readableChars.length > text.length * 0.7) {
        return text;
      }
      return `[File: ${file.name}]\n${readableChars.slice(0, 5000)}`;
    } catch {
      return `[Binary file: ${file.name}, Size: ${(file.size / 1024).toFixed(2)} KB, Type: ${file.type || 'unknown'}]`;
    }
    
  } catch (error) {
    console.error('Error processing file:', file.name, error);
    return `[File: ${file.name} - Could not extract content]`;
  }
};

// Split text into overlapping chunks
export const chunkText = (text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] => {
  // Handle empty or very short text
  if (!text || text.length === 0) {
    return [];
  }
  
  if (text.length <= chunkSize) {
    return [text.trim()].filter(chunk => chunk.length > 0);
  }

  const chunks: string[] = [];
  let start = 0;
  let iterations = 0;
  const maxIterations = Math.ceil(text.length / (chunkSize - overlap)) + 10; // Safety limit

  while (start < text.length && iterations < maxIterations) {
    iterations++;
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);

    // Try to end at a sentence boundary
    if (end < text.length && chunk.length > 100) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const lastBreak = Math.max(lastPeriod, lastNewline);

      if (lastBreak > chunk.length * 0.5) {
        chunk = chunk.slice(0, lastBreak + 1);
      }
    }

    const trimmedChunk = chunk.trim();
    if (trimmedChunk.length > 0) {
      chunks.push(trimmedChunk);
    }
    
    // Ensure we always make forward progress
    const progress = Math.max(chunk.length - overlap, 1);
    start += progress;
  }

  return chunks;
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
