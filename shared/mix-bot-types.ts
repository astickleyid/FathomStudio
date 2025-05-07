// Types for AI-powered Mix Bot functionality

// Common types for audio parameters
export type EQBandType = "lowShelf" | "lowPass" | "peaking" | "notch" | "highShelf" | "highPass";

export interface EQBand {
  frequency: number;  // Hz
  gain: number;       // dB
  q: number;          // Q factor
  type: EQBandType;
}

// Track analysis as returned from the AI
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

// Detailed track analysis
export interface TrackAnalysis {
  trackId: number;
  peakLevel: number;         // dB
  rmsLevel: number;          // dB
  crestFactor: number;       // dB
  frequencyProfile: {
    lowEnd: number;          // Energy below 250Hz (0-1 scale)
    lowMids: number;         // Energy 250-500Hz (0-1 scale)
    mids: number;            // Energy 500-2000Hz (0-1 scale)
    highMids: number;        // Energy 2-4kHz (0-1 scale)
    highEnd: number;         // Energy above 4kHz (0-1 scale)
  };
  dynamicsProfile: {
    dynamicRange: number;    // dB
    transients: number;      // Transient density (0-1 scale)
    steadyState: number;     // Steady state content (0-1 scale)
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

// Saved mix preset
export interface MixPreset {
  id: number;
  name: string;
  description: string;
  trackType: string;
  gainSettings: {
    targetLevel: number;
  };
  eqSettings: {
    bands: EQBand[];
  };
  compressionSettings: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
    makeupGain: number;
  };
}

// Mix status for track
export interface TrackMixStatus {
  trackId: number;
  hasBeenAnalyzed: boolean;
  recommendationsApplied: boolean;
  lastAnalyzedAt?: string;
}