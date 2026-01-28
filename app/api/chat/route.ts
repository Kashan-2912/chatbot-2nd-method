import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API key not configured. Please add GEMINI_API_KEY to your .env.local file",
        },
        { status: 500 },
      );
    }

    // Build prompt with context
    let prompt = `You are a helpful AI assistant that answers questions based on the provided knowledge base. 
If the question can be answered using the knowledge base, provide a detailed answer with references to the source material.
If the information is not in the knowledge base, politely say so and offer to help with what you know.\n\n`;

    if (context && context.length > 0) {
      prompt += `Knowledge Base Context:\n${context
        .map((chunk: any) => `[${chunk.fileName}]\n${chunk.content}`)
        .join("\n\n---\n\n")}\n\n`;
    } else {
      prompt += `Note: No relevant knowledge base context was found. Please inform the user that they need to upload knowledge base files first.\n\n`;
    }

    prompt += `User Question: ${message}`;

    // Call Gemini API - using gemini-2.0-flash which is widely available
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Gemini API error:", error);
      return NextResponse.json(
        {
          error: `Gemini API error: ${error.error?.message || "Unknown error"}`,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    console.log("Gemini response:", JSON.stringify(data, null, 2));

    // Handle different response structures
    let assistantMessage = "No response generated";

    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];

      // Check for safety block
      if (candidate.finishReason === "SAFETY") {
        assistantMessage =
          "I apologize, but I cannot respond to this query due to safety guidelines.";
      } else if (candidate.content?.parts?.[0]?.text) {
        assistantMessage = candidate.content.parts[0].text;
      } else if (candidate.text) {
        assistantMessage = candidate.text;
      }
    } else if (data.text) {
      assistantMessage = data.text;
    } else if (data.error) {
      return NextResponse.json(
        { error: `Gemini API error: ${data.error.message || "Unknown error"}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: assistantMessage,
      sources: context ? context.map((c: any) => c.fileName) : [],
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "An error occurred processing your request" },
      { status: 500 },
    );
  }
}
