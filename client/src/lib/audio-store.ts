import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project, Track, Clip, AICommand } from './types';
import { audioEngine } from './audio-engine';

interface AudioState {
  // Project state
  currentProject: Project | null;
  tracks: Track[];
  clips: Clip[];
  
  // Playback state
  isPlaying: boolean;
  isRecording: boolean;
  isLooping: boolean;
  tempo: number;
  sampleRate: number;
  timeSignature: string;
  
  // UI state
  selectedTrackId: number | null;
  selectedClipId: number | null;
  zoom: number;
  
  // AI state
  aiCommands: AICommand[];
  
  // Actions
  setCurrentProject: (project: Project) => void;
  addTrack: (track: Track) => void;
  updateTrack: (id: number, updates: Partial<Track>) => void;
  removeTrack: (id: number) => void;
  addClip: (clip: Clip) => void;
  updateClip: (id: number, updates: Partial<Clip>) => void;
  removeClip: (id: number) => void;
  setTempo: (tempo: number) => void;
  setPlaying: (isPlaying: boolean) => void;
  setRecording: (isRecording: boolean) => void;
  setLooping: (isLooping: boolean) => void;
  selectTrack: (id: number | null) => void;
  selectClip: (id: number | null) => void;
  setZoom: (zoom: number) => void;
  addAICommand: (command: AICommand) => void;
  clearAICommands: () => void;
}

export const audioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentProject: null,
      tracks: [],
      clips: [],
      isPlaying: false,
      isRecording: false,
      isLooping: false,
      tempo: 120,
      sampleRate: 44100,
      timeSignature: '4/4',
      selectedTrackId: null,
      selectedClipId: null,
      zoom: 1,
      aiCommands: [],
      
      // Actions
      setCurrentProject: (project) => {
        audioEngine.setTempo(project.tempo || 120);
        
        set({
          currentProject: project,
          tempo: project.tempo || 120,
          timeSignature: project.timeSignature || '4/4',
          sampleRate: project.sampleRate || 44100,
          tracks: [],
          clips: [],
          selectedTrackId: null,
          selectedClipId: null,
        });
      },
      
      addTrack: (track) => {
        // Update audio engine
        if (audioEngine.isEngineInitialized()) {
          audioEngine.createTrack(track);
        }
        
        set((state) => ({
          tracks: [...state.tracks, track],
        }));
      },
      
      updateTrack: (id, updates) => {
        // Update audio engine
        if (audioEngine.isEngineInitialized()) {
          audioEngine.updateTrack(id, {
            volume: updates.volume,
            pan: updates.pan,
            mute: updates.isMuted,
            solo: updates.isSoloed,
          });
        }
        
        set((state) => ({
          tracks: state.tracks.map((track) => 
            track.id === id ? { ...track, ...updates } : track
          ),
        }));
      },
      
      removeTrack: (id) => {
        set((state) => ({
          tracks: state.tracks.filter((track) => track.id !== id),
          // Also remove associated clips
          clips: state.clips.filter((clip) => clip.trackId !== id),
          // Deselect if this track was selected
          selectedTrackId: state.selectedTrackId === id ? null : state.selectedTrackId,
        }));
      },
      
      addClip: (clip) => {
        // Load clip in audio engine
        if (audioEngine.isEngineInitialized()) {
          audioEngine.createClip(clip).then((player) => {
            if (player) {
              // Schedule clip for playback
              audioEngine.scheduleClip(clip.id, clip.startTime, clip.duration);
            }
          });
        }
        
        set((state) => ({
          clips: [...state.clips, clip],
        }));
      },
      
      updateClip: (id, updates) => {
        set((state) => ({
          clips: state.clips.map((clip) => 
            clip.id === id ? { ...clip, ...updates } : clip
          ),
        }));
      },
      
      removeClip: (id) => {
        set((state) => ({
          clips: state.clips.filter((clip) => clip.id !== id),
          // Deselect if this clip was selected
          selectedClipId: state.selectedClipId === id ? null : state.selectedClipId,
        }));
      },
      
      setTempo: (tempo) => {
        audioEngine.setTempo(tempo);
        set({ tempo });
      },
      
      setPlaying: (isPlaying) => {
        if (audioEngine.isEngineInitialized()) {
          audioEngine.togglePlay(isPlaying);
        }
        set({ isPlaying });
      },
      
      setRecording: (isRecording) => {
        // In a real app, this would set up recording inputs
        set({ isRecording });
        
        // Start playback if we start recording
        if (isRecording && !get().isPlaying) {
          get().setPlaying(true);
        }
      },
      
      setLooping: (isLooping) => {
        set({ isLooping });
      },
      
      selectTrack: (id) => {
        set({ selectedTrackId: id });
      },
      
      selectClip: (id) => {
        set({ selectedClipId: id });
      },
      
      setZoom: (zoom) => {
        set({ zoom: Math.max(0.1, Math.min(10, zoom)) });
      },
      
      addAICommand: (command) => {
        set((state) => ({
          aiCommands: [...state.aiCommands, command],
        }));
      },
      
      clearAICommands: () => {
        set({ aiCommands: [] });
      },
    }),
    {
      name: 'fathom-audio-store',
      partialize: (state) => ({
        tempo: state.tempo,
        timeSignature: state.timeSignature,
        sampleRate: state.sampleRate,
        zoom: state.zoom,
      }),
    }
  )
);
