

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GenerateContentResponse, LiveServerMessage, Operation } from "@google/genai";
import { Message, MessageAuthor, Settings, ModelSpeed, ResponseStyle, AttachedFile, GroundingChunk, TTSVoice } from './types';
import { generateChatResponse, generateImage, editImage, generateVideo, pollVideoOperation, startLiveConversation, generateSuggestions, generateSpeech, decode, decodeAudioData } from './services/geminiService';

// --- ICONS (as inline SVG components) ---
const SendIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
);
const PlusIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>
);
const CameraIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>
);
const PhotoIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
);
const FileIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
);
const CloseIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>
);
const SparklesIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M9.315 7.584C10.866 6.32 12.837 5.25 15 5.25c1.78 0 3.44.713 4.645 1.872A8.996 8.996 0 0121.75 12c0 .249-.01.497-.029.742A9.004 9.004 0 0115 21.75c-1.78 0-3.44-.713-4.645-1.871A8.997 8.997 0 018.25 15c0-1.08.188-2.12.524-3.076l-2.45-2.451a.75.75 0 011.06-1.06l2.45 2.45zM13.25 10.5a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75zm0 3.75a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75zM8.855 8.03a.75.75 0 01.058 1.057l-1.5 2.143a.75.75 0 11-1.115-.98l1.5-2.143a.75.75 0 011.057-.058z" clipRule="evenodd" /></svg>
);
const VideoCameraIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9a2.25 2.25 0 00-2.25 2.25v9A2.25 2.25 0 004.5 18.75z" /></svg>
);
const CogIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 5.85a1.5 1.5 0 00.95 1.634l1.24.496a1.5 1.5 0 011.028 1.028l.496 1.24a1.5 1.5 0 001.634.95l2.036-.174a1.875 1.875 0 011.567 1.85v1.432c0 .917-.663 1.699-1.567 1.85l-2.036.174a1.5 1.5 0 00-.95 1.634l-.496 1.24a1.5 1.5 0 01-1.028 1.028l-1.24.496a1.5 1.5 0 00-1.634.95l.174 2.036a1.875 1.875 0 01-1.85 1.567h-1.432c-.917 0-1.699-.663-1.85-1.567l-.174-2.036a1.5 1.5 0 00-1.634-.95l-1.24-.496a1.5 1.5 0 01-1.028-1.028l-.496-1.24a1.5 1.5 0 00-.95-1.634l-2.036.174A1.875 1.875 0 012.25 12.932V11.5c0-.917.663-1.699 1.567-1.85l2.036-.174a1.5 1.5 0 00.95-1.634l.496-1.24a1.5 1.5 0 011.028-1.028l1.24-.496a1.5 1.5 0 001.634-.95l-.174-2.036A1.875 1.875 0 019.646 2.25h1.432zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" /></svg>
);
const MicrophoneIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" strokeWidth="1.5"><path d="M12 1.75a3.25 3.25 0 00-3.25 3.25v7.5a3.25 3.25 0 006.5 0v-7.5A3.25 3.25 0 0012 1.75z" /><path d="M8.25 12.5a.75.75 0 000 1.5v1.25a4.75 4.75 0 004.75 4.75h0a4.75 4.75 0 004.75-4.75V14a.75.75 0 000-1.5h-.5a.75.75 0 00-.75.75v1.25a3.25 3.25 0 01-3.25 3.25h0A3.25 3.25 0 019.5 15.25V14a.75.75 0 00-.75-.75h-.5z" /></svg>
);
const CopyIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 3.75H9.75a1.125 1.125 0 0 0-1.125 1.125v11.25a1.125 1.125 0 0 0 1.125 1.125h9.75a1.125 1.125 0 0 0 1.125-1.125V8.25L15 3.75z" />
    </svg>
);
const CheckIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
);
const ThumbsUpIcon = ({ className, solid }: { className?: string, solid?: boolean }) => (
    <svg className={className} viewBox="0 0 24 24" fill={solid ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H6.633a1.875 1.875 0 01-1.875-1.875V11.25a1.875 1.875 0 011.875-1.875z" />
    </svg>
);
const ThumbsDownIcon = ({ className, solid }: { className?: string, solid?: boolean }) => (
    <svg className={className} viewBox="0 0 24 24" fill={solid ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.867 15.842a4.501 4.501 0 00-1.233 1.842A4.5 4.5 0 006.75 21a2.25 2.25 0 002.25-2.25c0-1.152.26-2.243.723-3.218.266-.558-.107-1.282-.725-1.282H6.126c-1.026 0-1.945-.694-2.054-1.715A12.134 12.134 0 013.82 11.25c0-1.39.223-2.732.637-3.996.413-1.265 1.513-2.176 2.86-2.292a48.814 48.814 0 019.166 0c1.348.116 2.447 1.027 2.86 2.292.414 1.264.637 2.606.637 3.996a12.134 12.134 0 01-.252 1.281c-.11.51-.63.9-1.154.9H13.5c-.618 0-.99.724-.725 1.282.463.975.723 2.066.723 3.218a2.25 2.25 0 01-2.25 2.25a4.501 4.501 0 01-1.233-1.842c-.29-.63-.847-1.151-1.488-1.503a9.04 9.04 0 00-2.86-1.653c-.723-.384-1.35-.956-1.653-1.715a4.498 4.498 0 00-.322-1.672V9a.75.75 0 00-.75-.75A2.25 2.25 0 007.5 6.75v1.515z" />
    </svg>
);
const SpeakerWaveIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l-6 6H3.75v3h1.5l6 6V4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 8.25c1.5 1.5 1.5 3.75 0 5.25" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 4.5c3 3 3 7.5 0 10.5" />
    </svg>
);
const StopIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" /></svg>
);
const ArrowPathIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-11.667 0a8.25 8.25 0 0111.667 0l3.181 3.183" />
    </svg>
);
const ShareIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-.75m-6 3.75l3 3m0 0l3-3m-3 3V1.5m-3 4.5h.008v.008H7.5V6z" />
    </svg>
);
const GlobeAltIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c.502 0 1.004-.028 1.495-.082A5.985 5.985 0 0115.75 12c0-1.396-.39-2.712-1.07-3.801M12 3c.502 0 1.004.028 1.495.082A5.985 5.985 0 0115.75 12c0 1.396-.39-2.712-1.07-3.801M3.284 9.251a9.004 9.004 0 010 5.498M20.716 9.251a9.004 9.004 0 000 5.498M12 3a8.965 8.965 0 015.262 1.547M12 3a8.965 8.965 0 00-5.262 1.547m10.524 0a8.965 8.965 0 01-5.262-1.547m5.262 1.547a8.965 8.965 0 00-5.262-1.547M12 12a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" /></svg>
);
const AcademicCapIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0l-2.072-1.037m2.072 1.037a51.594 51.594 0 002.072 1.037m15.482 0l2.072-1.037m-2.072 1.037a51.594 51.594 0 00-2.072 1.037M12 11.314v1.514" /></svg>
);
const ChatBubbleLeftRightIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.72.335c-.44.04-.88.16-1.284.398a11.916 11.916 0 01-3.692 2.308c-1.517.84-3.324.84-4.841 0a11.916 11.916 0 01-3.692-2.308c-.404-.238-.844-.358-1.284-.398l-3.72-.335A2.25 2.25 0 012.25 15v-4.286c0-.97.616-1.813 1.5-2.097v-.632a2.25 2.25 0 012.25-2.25h15A2.25 2.25 0 0121.75 6v.632zM12 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 15.75c0-1.136.847-2.1 1.98-2.193l3.72-.335c.44-.04.88-.16 1.284-.398a11.938 11.938 0 013.692-2.308c1.517-.84 3.324-.84 4.841 0a11.938 11.938 0 013.692 2.308c.404.238.844.358 1.284.398l3.72.335a2.25 2.25 0 012.25 2.25v.632c0 .97-.616 1.813-1.5 2.097M12 15.75a.75.75 0 100-1.5.75.75 0 000 1.5z" /></svg>
);
const MoonIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
);
const SunIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
);
const DocumentPlusIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
);
const ArrowDownTrayIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
);
const ArrowUpTrayIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
);


// --- UTILITY FUNCTIONS ---
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

type Capability = 'Chat' | 'Deep Research' | 'Image Generation' | 'Image Edit' | 'Video Generation';

// --- CAPABILITY/WELCOME COMPONENTS ---
const WelcomeScreen = ({ onSuggestionClick, onCapabilitySelect, isDarkMode }: { 
    onSuggestionClick: (prompt: string, files: AttachedFile[]) => void;
    onCapabilitySelect: (capability: Capability, modalPrompt?: string) => void;
    isDarkMode: boolean;
}) => {
    const suggestions = [
        {
            title: 'Create a photorealistic image of a cat wearing a wizard hat',
            image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2043&auto=format&fit=crop',
            action: () => onCapabilitySelect('Image Generation', 'A photorealistic image of a cat wearing a wizard hat'),
        },
        {
            title: 'Explain the theory of relativity like I\'m five',
            image: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=2071&auto=format&fit=crop',
            action: () => {
                onCapabilitySelect('Deep Research');
                onSuggestionClick('Explain the theory of relativity like I\'m five', []);
            },
        },
        {
            title: 'Generate a video of a serene mountain landscape at sunrise',
            image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop',
            action: () => onCapabilitySelect('Video Generation', 'A serene mountain landscape at sunrise'),
        },
        {
            title: 'Write a short story about a detective who is also a ghost',
            image: 'https://images.unsplash.com/photo-1535083783855-FD5013b14508?q=80&w=1974&auto=format&fit=crop',
            action: () => onSuggestionClick('Write a short story about a detective who is also a ghost', []),
        },
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full p-4">
             <div className="text-center mb-8">
                <h2 className={`text-4xl font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>How can I help you today?</h2>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-6xl">
                {suggestions.map((item, index) => (
                    <button key={index} onClick={item.action} className="group relative rounded-2xl overflow-hidden h-48 text-left shadow-lg hover:shadow-2xl transition-shadow">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                        <p className="absolute bottom-4 left-4 right-4 font-semibold text-white text-lg">{item.title}</p>
                    </button>
                ))}
             </div>
        </div>
    );
}

const Header = ({ activeCapability, onSelect, onSettingsClick, isDarkMode, onToggleDarkMode, onSaveChat, onLoadChat, onNewChat }: {
    activeCapability: Capability;
    onSelect: (capability: Capability) => void;
    onSettingsClick: () => void;
    isDarkMode: boolean;
    onToggleDarkMode: () => void;
    onSaveChat: () => void;
    onLoadChat: () => void;
    onNewChat: () => void;
}) => {
    const capabilities: { name: Capability, icon: React.ReactNode }[] = [
        { name: 'Chat', icon: <ChatBubbleLeftRightIcon className="w-5 h-5" /> },
        { name: 'Deep Research', icon: <AcademicCapIcon className="w-5 h-5" /> },
        { name: 'Image Generation', icon: <SparklesIcon className="w-5 h-5" /> },
        { name: 'Image Edit', icon: <PhotoIcon className="w-5 h-5" /> },
        { name: 'Video Generation', icon: <VideoCameraIcon className="w-5 h-5" /> },
    ];
    
    const iconButtonClass = `p-2 rounded-full ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`;

    return (
        <header className={`${isDarkMode ? 'bg-gray-900/80 text-gray-200' : 'bg-white/80 text-gray-800'} backdrop-blur-sm z-10 sticky top-0`}>
            <div className={`p-4 flex justify-between items-center border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h1 className="text-xl font-bold">Gemini</h1>
                <div className="flex items-center gap-1">
                    <button onClick={onNewChat} className={iconButtonClass} title="New Chat"><DocumentPlusIcon className="w-6 h-6" /></button>
                    <button onClick={onSaveChat} className={iconButtonClass} title="Save Chat"><ArrowDownTrayIcon className="w-6 h-6" /></button>
                    <button onClick={onLoadChat} className={iconButtonClass} title="Load Chat"><ArrowUpTrayIcon className="w-6 h-6" /></button>
                    <div className={`w-px h-6 mx-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                    <button onClick={onToggleDarkMode} className={iconButtonClass} aria-label="Toggle dark mode">
                        {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                    </button>
                    <button onClick={onSettingsClick} className={iconButtonClass} aria-label="Open Settings"><CogIcon className="w-6 h-6" /></button>
                </div>
            </div>
            <div className={`px-4 py-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} overflow-x-auto scrollbar-hide`}>
                 <div className="flex items-center gap-2">
                    {capabilities.map(({ name, icon }) => (
                        <button 
                            key={name} 
                            onClick={() => onSelect(name)} 
                            role="tab"
                            aria-selected={activeCapability === name}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                                activeCapability === name 
                                ? 'bg-blue-600 text-white' 
                                : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                        >
                            {icon}
                            <span>{name}</span>
                        </button>
                    ))}
                 </div>
            </div>
        </header>
    );
};

// --- UI COMPONENTS ---
const VideoPlayer = ({ src }: { src: string }) => (
    <div className="mt-2">
        <video controls src={src} className="rounded-lg w-full max-w-md" />
    </div>
);

interface MessageActionsProps {
  message: Message;
  isLastMessage: boolean;
  onRegenerate: () => void;
  onPlayAudio: (messageId: string, text: string) => void;
  onStopAudio: () => void;
  currentlyPlayingId: string | null;
  isTtsLoading: string | null;
  isDarkMode: boolean;
}

const MessageActions: React.FC<MessageActionsProps> = ({ message, isLastMessage, onRegenerate, onPlayAudio, onStopAudio, currentlyPlayingId, isTtsLoading, isDarkMode }) => {
    const [copied, setCopied] = useState(false);
    const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

    const handleCopy = () => {
        navigator.clipboard.writeText(message.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = () => {
        if(navigator.share) {
            navigator.share({
                title: 'Gemini Response',
                text: message.text,
            }).catch(console.error);
        } else {
            handleCopy(); // Fallback to copy
        }
    }

    const isPlaying = currentlyPlayingId === message.id;
    const isLoading = isTtsLoading === message.id;

    const buttonClass = `p-1.5 rounded-full ${isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-300'}`;

    return (
        <div className={`mt-2 pt-2 flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <button title={copied ? "Copied!" : "Copy"} onClick={handleCopy} className={buttonClass}>
                {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
            </button>
            <button title="Good response" onClick={() => setFeedback(f => f === 'up' ? null : 'up')} className={buttonClass}>
                <ThumbsUpIcon solid={feedback === 'up'} className={`w-4 h-4 ${feedback === 'up' ? 'text-blue-500' : ''}`} />
            </button>
            <button title="Bad response" onClick={() => setFeedback(f => f === 'down' ? null : 'down')} className={buttonClass}>
                 <ThumbsDownIcon solid={feedback === 'down'} className={`w-4 h-4 ${feedback === 'down' ? 'text-red-500' : ''}`} />
            </button>
             <button title={isPlaying ? "Stop" : "Read aloud"} onClick={() => isPlaying ? onStopAudio() : onPlayAudio(message.id, message.text)} className={buttonClass} disabled={isLoading}>
                {isLoading ? (
                    <div className={`w-4 h-4 border-2 ${isDarkMode ? 'border-gray-500' : 'border-gray-400'} border-t-gray-300 rounded-full animate-spin`}></div>
                ) : isPlaying ? (
                    <StopIcon className="w-4 h-4" />
                ) : (
                    <SpeakerWaveIcon className="w-4 h-4" />
                )}
            </button>
            <button title="Share" onClick={handleShare} className={buttonClass}>
                <ShareIcon className="w-4 h-4" />
            </button>
            {isLastMessage && (
                 <button title="Regenerate" onClick={onRegenerate} className={buttonClass}>
                    <ArrowPathIcon className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

interface ChatMessageProps {
  message: Message;
  isLastMessage: boolean;
  onRegenerate: () => void;
  onPlayAudio: (messageId: string, text: string) => void;
  onStopAudio: () => void;
  currentlyPlayingId: string | null;
  isTtsLoading: string | null;
  isDarkMode: boolean;
}
const ChatMessage: React.FC<ChatMessageProps> = (props) => {
    const { message, isDarkMode } = props;
    const isUser = message.author === MessageAuthor.USER;
    const isSystem = message.author === MessageAuthor.SYSTEM;

    if (isSystem) {
        return (
            <div className={`text-center text-xs my-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{message.text}</div>
        );
    }

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-xl lg:max-w-2xl px-4 py-3 rounded-2xl ${isUser ? 'bg-blue-600 text-white rounded-br-none' : `${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800'} rounded-bl-none`}`}>
                {message.text && message.text.split('\n').map((line, index) => <p key={index} className="mb-1 last:mb-0">{line}</p>)}
                {message.images && message.images.length > 0 && (
                    <div className={`mt-2 grid gap-2 ${message.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {message.images.map((img, idx) => (
                            <img key={idx} src={img} alt="Chat content" className="rounded-lg object-cover" />
                        ))}
                    </div>
                )}
                {message.videoUrl && <VideoPlayer src={message.videoUrl} />}
                {message.sources && message.sources.length > 0 && (
                  <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    <h4 className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sources:</h4>
                    <div className="flex flex-wrap gap-2">
                       {message.sources.map((source, idx) => {
                        const sourceClass = isDarkMode ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' : 'bg-gray-300 hover:bg-gray-400 text-gray-700';
                        if (source.web) {
                          return (
                            <a key={`web-${idx}`} href={source.web.uri} target="_blank" rel="noopener noreferrer" className={`text-xs px-2 py-1 rounded-full truncate ${sourceClass}`}>
                              {source.web.title || new URL(source.web.uri).hostname}
                            </a>
                          );
                        }
                        if (source.maps) {
                          const placeSources = source.maps.placeAnswerSources?.[0]?.reviewSnippets || [];
                          return (
                            <React.Fragment key={`map-${idx}`}>
                                <a href={source.maps.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-green-800 hover:bg-green-700 text-white px-2 py-1 rounded-full truncate">
                                    📍 {source.maps.title}
                                </a>
                                {placeSources.map((review, rIdx) => (
                                    <a key={`review-${rIdx}`} href={review.uri} target="_blank" rel="noopener noreferrer" className={`text-xs px-2 py-1 rounded-full truncate ${sourceClass}`}>
                                        "{review.snippet}"
                                    </a>
                                ))}
                            </React.Fragment>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}
                {!isUser && message.text && <MessageActions {...props} />}
            </div>
        </div>
    );
};

interface ChatInputProps {
    onSendMessage: (prompt: string, files: AttachedFile[]) => void;
    isLoading: boolean;
    onPromptChange: () => void;
    settings: Settings;
    onSettingsChange: (settings: Settings) => void;
    activeCapability: Capability;
    isDarkMode: boolean;
}
const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, onPromptChange, settings, onSettingsChange, activeCapability, isDarkMode }) => {
    const [prompt, setPrompt] = useState('');
    const [showActions, setShowActions] = useState(false);
    const [files, setFiles] = useState<AttachedFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any | null>(null);
    const promptBeforeListening = useRef<string>('');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const isSpeechRecognitionSupported = !!SpeechRecognition;

    useEffect(() => {
        return () => {
            recognitionRef.current?.stop();
        };
    }, []);

    const handleMicClick = () => {
        if (!isSpeechRecognitionSupported) {
            console.error("Speech Recognition is not supported by this browser.");
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            promptBeforeListening.current = prompt;
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => { setIsListening(false); recognitionRef.current = null; };
            recognition.onerror = (event: any) => { console.error('Speech recognition error:', event.error); setIsListening(false); };
            recognition.onresult = (event: any) => {
                const newTranscript = Array.from(event.results).map((result: any) => result[0].transcript).join('');
                const prefix = promptBeforeListening.current ? promptBeforeListening.current + ' ' : '';
                setPrompt(prefix + newTranscript);
                onPromptChange();
            };
            
            recognitionRef.current = recognition;
            recognition.start();
        }
    };

    const handleSendMessage = () => {
        if ((prompt.trim() || files.length > 0) && !isLoading) {
             if (isListening) {
                recognitionRef.current?.stop();
            }
            onSendMessage(prompt, files);
            setPrompt('');
            setFiles([]);
        }
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const fileList = Array.from(event.target.files);
            const newFiles: AttachedFile[] = await Promise.all(
                fileList.map(async (file: File) => ({ name: file.name, type: file.type, dataUrl: await fileToBase64(file) }))
            );
            setFiles(prev => [...prev, ...newFiles]);
            setShowActions(false);
            event.target.value = '';
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            const scrollHeight = textAreaRef.current.scrollHeight;
            textAreaRef.current.style.height = `${scrollHeight}px`;
        }
    }, [prompt]);

    const placeholderText = {
        'Chat': 'Message Gemini...',
        'Deep Research': 'Enter a research topic...',
        'Image Generation': 'Describe an image to generate...',
        'Image Edit': 'Describe how to edit your image...',
        'Video Generation': 'Describe a video to generate...',
    }[activeCapability];

    const buttonClass = `p-2 rounded-full transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'}`;
    const webSearchButtonClass = `p-2 rounded-full transition-colors ${settings.webSearch ? 'text-white bg-blue-600' : buttonClass.replace('transition-colors', '')}`;

    return (
        <div className={`p-4 border-t ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`relative rounded-2xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                {files.length > 0 && (
                    <div className={`p-2 flex flex-wrap gap-2 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                        {files.map((file, index) => (
                           <div key={index} className={`flex items-center gap-2 text-sm rounded-full pl-3 pr-1 py-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                <span>{file.name}</span>
                                <button onClick={() => removeFile(index)} className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-300'}`}>
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-end p-2 gap-2">
                    <div className="relative">
                        <button onClick={() => setShowActions(!showActions)} className={buttonClass} aria-label="Attach file">
                            <PlusIcon className="w-6 h-6" />
                        </button>
                        {showActions && (
                            <div className={`absolute bottom-full mb-2 left-0 p-1 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                                <button onClick={() => cameraInputRef.current?.click()} className={`${buttonClass} w-full flex items-center gap-2 text-left p-2`}><CameraIcon className="w-5 h-5"/><span>Camera</span></button>
                                <button onClick={() => fileInputRef.current?.click()} className={`${buttonClass} w-full flex items-center gap-2 text-left p-2`}><FileIcon className="w-5 h-5"/><span>File</span></button>
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
                        <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} className="hidden" />
                    </div>
                    
                    <textarea
                        ref={textAreaRef}
                        value={prompt}
                        onChange={(e) => { setPrompt(e.target.value); onPromptChange(); }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder={placeholderText}
                        rows={1}
                        className={`flex-1 resize-none bg-transparent outline-none py-2 px-3 text-base ${isDarkMode ? 'text-gray-200 placeholder-gray-400' : 'text-gray-800 placeholder-gray-500'} scrollbar-hide`}
                        disabled={isLoading}
                    />

                    {isSpeechRecognitionSupported && (
                        <button onClick={handleMicClick} className={`${buttonClass} ${isListening ? 'text-red-500' : ''}`} aria-label={isListening ? 'Stop listening' : 'Start listening'}>
                            <MicrophoneIcon className="w-6 h-6" />
                        </button>
                    )}

                    <button onClick={handleSendMessage} disabled={isLoading || (!prompt.trim() && files.length === 0)} className={`p-3 rounded-full transition-colors ${isLoading || (!prompt.trim() && files.length === 0) ? (isDarkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-200 text-gray-400') : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <SendIcon className="w-6 h-6" />
                        )}
                    </button>
                </div>
                {activeCapability === 'Deep Research' && (
                    <div className={`px-4 pb-2 flex items-center gap-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={settings.webSearch} onChange={e => onSettingsChange({ ...settings, webSearch: e.target.checked })} className="form-checkbox h-4 w-4 rounded text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-600" />
                            <span>Web Search</span>
                        </label>
                         <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={settings.thinkingMode} onChange={e => onSettingsChange({ ...settings, thinkingMode: e.target.checked })} className="form-checkbox h-4 w-4 rounded text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-600" />
                            <span>Thinking Mode</span>
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MODAL COMPONENTS ---
// FIX: Made children prop optional to resolve TypeScript error.
const Modal = ({ isOpen, onClose, title, children, isDarkMode }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode, isDarkMode: boolean }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className={`rounded-2xl shadow-xl w-full max-w-lg ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'}`} onClick={e => e.stopPropagation()}>
                <div className={`flex justify-between items-center p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button onClick={onClose} className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

// FIX: Refactored SettingsModal to destructure props explicitly and avoid using a rest/spread pattern that was causing type inference issues.
const SettingsModal = ({ settings, onUpdate, isOpen, onClose, isDarkMode }: { settings: Settings, onUpdate: (newSettings: Settings) => void } & { isOpen: boolean, onClose: () => void, isDarkMode: boolean }) => {
    const [localSettings, setLocalSettings] = useState(settings);
    
    useEffect(() => {
      setLocalSettings(settings);
    }, [settings, isOpen]);

    const handleChange = (key: keyof Settings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        onUpdate(localSettings);
        onClose();
    };
    
    const labelClass = `block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`;
    const selectClass = `w-full p-2 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-black'}`;
    const checkboxLabelClass = `flex items-center gap-2 cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`;
    const checkboxClass = `h-4 w-4 rounded text-blue-600 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-600 border-gray-500' : 'bg-gray-200 border-gray-300'}`;

    return (
        <Modal title="Settings" isOpen={isOpen} onClose={onClose} isDarkMode={isDarkMode}>
            <div className="space-y-6">
                <div>
                    <label className={labelClass}>Model Speed</label>
                    <select value={localSettings.modelSpeed} onChange={e => handleChange('modelSpeed', e.target.value)} className={selectClass}>
                        {Object.values(ModelSpeed).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Response Style</label>
                    <select value={localSettings.responseStyle} onChange={e => handleChange('responseStyle', e.target.value)} className={selectClass}>
                        {Object.values(ResponseStyle).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                 <div>
                    <label className={labelClass}>Text-to-Speech Voice</label>
                    <select value={localSettings.ttsVoice} onChange={e => handleChange('ttsVoice', e.target.value as TTSVoice)} className={selectClass}>
                        {['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className={checkboxLabelClass}>
                        <input type="checkbox" checked={localSettings.webSearch} onChange={e => handleChange('webSearch', e.target.checked)} className={checkboxClass}/>
                        <span>Enable Web Search</span>
                    </label>
                    <label className={checkboxLabelClass}>
                        <input type="checkbox" checked={localSettings.mapsSearch} onChange={e => handleChange('mapsSearch', e.target.checked)} className={checkboxClass}/>
                        <span>Enable Maps Search</span>
                    </label>
                    <label className={checkboxLabelClass}>
                        <input type="checkbox" checked={localSettings.thinkingMode} onChange={e => handleChange('thinkingMode', e.target.checked)} className={checkboxClass}/>
                        <span>Enable Thinking Mode (Expert Model Only)</span>
                    </label>
                </div>
                <div className="flex justify-end pt-4">
                     <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Save</button>
                </div>
            </div>
        </Modal>
    );
};

// FIX: Made children prop optional to resolve TypeScript error.
const FileDropZone = ({ onFileDrop, isDarkMode, children }: { onFileDrop: (file: AttachedFile) => void; isDarkMode: boolean; children?: React.ReactNode }) => {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File | null) => {
        if (file && file.type.startsWith('image/')) {
            const dataUrl = await fileToBase64(file);
            onFileDrop({ name: file.name, type: file.type, dataUrl });
        }
    };
    
    return (
        <div 
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${isDragging ? 'border-blue-500 bg-blue-500/10' : (isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400')}`}
        >
            <input type="file" accept="image/*" ref={inputRef} onChange={e => handleFile(e.target.files?.[0] || null)} className="hidden" />
            {children}
        </div>
    );
};

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
    // State management
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [settings, setSettings] = useState<Settings>({
        modelSpeed: ModelSpeed.AUTO,
        responseStyle: ResponseStyle.NORMAL,
        webSearch: true,
        mapsSearch: true,
        thinkingMode: false,
        ttsVoice: 'Kore',
    });
    const [activeCapability, setActiveCapability] = useState<Capability>('Chat');

    // Modal states
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isImageGenOpen, setIsImageGenOpen] = useState(false);
    const [isImageEditOpen, setIsImageEditOpen] = useState(false);
    const [isVideoGenOpen, setIsVideoGenOpen] = useState(false);
    const [hasVeoApiKey, setHasVeoApiKey] = useState(false);

    // Modal-specific state
    const [imageGenPrompt, setImageGenPrompt] = useState('');
    const [imageEditPrompt, setImageEditPrompt] = useState('');
    const [imageToEdit, setImageToEdit] = useState<AttachedFile | null>(null);
    const [videoGenPrompt, setVideoGenPrompt] = useState('');
    const [videoImage, setVideoImage] = useState<AttachedFile | null>(null);
    const [videoGenStatus, setVideoGenStatus] = useState('');
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState('');

    // TTS state
    const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
    const [isTtsLoading, setIsTtsLoading] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);


    // Other refs and state
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [lastUserMessage, setLastUserMessage] = useState<{ prompt: string, files: AttachedFile[] } | null>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);

    // --- EFFECTS ---
    useEffect(() => {
        chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
            (error) => console.warn("Could not get user location:", error.message)
        );
    }, []);

    const addMessage = (author: MessageAuthor, text: string, options: Partial<Omit<Message, 'id' | 'author' | 'text'>> = {}) => {
      setMessages(prev => [...prev, { id: Date.now().toString(), author, text, ...options }]);
    };

    const handleSendMessage = async (prompt: string, files: AttachedFile[]) => {
        setSuggestions([]);
        setIsLoading(true);
        setLastUserMessage({ prompt, files });

        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        addMessage(MessageAuthor.USER, prompt, { images: imageFiles.map(f => f.dataUrl), files: files });
        
        try {
            const response = await generateChatResponse(prompt, messages, settings, files, userLocation);
            const text = response.text;
            const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] || [];
            addMessage(MessageAuthor.AI, text, { sources });
            
            const newHistory = [...messages, {id: 'temp-user', author: MessageAuthor.USER, text: prompt}, {id: 'temp-ai', author: MessageAuthor.AI, text: text}];
            const followupSuggestions = await generateSuggestions(newHistory);
            setSuggestions(followupSuggestions);
        } catch (error) {
            console.error("Error generating response:", error);
            addMessage(MessageAuthor.SYSTEM, "Sorry, I encountered an error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRegenerate = () => {
      if (lastUserMessage) {
        setMessages(prev => prev.slice(0, -1)); // Remove last AI response
        handleSendMessage(lastUserMessage.prompt, lastUserMessage.files);
      }
    };
    
    const handleCapabilitySelect = async (capability: Capability, modalPrompt: string = '') => {
        setActiveCapability(capability);
        if (capability === 'Image Generation') {
            setImageGenPrompt(modalPrompt);
            setIsImageGenOpen(true);
        } else if (capability === 'Image Edit') {
            setImageEditPrompt(modalPrompt);
            setImageToEdit(null);
            setIsImageEditOpen(true);
        } else if (capability === 'Video Generation') {
            setVideoGenPrompt(modalPrompt);
            setVideoImage(null);
            setGeneratedVideoUrl('');
            setVideoGenStatus('');
            
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if(!hasKey) {
                setHasVeoApiKey(false);
            }
            setIsVideoGenOpen(true);
        } else if (capability === 'Deep Research') {
            setSettings(s => ({ ...s, webSearch: true, modelSpeed: ModelSpeed.EXPERT }));
        }
    };

    const handleSuggestionClick = (prompt: string, files: AttachedFile[] = []) => {
      handleSendMessage(prompt, files);
    };

    const handleGenerateImage = async (prompt: string, aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4') => {
        setIsImageGenOpen(false);
        setIsLoading(true);
        addMessage(MessageAuthor.SYSTEM, `Generating an image for: "${prompt}"`);
        try {
            const imageUrl = await generateImage(prompt, aspectRatio);
            addMessage(MessageAuthor.AI, `Here's the image you requested.`, { images: [imageUrl] });
        } catch (e) {
            addMessage(MessageAuthor.SYSTEM, "Sorry, I couldn't generate the image.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditImage = async (prompt: string, file: AttachedFile) => {
        setIsImageEditOpen(false);
        setIsLoading(true);
        addMessage(MessageAuthor.SYSTEM, `Editing image with prompt: "${prompt}"`);
        try {
            const imageUrl = await editImage(prompt, file);
            addMessage(MessageAuthor.AI, `Here's the edited image.`, { images: [imageUrl] });
        } catch (e) {
            addMessage(MessageAuthor.SYSTEM, "Sorry, I couldn't edit the image.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateVideo = async (prompt: string, image: AttachedFile | null, aspectRatio: '16:9' | '9:16') => {
        setVideoGenStatus('Initializing video generation...');
        try {
            let operation = await generateVideo(prompt, image, aspectRatio);
            setVideoGenStatus('Processing video... This may take a few minutes.');
            
            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await pollVideoOperation(operation);
            }
            
            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                setVideoGenStatus('Fetching video file...');
                const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                const blob = await response.blob();
                const videoUrl = URL.createObjectURL(blob);
                setGeneratedVideoUrl(videoUrl);
                setVideoGenStatus('Video generated successfully!');
            } else {
                throw new Error("Video generation completed but no URL was found.");
            }
        } catch (e: any) {
            console.error("Video generation failed:", e);
            let errorMessage = "Sorry, video generation failed.";
            if (e.message?.includes("Requested entity was not found")) {
              errorMessage += " Your API key might be invalid. Please re-select your key.";
              setHasVeoApiKey(false); // Reset key state
            }
            setVideoGenStatus(errorMessage);
        }
    };

    const handlePlayAudio = async (messageId: string, text: string) => {
        handleStopAudio();
        setIsTtsLoading(messageId);
        try {
            const base64Audio = await generateSpeech(text, settings.ttsVoice);
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const audioBuffer = await decodeAudioData(decode(base64Audio), audioContextRef.current, 24000, 1);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.onended = () => {
                setCurrentlyPlayingId(null);
                audioSourceRef.current = null;
            };
            source.start();
            audioSourceRef.current = source;
            setCurrentlyPlayingId(messageId);
        } catch (e) {
            console.error("TTS Error:", e);
            addMessage(MessageAuthor.SYSTEM, "Text-to-speech failed.");
        } finally {
            setIsTtsLoading(null);
        }
    };

    const handleStopAudio = () => {
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
            audioSourceRef.current.disconnect();
            audioSourceRef.current = null;
            setCurrentlyPlayingId(null);
        }
    };

    const handleNewChat = () => {
        setMessages([]);
        setSuggestions([]);
        setLastUserMessage(null);
    };

    const handleSaveChat = () => {
        try {
            localStorage.setItem('geminiChatHistory', JSON.stringify(messages));
            addMessage(MessageAuthor.SYSTEM, "Chat history saved successfully!");
        } catch (e) {
            addMessage(MessageAuthor.SYSTEM, "Could not save chat history.");
        }
    };

    const handleLoadChat = () => {
        try {
            const savedHistory = localStorage.getItem('geminiChatHistory');
            if (savedHistory) {
                setMessages(JSON.parse(savedHistory));
                addMessage(MessageAuthor.SYSTEM, "Chat history loaded successfully!");
            } else {
                addMessage(MessageAuthor.SYSTEM, "No saved chat history found.");
            }
        } catch (e) {
            addMessage(MessageAuthor.SYSTEM, "Could not load chat history.");
        }
    };

    return (
        <div className={`flex flex-col h-screen font-sans ${isDarkMode ? 'dark bg-gray-900 text-gray-200' : 'bg-white text-gray-800'}`}>
            <Header
                activeCapability={activeCapability}
                onSelect={handleCapabilitySelect}
                onSettingsClick={() => setIsSettingsOpen(true)}
                isDarkMode={isDarkMode}
                onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                onSaveChat={handleSaveChat}
                onLoadChat={handleLoadChat}
                onNewChat={handleNewChat}
            />

            <main className="flex-1 overflow-y-auto p-4 md:p-6" ref={chatContainerRef}>
                <div className="max-w-4xl mx-auto">
                    {messages.length === 0 ? (
                        <WelcomeScreen onSuggestionClick={handleSuggestionClick} onCapabilitySelect={handleCapabilitySelect} isDarkMode={isDarkMode}/>
                    ) : (
                        messages.map((msg, idx) => (
                            <ChatMessage
                                key={msg.id}
                                message={msg}
                                isLastMessage={idx === messages.length - 1 && msg.author === MessageAuthor.AI}
                                onRegenerate={handleRegenerate}
                                onPlayAudio={handlePlayAudio}
                                onStopAudio={handleStopAudio}
                                currentlyPlayingId={currentlyPlayingId}
                                isTtsLoading={isTtsLoading}
                                isDarkMode={isDarkMode}
                            />
                        ))
                    )}
                    {isLoading && (
                        <div className="flex justify-start mb-4">
                            <div className={`max-w-xl px-4 py-3 rounded-2xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-bl-none`}>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75"></div>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    {!isLoading && messages.length > 0 && suggestions.length > 0 && (
                        <div className="flex justify-end gap-2 my-4">
                            {suggestions.map((s, i) => (
                                <button key={i} onClick={() => handleSuggestionClick(s)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>{s}</button>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                onPromptChange={() => setSuggestions([])}
                settings={settings}
                onSettingsChange={setSettings}
                activeCapability={activeCapability}
                isDarkMode={isDarkMode}
            />

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onUpdate={setSettings} isDarkMode={isDarkMode} />
            
            <Modal isOpen={isImageGenOpen} onClose={() => setIsImageGenOpen(false)} title="Image Generation" isDarkMode={isDarkMode}>
                <ImageGenerationModal onSubmit={handleGenerateImage} initialPrompt={imageGenPrompt} isLoading={isLoading} isDarkMode={isDarkMode} />
            </Modal>
            
            <Modal isOpen={isImageEditOpen} onClose={() => setIsImageEditOpen(false)} title="Image Edit" isDarkMode={isDarkMode}>
                <ImageEditModal onSubmit={handleEditImage} initialPrompt={imageEditPrompt} isLoading={isLoading} isDarkMode={isDarkMode} />
            </Modal>
            
            <Modal isOpen={isVideoGenOpen} onClose={() => setIsVideoGenOpen(false)} title="Video Generation" isDarkMode={isDarkMode}>
                <VideoGenerationModal onSubmit={handleGenerateVideo} initialPrompt={videoGenPrompt} isLoading={videoGenStatus.includes('...')} isDarkMode={isDarkMode} status={videoGenStatus} generatedVideoUrl={generatedVideoUrl} hasApiKey={hasVeoApiKey} setHasApiKey={setHasVeoApiKey} />
            </Modal>
        </div>
    );
};

const ImageGenerationModal = ({ onSubmit, initialPrompt, isLoading, isDarkMode }: { onSubmit: (prompt: string, aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4') => void, initialPrompt: string, isLoading: boolean, isDarkMode: boolean }) => {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
    const aspects: ('1:1' | '16:9' | '9:16' | '4:3' | '3:4')[] = ['1:1', '16:9', '9:16', '4:3', '3:4'];

    useEffect(() => setPrompt(initialPrompt), [initialPrompt]);
    
    return (
        <div className="space-y-4">
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Enter a detailed prompt..." rows={4} className={`w-full p-2 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`} />
            <div className="grid grid-cols-5 gap-2">
                {aspects.map(ar => <button key={ar} onClick={() => setAspectRatio(ar)} className={`py-2 rounded-md text-sm ${aspectRatio === ar ? 'bg-blue-600 text-white' : (isDarkMode ? 'bg-gray-700' : 'bg-gray-200')}`}>{ar}</button>)}
            </div>
            <button onClick={() => onSubmit(prompt, aspectRatio)} disabled={!prompt || isLoading} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-500">Generate</button>
        </div>
    );
};

const ImageEditModal = ({ onSubmit, initialPrompt, isLoading, isDarkMode }: { onSubmit: (prompt: string, file: AttachedFile) => void, initialPrompt: string, isLoading: boolean, isDarkMode: boolean }) => {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [file, setFile] = useState<AttachedFile | null>(null);

    useEffect(() => setPrompt(initialPrompt), [initialPrompt]);

    return (
        <div className="space-y-4">
            <FileDropZone onFileDrop={setFile} isDarkMode={isDarkMode}>
                {file ? <img src={file.dataUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg"/> : <p>Drop an image here or click to select</p>}
            </FileDropZone>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe your edits..." rows={3} className={`w-full p-2 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50'}`} />
            <button onClick={() => file && onSubmit(prompt, file)} disabled={!prompt || !file || isLoading} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-500">Apply Edits</button>
        </div>
    );
};

const VideoGenerationModal = ({ onSubmit, initialPrompt, isLoading, isDarkMode, status, generatedVideoUrl, hasApiKey, setHasApiKey }: { onSubmit: (prompt: string, image: AttachedFile | null, aspectRatio: '16:9' | '9:16') => void, initialPrompt: string, isLoading: boolean, isDarkMode: boolean, status: string, generatedVideoUrl: string, hasApiKey: boolean, setHasApiKey: (has: boolean) => void }) => {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [image, setImage] = useState<AttachedFile | null>(null);
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');

    useEffect(() => setPrompt(initialPrompt), [initialPrompt]);

    const handleSelectKey = async () => {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
    };

    if (!hasApiKey) {
        return (
            <div className="text-center space-y-4">
                <p>To generate videos, you need to select a personal API key with Veo access.</p>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Learn more about billing.</a>
                <button onClick={handleSelectKey} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Select API Key</button>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <FileDropZone onFileDrop={setImage} isDarkMode={isDarkMode}>
                {image ? <img src={image.dataUrl} alt="Preview" className="max-h-32 mx-auto rounded-lg"/> : <p>Drop a starting image (optional)</p>}
            </FileDropZone>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the video..." rows={3} className={`w-full p-2 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50'}`} />
             <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setAspectRatio('16:9')} className={`py-2 rounded-md text-sm ${aspectRatio === '16:9' ? 'bg-blue-600 text-white' : (isDarkMode ? 'bg-gray-700' : 'bg-gray-200')}`}>16:9</button>
                <button onClick={() => setAspectRatio('9:16')} className={`py-2 rounded-md text-sm ${aspectRatio === '9:16' ? 'bg-blue-600 text-white' : (isDarkMode ? 'bg-gray-700' : 'bg-gray-200')}`}>9:16</button>
            </div>
            <button onClick={() => onSubmit(prompt, image, aspectRatio)} disabled={!prompt || isLoading} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-500">
                {isLoading ? 'Generating...' : 'Generate Video'}
            </button>
            {status && <p className="text-center text-sm">{status}</p>}
            {generatedVideoUrl && <VideoPlayer src={generatedVideoUrl} />}
        </div>
    );
};

export default App;