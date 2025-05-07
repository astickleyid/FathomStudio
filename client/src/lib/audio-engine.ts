import * as Tone from 'tone';
import { audioStore } from './audio-store';
import { Track, Clip } from './types';
import { Track as DbTrack } from '@shared/schema';

class AudioEngine {
  private context: any = null; // Using any to handle Tone.js context type issues
  private tracks: Map<number, Tone.Channel> = new Map();
  private clips: Map<number, Tone.Player> = new Map();
  private masterChannel: Tone.Channel | null = null;
  private isInitialized: boolean = false;
  private transport: any; // Using any for Tone.Transport
  private mainOut: any; // Using any for Tone.Destination
  
  constructor() {
    this.mainOut = Tone.getDestination();
    this.transport = Tone.getTransport();
    this.transport.bpm.value = 120;
  }
  
  /**
   * Initialize the audio engine
   * This must be called after a user interaction due to browser autoplay policies
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Start audio context
      await Tone.start();
      this.context = Tone.getContext().rawContext;
      
      // Set up master channel
      this.masterChannel = new Tone.Channel().toDestination();
      
      // Set default values
      this.transport.bpm.value = 120;
      this.masterChannel.volume.value = 0;
      
      this.isInitialized = true;
      console.log('Audio engine initialized');
    } catch (error) {
      console.error('Failed to initialize audio engine:', error);
      throw error;
    }
  }
  
  /**
   * Check if audio engine is initialized
   */
  isEngineInitialized(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Create a new audio track
   */
  createTrack(track: Track | DbTrack): Tone.Channel {
    if (!this.isInitialized) {
      throw new Error('Audio engine not initialized');
    }
    
    // Convert from DB track to Audio track if needed
    const audioTrack: Track = this.ensureAudioTrack(track);
    
    // Create channel for track
    const channel = new Tone.Channel({
      volume: audioTrack.volume || 0,
      pan: audioTrack.pan || 0,
      mute: audioTrack.isMuted,
      solo: audioTrack.isSoloed
    }).connect(this.masterChannel!);
    
    this.tracks.set(audioTrack.id, channel);
    return channel;
  }
  
  /**
   * Ensures a track is in the AudioTrack format
   */
  private ensureAudioTrack(track: Track | DbTrack): Track {
    // If it's already an AudioTrack, return it directly
    if (typeof track.color === 'string' && 
        typeof track.isMuted === 'boolean' && 
        typeof track.isSoloed === 'boolean' && 
        typeof track.isArmed === 'boolean' && 
        typeof track.isAI === 'boolean') {
      return track as Track;
    }
    
    // Otherwise convert from DB track to AudioTrack
    return {
      id: track.id,
      name: track.name,
      type: track.type,
      color: (track.color as string | null) || '#CCCCCC',
      isMuted: (track.isMuted as boolean | null) || false,
      isSoloed: (track.isSoloed as boolean | null) || false,
      isArmed: (track.isArmed as boolean | null) || false,
      isAI: (track.isAI as boolean | null) || false,
      volume: (track.volume as number | null) || 0,
      pan: (track.pan as number | null) || 0,
      projectId: track.projectId,
      createdAt: typeof track.createdAt === 'string' ? track.createdAt : new Date(track.createdAt).toISOString()
    };
  }
  
  /**
   * Get an existing track's channel
   */
  getTrack(trackId: number): Tone.Channel | undefined {
    return this.tracks.get(trackId);
  }
  
  /**
   * Update track parameters
   */
  updateTrack(trackId: number, options: { volume?: number; pan?: number; mute?: boolean; solo?: boolean }): void {
    const channel = this.tracks.get(trackId);
    if (!channel) {
      console.warn(`Track ${trackId} not found`);
      return;
    }
    
    if (options.volume !== undefined) {
      channel.volume.value = options.volume;
    }
    
    if (options.pan !== undefined) {
      channel.pan.value = options.pan;
    }
    
    if (options.mute !== undefined) {
      channel.mute = options.mute;
    }
    
    if (options.solo !== undefined) {
      channel.solo = options.solo;
    }
  }
  
  /**
   * Load and create a clip
   */
  async createClip(clip: Clip): Promise<Tone.Player | null> {
    if (!this.isInitialized) {
      throw new Error('Audio engine not initialized');
    }
    
    // Get parent track
    const channel = this.tracks.get(clip.trackId);
    if (!channel) {
      console.warn(`Parent track ${clip.trackId} not found for clip ${clip.id}`);
      return null;
    }
    
    try {
      // Create player for clip
      const player = new Tone.Player({
        url: clip.audioData || '',
        loop: false,
      }).connect(channel);
      
      this.clips.set(clip.id, player);
      return player;
    } catch (error) {
      console.error(`Failed to load audio for clip ${clip.id}:`, error);
      return null;
    }
  }
  
  /**
   * Schedule clip playback
   */
  scheduleClip(clipId: number, startTime: number, duration: number): void {
    const player = this.clips.get(clipId);
    if (!player) {
      console.warn(`Clip ${clipId} not found`);
      return;
    }
    
    // Use a default sample rate if not available in audioStore
    const sampleRate = 44100; // Standard sample rate
    
    // Convert start time from samples to seconds
    const startTimeInSeconds = startTime / sampleRate;
    
    // Schedule clip playback
    this.transport.schedule((time: number) => {
      player.start(time);
      
      // Schedule stop if needed
      if (duration > 0) {
        const durationInSeconds = duration / sampleRate;
        player.stop(time + durationInSeconds);
      }
    }, startTimeInSeconds);
  }
  
  /**
   * Play/pause transport
   */
  togglePlay(play?: boolean): void {
    if (!this.isInitialized) {
      throw new Error('Audio engine not initialized');
    }
    
    if (play === undefined) {
      // Toggle state
      if (this.transport.state === 'started') {
        this.transport.pause();
      } else {
        this.transport.start();
      }
    } else if (play) {
      this.transport.start();
    } else {
      this.transport.pause();
    }
  }
  
  /**
   * Stop transport and reset position
   */
  stop(): void {
    if (!this.isInitialized) {
      throw new Error('Audio engine not initialized');
    }
    
    this.transport.stop();
  }
  
  /**
   * Set transport tempo (BPM)
   */
  setTempo(bpm: number): void {
    if (!this.isInitialized) {
      throw new Error('Audio engine not initialized');
    }
    
    this.transport.bpm.value = bpm;
  }
  
  /**
   * Get current playback position in seconds
   */
  getPosition(): number {
    return this.transport.seconds;
  }
  
  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    if (!this.masterChannel) return;
    this.masterChannel.volume.value = volume;
  }
  
  /**
   * Clean up and release resources
   */
  dispose(): void {
    // Dispose all tracks
    this.tracks.forEach((channel) => {
      channel.dispose();
    });
    this.tracks.clear();
    
    // Dispose all clips
    this.clips.forEach((player) => {
      player.dispose();
    });
    this.clips.clear();
    
    // Dispose master channel
    if (this.masterChannel) {
      this.masterChannel.dispose();
      this.masterChannel = null;
    }
    
    // Reset flags
    this.isInitialized = false;
  }
  
  /**
   * Create audio analyzer for visualizations
   */
  createAnalyzer(trackId?: number): Tone.FFT {
    if (!this.isInitialized) {
      throw new Error('Audio engine not initialized');
    }
    
    // Create analyzer
    const analyzer = new Tone.FFT(2048);
    
    // Connect to track or master
    if (trackId !== undefined) {
      const channel = this.tracks.get(trackId);
      if (channel) {
        channel.connect(analyzer);
      } else {
        console.warn(`Track ${trackId} not found for analyzer`);
        this.masterChannel?.connect(analyzer);
      }
    } else {
      this.masterChannel?.connect(analyzer);
    }
    
    return analyzer;
  }
  
  /**
   * Create a Web Audio buffer from base64 audio data
   */
  async createBuffer(audioData: string): Promise<AudioBuffer | null> {
    if (!this.context) {
      console.warn('Audio context not initialized');
      return null;
    }
    
    try {
      // Convert base64 to array buffer
      const base64 = audioData.split(',')[1];
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Decode audio data
      const buffer = await this.context.decodeAudioData(bytes.buffer);
      return buffer;
    } catch (error) {
      console.error('Failed to create audio buffer:', error);
      return null;
    }
  }
}

// Export singleton instance
export const audioEngine = new AudioEngine();
