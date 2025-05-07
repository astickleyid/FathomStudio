// Types for AI-powered Mixing functionality

// Common types for audio parameters
export type EQBandType = "lowShelf" | "lowPass" | "peaking" | "notch" | "highShelf" | "highPass";

export interface EQBand {
  frequency: number;  // Hz
  gain: number;       // dB
  q: number;          // Q factor
  type: EQBandType;
}

// Analysis result from the AI
export interface AudioAnalysisResult {
  gainStaging?: {
    recommendation: string;
    targetLevel: number;  // dB
  };
  eq?: {
    recommendation: string;
    bands: EQBand[];
  };
  compression?: {
    recommendation: string;
    threshold: number;  // dB
    ratio: number;      // compression ratio (e.g., 4:1 would be 4)
    attack: number;     // ms
    release: number;    // ms
    makeupGain: number; // dB
  };
}

// Standardized mix recommendation format
export interface MixRecommendation {
  trackId: number;
  trackName: string;
  trackType: string;
  gainStaging: {
    recommendation: string;
    targetLevel: number;    // dB
    currentLevel: number;   // Current level detected
  };
  eq: {
    recommendation: string;
    bands: EQBand[];
  };
  compression: {
    recommendation: string;
    threshold: number;      // dB
    ratio: number;          // compression ratio (e.g., 4:1 would be 4)
    attack: number;         // ms
    release: number;        // ms
    makeupGain: number;     // dB
  };
}

// Track effects storage type for database
export interface TrackEffects {
  trackId: number;
  eqSettings: {
    bands: EQBand[];
    enabled: boolean;
  };
  compressionSettings: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
    makeupGain: number;
    enabled: boolean;
  };
  // Could add more effect types in the future
}