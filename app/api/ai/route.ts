import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY as string;
if (!apiKey) {
  throw new Error("Missing Gemini API key in server environment.");
}

export async function POST(request: Request) {
  const body = await request.json();
  const { type, text, question } = body as {
    type: string;
    text?: string;
    question?: string;
  };

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      if (type === "summary") {
    if (!text) {
      return NextResponse.json({ error: "Missing text for summary." }, { status: 400 });
    }
    const prompt = `Provide a 3-point summary of document obligations: ${text}`;
    const result = await model.generateContent(prompt);
    return NextResponse.json({ text: result.response.text() });
  }

  if (type === "chat") {
      if (!text || !question) {
        return NextResponse.json({ error: "Missing chat context or question." }, { status: 400 });
      }
      const chat = model.startChat({
        history: [
          {
            role: "system",
            parts: [
              {
                text: "You are a helpful legal assistant that answers contract-related questions clearly and concisely.",
              },
            ],
          },
          {
            role: "user",
            parts: [
              {
                text: `Context: ${text}`,
              },
            ],
          },
        ],
      });
      const result = await chat.sendMessage(question);
      return NextResponse.json({ text: result.response.text() });
    }

    return NextResponse.json({ error: "Invalid request type." }, { status: 400 });
  } catch (error) {
    console.error("/api/ai error:", error);
    return NextResponse.json({ error: (error as Error).message || "AI request failed." }, { status: 500 });
  }
}
