
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { PersonaConfig, ChatMessage } from "../types";

// Generates a comprehensive system instruction for an AI persona based on user requirements.
export const generatePersonaPrompt = async (config: PersonaConfig): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    You are a world-class Prompt Engineer and AI Persona Architect. 
    Your task is to generate a comprehensive, professional 'System Instruction' or 'Persona Setting' sentence for an LLM based on the user's requirements.
    
    Guidelines for the generated text:
    1. Start with a strong role definition.
    2. Incorporate specific expertise and deep knowledge bases.
    3. Define the conversational tone and communication style clearly.
    4. List specific constraints and operational guidelines.
    5. IMPORTANT: Add a specific instruction to the persona: "Always format your responses using highly structured Markdown. Use headers (###) for sections, bullet points for lists, and bold text for key terms to maximize readability."
    6. The output should be a single, cohesive block of text that can be pasted directly into a "System Prompt" field.
    7. Ensure the instruction makes the AI behave like an elite expert in the specified field.
    8. IMPORTANT: Output the final instruction in the requested language: ${config.language}.
  `;

  const userPrompt = `
    Please create a persona with these details:
    - Role: ${config.role}
    - Expertise: ${config.expertise}
    - Tone: ${config.tone}
    - Constraints: ${config.constraints || "No specific constraints"}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
        thinkingConfig: { thinkingBudget: 4000 }
      },
    });

    return response.text || "Failed to generate persona. Please try again.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("API request failed. Check your configuration.");
  }
};

// Sends a message to a persona-configured chat session with streaming output.
export const sendMessageToPersona = async (
  systemInstruction: string,
  history: ChatMessage[],
  message: string,
  onChunk: (chunk: string) => void
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const historyMapped = history.map(m => ({
    role: m.role,
    parts: [{ text: m.text }]
  }));

  const session = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: { 
      systemInstruction: `${systemInstruction}\n\n[FORMATTING RULE]: You are an elite expert. Your answers must be extremely clear and well-structured. Use Markdown (### headers, lists, bolding, emojis) to organize information into digestible sections. Avoid wall-of-text responses.`,
      temperature: 0.7,
    },
    history: historyMapped
  });

  const responseStream = await session.sendMessageStream({ message });
  
  let fullText = "";
  for await (const chunk of responseStream) {
    const c = chunk as GenerateContentResponse;
    const text = c.text;
    if (text) {
      fullText += text;
      onChunk(text);
    }
  }
  return fullText;
};
