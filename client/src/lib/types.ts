// Project type for frontend use
export interface Project {
  id: number;
  name: string;
  tempo: number;
  timeSignature: string;
  sampleRate: number;
  createdAt: string;
  updatedAt: string;
}

// Helper function to convert database project to frontend type
export function adaptProjectToFrontendType(dbProject: any): Project {
  return {
    id: dbProject.id,
    name: dbProject.name,
    tempo: dbProject.tempo ?? 120,  // Default if null
    timeSignature: dbProject.timeSignature ?? '4/4',  // Default if null
    sampleRate: dbProject.sampleRate ?? 44100,  // Default if null 
    createdAt: typeof dbProject.createdAt === 'string' 
      ? dbProject.createdAt 
      : new Date().toISOString(),
    updatedAt: typeof dbProject.updatedAt === 'string' 
      ? dbProject.updatedAt 
      : new Date().toISOString()
  };
}

// Track type for frontend use
export interface Track {
  id: number;
  name: string;
  type: string;
  color: string;
  isMuted: boolean;
  isSoloed: boolean;
  isArmed: boolean;
  isAI: boolean;
  projectId: number;
  createdAt: string;
  volume?: number;
  pan?: number;
}

// Clip type for frontend use
export interface Clip {
  id: number;
  name: string | null;
  trackId: number;
  startTime: number;
  duration: number;
  audioData: string | null;
  waveformData: number[] | string | null;
  createdAt: string;
}

// AI Suggestion type for frontend use
export interface AISuggestion {
  id: number;
  botType: string;
  suggestion: string;
  trackId: number | null;
  projectId: number;
  isApplied: boolean;
  createdAt: string;
}

// Sample type for frontend use
export interface Sample {
  id: number;
  name: string;
  category: string;
  tempo: number | null;
  key: string | null;
  audioUrl: string;
  waveformData: number[] | null;
  tags: string[] | null;
  createdAt: string;
}

// Audio effect types
export interface EQSettings {
  low: number;
  mid: number;
  high: number;
  lowFreq: number;
  midFreq: number;
  highFreq: number;
  lowQ: number;
  midQ: number;
  highQ: number;
}

export interface CompressorSettings {
  threshold: number;
  ratio: number;
  attack: number;
  release: number;
  knee: number;
  makeupGain: number;
}

export interface ReverbSettings {
  decay: number;
  preDelay: number;
  wet: number;
}

export interface DelaySettings {
  time: number;
  feedback: number;
  wet: number;
}

export interface Effect {
  id: string;
  type: 'eq' | 'compressor' | 'reverb' | 'delay';
  enabled: boolean;
  settings: EQSettings | CompressorSettings | ReverbSettings | DelaySettings;
}

// AI Command type
export interface AICommand {
  id: string;
  command: string;
  response: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
  trackId?: number;
  botType: string;
}

// Plugin/Extension types for future expansion
export interface Plugin {
  id: string;
  name: string;
  type: 'instrument' | 'effect' | 'utility';
  enabled: boolean;
  settings: Record<string, any>;
}

// Timeline marker type
export interface Marker {
  id: string;
  name: string;
  position: number; // in samples
  color: string;
}

// Audio automation point and lane
export interface AutomationPoint {
  time: number; // in samples
  value: number; // normalized 0-1
}

export interface AutomationLane {
  id: string;
  trackId: number;
  parameter: string; // volume, pan, etc.
  points: AutomationPoint[];
}
