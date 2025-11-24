
import { GoogleGenAI, Type } from "@google/genai";
import { MindMapNode, ModelType, LearningPath, UserProfile } from "../types";

/**
 * Generate study notes from text or a file (PDF/Image)
 */
export const generateNotesService = async (
  promptText: string,
  fileBase64?: string,
  mimeType?: string,
  userProfile?: UserProfile
): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing in environment variables.");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const context = userProfile 
    ? `The student is named ${userProfile.name}, in grade ${userProfile.grade}, preparing for ${userProfile.targetExam}.` 
    : '';

  try {
    const parts: any[] = [];
    
    if (fileBase64 && mimeType) {
      parts.push({
        inlineData: {
          data: fileBase64,
          mimeType: mimeType,
        },
      });
    }

    // Add the user prompt
    parts.push({
      text: `You are "Professor Nova", a fun, visual, and highly energetic AI study companion.
      ${context}
      
      Task: Create creative, "handwritten-style" study notes for the student.
      
      Formatting Rules (Strictly follow these for the renderer):
      - Use standard Markdown.
      - Use # for Main Title, ## for Sections, ### for Sub-sections.
      - Use **bold** for key terms (these will be highlighted in color).
      - Use * or - for bullet points.
      - Use emojis liberally to make it fun! 🎨
      - Keep sentences concise and punchy.
      - Structure: 
        1. 🎯 Big Idea (Intro)
        2. 🧠 The Core Stuff (Main concepts)
        3. ⚡ Quick Summary (Bulleted list)
      
      User Instruction: ${promptText}`
    });

    const response = await ai.models.generateContent({
      model: ModelType.FAST,
      contents: { parts },
    });

    return response.text || "No notes generated.";
  } catch (error: any) {
    console.error("Gemini Notes Error:", error);
    throw new Error(error.message || "Failed to generate notes.");
  }
};

/**
 * Generate a hierarchical JSON for a Mind Map
 */
export const generateMindMapData = async (topic: string): Promise<MindMapNode> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: ModelType.FAST,
      contents: `Create a hierarchical mind map structure for the topic: "${topic}".
      Return ONLY valid JSON.
      Do not include any markdown formatting like \`\`\`json or \`\`\`.
      Just the raw JSON string starting with { and ending with }.
      
      Structure:
      {
        "name": "Root Topic",
        "children": [
          { "name": "Subtopic 1", "children": [...] },
          { "name": "Subtopic 2" }
        ]
      }`,
      config: {
        responseMimeType: "application/json"
      }
    });

    let text = response.text || "";
    // CLEANUP: Aggressively remove markdown code blocks
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    if (!text) throw new Error("Empty response");
    
    return JSON.parse(text) as MindMapNode;
  } catch (error: any) {
    console.error("Gemini MindMap Error:", error);
    throw new Error(error.message || "Failed to generate mind map.");
  }
};

/**
 * Chat / Tutor Logic
 */
export const chatWithTutor = async (
  history: { role: string; parts: { text: string }[] }[],
  currentMessage: string,
  userProfile?: UserProfile,
  imageBase64?: string
): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = userProfile
    ? `You are Professor Nova, a helpful, encouraging, and witty AI tutor.
       You are talking to ${userProfile.name}, who is in ${userProfile.grade} and studying for ${userProfile.targetExam}.
       
       Persona:
       - Friendly and approachable (not robotic).
       - Use analogies relevant to a student in ${userProfile.grade}.
       - Use emojis occasionally to keep the mood light.
       - If the student is stressed, offer encouragement.`
    : "You are a patient, knowledgeable, and encouraging tutor. Explain concepts clearly.";

  try {
    // Switched to FAST model for better reliability and speed in chat
    const chat = ai.chats.create({
      model: ModelType.FAST, 
      history: history,
      config: {
        systemInstruction: systemInstruction
      }
    });

    const parts: any[] = [];
    if (imageBase64) {
      parts.push({
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg", 
        }
      });
    }
    parts.push({ text: currentMessage });

    const result = await chat.sendMessage({
      content: { parts }
    });

    return result.text || "I couldn't generate a response.";
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    throw new Error(error.message || "Failed to send message.");
  }
};

/**
 * Generate a Personalized Learning Path
 */
export const generateLearningPath = async (topic: string, level: string, userProfile?: UserProfile): Promise<LearningPath> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const context = userProfile 
  ? `Target Audience: ${userProfile.name}, Grade: ${userProfile.grade}, Exam: ${userProfile.targetExam}.` 
  : '';

  try {
    const response = await ai.models.generateContent({
      model: ModelType.FAST,
      contents: `Create a fun, game-like step-by-step learning path for "${topic}" for a student at "${level}" level.
      ${context}
      
      Make the Step Titles sound like "Game Levels" or "Adventures".
      Example: Instead of "Introduction", use "Level 1: The Beginning" or "Mission Start".
      
      Return JSON format.
      Structure the path to specifically help with ${userProfile?.targetExam || 'general understanding'}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  estimatedTime: { type: Type.STRING },
                  keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            }
          }
        }
      }
    });

    let text = response.text || "";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(text) as LearningPath;
  } catch (error: any) {
    console.error("Learning Path Error:", error);
    throw new Error(error.message || "Failed to generate learning path.");
  }
};
