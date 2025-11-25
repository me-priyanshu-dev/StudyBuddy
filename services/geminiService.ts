
import { GoogleGenAI, Type } from "@google/genai";
import { MindMapNode, ModelType, LearningPath, UserProfile } from "../types";

// Helper: robustly extract JSON from AI response text
const cleanAndParseJSON = (text: string): any => {
  if (!text) throw new Error("Empty response from AI");

  // Remove markdown code blocks first
  let cleanText = text.replace(/```json/g, '').replace(/```/g, '');

  // Find the first '{' and the last '}'
  const firstBrace = cleanText.indexOf('{');
  const lastBrace = cleanText.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("Response did not contain valid JSON structure");
  }

  // Extract just the JSON part
  const jsonStr = cleanText.substring(firstBrace, lastBrace + 1);
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("JSON Parse Error on string:", jsonStr);
    throw new Error("Failed to parse AI response as JSON");
  }
};

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

    return cleanAndParseJSON(response.text || "") as MindMapNode;
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
      
      IMPORTANT: Return ONLY valid JSON.
      JSON Structure:
      {
        "topic": "${topic}",
        "steps": [
          {
             "title": "Level 1: Basics",
             "description": "Brief description of what to learn.",
             "estimatedTime": "2 hours",
             "keyConcepts": ["concept1", "concept2"]
          }
        ]
      }
      
      Structure the path to specifically help with ${userProfile?.targetExam || 'general understanding'}.`,
      config: {
        responseMimeType: "application/json"
        // Removed responseSchema to prevent "non-empty OBJECT" errors and improve robustness
      }
    });

    return cleanAndParseJSON(response.text || "") as LearningPath;
  } catch (error: any) {
    console.error("Learning Path Error:", error);
    throw new Error(error.message || "Failed to generate learning path.");
  }
};
