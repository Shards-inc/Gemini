import { GoogleGenAI, GenerateContentResponse, Modality, Operation, LiveServerMessage, Blob, Type } from "@google/genai";
import { Settings, AttachedFile, Message, MessageAuthor } from '../types';

// --- UTILITY FUNCTIONS FOR LIVE API ---
// Decodes a base64 string into a Uint8Array.
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Encodes a Uint8Array into a base64 string.
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Decodes raw PCM audio data into an AudioBuffer for playback.
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Export for use in App component's TTS feature
export { decode, decodeAudioData };


const fileToGenerativePart = (file: AttachedFile) => {
  return {
    inlineData: {
      data: file.dataUrl.split(',')[1],
      mimeType: file.type,
    },
  };
};

const getSystemInstruction = (settings: Settings): string => {
    switch (settings.responseStyle) {
        case 'Learning':
            return 'You are an educator. Your responses should be patient, educational, and help build understanding.';
        case 'Concise':
            return 'Your responses should be shorter and to the point.';
        case 'Explanatory':
            return 'You are a teacher. Provide educational responses for learning.';
        case 'Formal':
            return 'Your responses should be clear and well-structured, in a formal tone.';
        case 'Normal':
        default:
            return 'You are a helpful assistant.';
    }
};

const getModelName = (settings: Settings): string => {
    switch(settings.modelSpeed) {
        case 'Lite':
            // FIX: Use the recommended model name for Gemini Flash Lite.
            return 'gemini-flash-lite-latest';
        case 'Fast':
            return 'gemini-2.5-flash';
        case 'Expert':
            return 'gemini-2.5-pro';
        case 'Auto':
        default:
            return 'gemini-2.5-flash'; // Defaulting auto to flash for this demo
    }
};

export const generateChatResponse = async (
  prompt: string,
  history: Message[],
  settings: Settings,
  files: AttachedFile[],
  userLocation: { latitude: number; longitude: number } | null
): Promise<GenerateContentResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const hasVideo = files.some(f => f.type.startsWith('video/'));
  // Force expert model if a video is attached, or if thinking mode is on.
  const model = hasVideo || settings.thinkingMode ? 'gemini-2.5-pro' : getModelName(settings);
  const systemInstruction = getSystemInstruction(settings);

  const textPart = { text: prompt };
  
  const mediaParts = files
    .filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
    .map(fileToGenerativePart);
  
  const textFiles = files.filter(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'));

  let fileTextContent = '';
  if (textFiles.length > 0) {
      try {
        fileTextContent = "\n\n" + textFiles.map(filePart => {
            const base64Data = filePart.dataUrl.split(',')[1];
            // Assuming text files are UTF-8. A more robust solution might use a library for decoding.
            const decodedData = decodeURIComponent(Array.prototype.map.call(atob(base64Data), c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            return `---BEGIN ATTACHED FILE: ${filePart.name}---\n${decodedData}\n---END ATTACHED FILE---`;
        }).join('\n');
      } catch (e) {
        console.error("Error decoding file content:", e);
        fileTextContent = `\n\n[Error reading one or more attached text files.]`;
      }
  }

  const allParts = [textPart, ...mediaParts];
  if(fileTextContent) {
    allParts.push({ text: fileTextContent });
  }

  const contents = {
      parts: allParts,
  };

  const tools = [];
  if (settings.webSearch) {
    tools.push({ googleSearch: {} });
  }
  if (settings.mapsSearch) {
    tools.push({ googleMaps: {} });
  }

  const toolConfig: { retrievalConfig?: { latLng: { latitude: number, longitude: number } } } = {};
  if (settings.mapsSearch && userLocation) {
    toolConfig.retrievalConfig = { latLng: userLocation };
  }

  const response = await ai.models.generateContent({
    model: model,
    contents,
    config: {
        systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
        toolConfig: Object.keys(toolConfig).length > 0 ? toolConfig : undefined,
        ...(settings.thinkingMode && { thinkingConfig: { thinkingBudget: 32768 } })
    }
  });

  return response;
};

export const generateSuggestions = async (history: Message[]): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const recentHistory = history
        .filter(m => m.author !== MessageAuthor.SYSTEM)
        .slice(-4)
        .map(m => `${m.author === MessageAuthor.USER ? 'User' : 'AI'}: ${m.text}`)
        .join('\n');

    const prompt = `Based on this conversation snippet, provide a list of concise and relevant follow-up questions or actions for the user.
Conversation:
${recentHistory}
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            description: "A list of 3 concise follow-up questions or actions.",
                            items: {
                                type: Type.STRING
                            }
                        }
                    },
                    required: ['suggestions']
                },
                temperature: 0.7,
            }
        });

        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        
        if (result.suggestions && Array.isArray(result.suggestions)) {
            return result.suggestions.slice(0, 3);
        }

        return [];
    } catch (e) {
        console.error("Error generating suggestions:", e);
        return []; // Return empty on error, failing silently
    }
};

// FIX: Refactored to return a data URL string directly, simplifying consumer logic.
export const generateImage = async (prompt: string, aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio,
        }
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        const imageBytes = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${imageBytes}`;
    } else {
        throw new Error("Image generation failed.");
    }
};

// FIX: Refactored to return a data URL string directly, simplifying consumer logic.
export const editImage = async (prompt: string, file: AttachedFile): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imagePart = {
        inlineData: {
            data: file.dataUrl.split(',')[1],
            mimeType: file.type,
        },
    };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const imagePartResponse = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

    if (imagePartResponse?.inlineData) {
      const { data, mimeType } = imagePartResponse.inlineData;
      return `data:${mimeType};base64,${data}`;
    }
    
    throw new Error("Could not extract edited image from response.");
};

export const generateVideo = async (prompt: string, image: AttachedFile | null, aspectRatio: '16:9' | '9:16'): Promise<Operation> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const payload: {
        model: string;
        prompt: string;
        image?: { imageBytes: string; mimeType: string; };
        config: {
            numberOfVideos: number;
            resolution: string;
            aspectRatio: '16:9' | '9:16';
        };
    } = {
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio,
        },
    };

    if (image) {
        payload.image = {
            imageBytes: image.dataUrl.split(',')[1],
            mimeType: image.type,
        };
    }

    const operation = await ai.models.generateVideos(payload);
    return operation;
};

export const pollVideoOperation = async (operation: Operation): Promise<Operation> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const updatedOperation = await ai.operations.getVideosOperation({ operation });
    return updatedOperation;
};


export interface LiveCallbacks {
    onMessage: (message: LiveServerMessage) => void;
    onError: (error: ErrorEvent) => void;
    onClose: (event: CloseEvent) => void;
}

export const startLiveConversation = async (callbacks: LiveCallbacks) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    let stream: MediaStream | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let scriptProcessor: ScriptProcessorNode | null = null;
    let nextStartTime = 0;
    const sources = new Set<AudioBufferSourceNode>();
    
    const outputNode = outputAudioContext.createGain();
    outputNode.connect(outputAudioContext.destination);

    const onMessage = async (message: LiveServerMessage) => {
        callbacks.onMessage(message);

        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64EncodedAudioString) {
            nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), outputAudioContext, 24000, 1);
            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputNode);
            source.addEventListener('ended', () => { sources.delete(source); });

            source.start(nextStartTime);
            nextStartTime = nextStartTime + audioBuffer.duration;
            sources.add(source);
        }

        if (message.serverContent?.interrupted) {
            for (const source of sources.values()) {
                source.stop();
                sources.delete(source);
            }
            nextStartTime = 0;
        }
    };

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: async () => {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                source = inputAudioContext.createMediaStreamSource(stream);
                scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                
                scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                    const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                    const l = inputData.length;
                    const int16 = new Int16Array(l);
                    for (let i = 0; i < l; i++) {
                        int16[i] = inputData[i] * 32768;
                    }
                    const pcmBlob: Blob = {
                        data: encode(new Uint8Array(int16.buffer)),
                        mimeType: 'audio/pcm;rate=16000',
                    };

                    sessionPromise.then((session) => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    });
                };
                source.connect(scriptProcessor);
                scriptProcessor.connect(inputAudioContext.destination);
            },
            onmessage: onMessage,
            onerror: callbacks.onError,
            onclose: callbacks.onClose,
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
        }
    });

    const close = async () => {
        const session = await sessionPromise;
        session.close();
        stream?.getTracks().forEach(track => track.stop());
        source?.disconnect();
        scriptProcessor?.disconnect();
        await inputAudioContext.close();
        await outputAudioContext.close();
    };

    return { close };
};

export const generateSpeech = async (
    text: string, 
    voiceName: string
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("Failed to generate speech.");
    }
    return base64Audio;
};