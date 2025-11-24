
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  NOTES = 'NOTES',
  MINDMAP = 'MINDMAP',
  TUTOR = 'TUTOR',
  LEARNING_PATH = 'LEARNING_PATH'
}

export interface UserProfile {
  name: string;
  grade: string;
  targetExam: string;
  isOnboarded: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // base64
  isError?: boolean;
}

export interface MindMapNode {
  name: string;
  children?: MindMapNode[];
}

export interface LearningStep {
  title: string;
  description: string;
  estimatedTime: string;
  keyConcepts: string[];
}

export interface LearningPath {
  topic: string;
  steps: LearningStep[];
}

export enum ModelType {
  FAST = 'gemini-2.5-flash',
  REASONING = 'gemini-3-pro-preview',
  IMAGE = 'gemini-2.5-flash-image'
}
