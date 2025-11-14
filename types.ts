export enum MessageAuthor {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system',
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        uri: string;
        title: string;
        snippet: string;
      }[];
    }[];
  };
}


export interface Message {
  id: string;
  author: MessageAuthor;
  text: string;
  images?: string[];
  videoUrl?: string;
  sources?: GroundingChunk[];
  files?: AttachedFile[]; // For regeneration
}

export enum ModelSpeed {
  LITE = 'Lite',
  FAST = 'Fast',
  EXPERT = 'Expert',
  AUTO = 'Auto',
}

export enum ResponseStyle {
  NORMAL = 'Normal',
  LEARNING = 'Learning',
  CONCISE = 'Concise',
  EXPLANATORY = 'Explanatory',
  FORMAL = 'Formal',
}

export type TTSVoice = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export interface Settings {
  modelSpeed: ModelSpeed;
  responseStyle: ResponseStyle;
  webSearch: boolean;
  mapsSearch: boolean;
  thinkingMode: boolean;
  ttsVoice: TTSVoice;
}

export interface AttachedFile {
  name: string;
  type: string;
  dataUrl: string;
}

// Fix: The AIStudio interface is now defined in the global scope to avoid module resolution conflicts.
// The global declaration was moved here from index.tsx to resolve conflicts.
declare global {
  // FIX: Moved AIStudio interface into declare global to make it a true global type
  // and avoid module-related type conflicts.
  // FIX: Removed 'export' from interface declaration inside 'declare global' to resolve type conflict.
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // FIX: Add readonly modifier to resolve "All declarations of 'aistudio' must have identical modifiers" error.
    // @ts-ignore
    readonly aistudio: AIStudio;
  }
}