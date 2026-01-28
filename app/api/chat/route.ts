import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your .env.local file' },
        { status: 500 }
      );
    }

    // Build prompt with context
    let prompt = `You are a helpful AI assistant that answers questions based on the provided knowledge base. 
If the question can be answered using the knowledge base, provide a detailed answer with references to the source material.
If the information is not in the knowledge base, politely say so and offer to help with what you know.\n\n`;

    if (context && context.length > 0) {
      prompt += `Knowledge Base Context:\n${context.map((chunk: any) => 
        `[${chunk.fileName}]\n${chunk.content}`
      ).join('\n\n---\n\n')}\n\n`;
    } else {
      prompt += `Note: No relevant knowledge base context was found. Please inform the user that they need to upload knowledge base files first.\n\n`;
    }

    prompt += `User Question: ${message}`;

    // Call Gemini API with Gemini 2.5 Flash
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini API error:', error);
      return NextResponse.json(
        { error: `Gemini API error: ${error.error?.message || 'Unknown error'}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const assistantMessage = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';

    return NextResponse.json({
      message: assistantMessage,
      sources: context ? context.map((c: any) => c.fileName) : []
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
