// Types for AI-powered Mastering functionality

// Common types for audio parameters
import { EQBand } from "./mix-bot-types";

// Platform-specific mastering target
export type MasteringTargetPlatform = 
  "streaming" | 
  "cd" | 
  "vinyl" | 
  "club" | 
  "radio" | 
  "film" | 
  "podcast" | 
  "gaming" |
  "social";

// Mastering settings interface
export interface MasteringSettings {
  targetPlatform: MasteringTargetPlatform;
  loudnessTarget: number; // LUFS
  peakLimit: number; // dB
  stereoWidth: number; // % (0-200)
  dynamicRange: number; // dB
  colorProfile: "warm" | "neutral" | "bright";
  enhanceOptions: {
    lowEndEnhance: boolean;
    highEndShimmer: boolean;
    stereoImaging: boolean;
    harmonicExciter: boolean;
    transientEnhancer: boolean;
  };
  eqSettings: {
    bands: EQBand[];
  };
  limiters: {
    threshold: number;
    ceiling: number;
    release: number;
  };
}

// Mastering preset template
export interface MasteringPreset {
  id: string;
  name: string;
  description: string;
  targetPlatform: MasteringTargetPlatform;
  settings: MasteringSettings;
  isAIGenerated: boolean;
  createdAt: string;
}

// Mastering job status
export interface MasteringJob {
  id: string;
  projectId: number;
  preset: MasteringPreset;
  status: "pending" | "processing" | "completed" | "failed";
  outputUrl?: string;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

// Mastering result with analysis
export interface MasteringResult {
  id: string;
  jobId: string;
  outputUrl: string;
  analysisData: {
    integratedLoudness: number; // LUFS
    truePeak: number; // dBTP
    shortTermLoudness: number; // LUFS
    loudnessRange: number; // LU
    dynamicRange: number; // dB
    spectralBalance: {
      lowFreqEnergy: number; // %
      midFreqEnergy: number; // %
      highFreqEnergy: number; // %
    }
  };
}