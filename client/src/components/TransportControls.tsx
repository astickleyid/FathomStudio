import { useState, useRef, useEffect } from 'react';
import { 
  SkipBack, 
  Play,
  Pause,
  StopCircle, 
  Disc,
  Square, 
  Repeat, 
  Timer,
  Clock
} from 'lucide-react';
import { audioEngine } from '@/lib/audio-engine';
import { audioStore } from '@/lib/audio-store';
import { useToast } from '@/hooks/use-toast';

interface TransportControlsProps {
  tempo: number;
  socket: WebSocket | null;
}

export default function TransportControls({ tempo, socket }: TransportControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState('00:00.00');
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  
  const intervalRef = useRef<number | null>(null);
  const timeUpdateRef = useRef<number | null>(null);
  const { toast } = useToast();
  
  // Initialize audio engine on first user interaction
  const initializeAudioEngine = async () => {
    if (!isAudioInitialized) {
      try {
        await audioEngine.initialize();
        setIsAudioInitialized(true);
        toast({
          title: 'Audio Engine Initialized',
          description: 'Audio playback and recording are now available',
          duration: 3000,
        });
      } catch (error) {
        console.error('Failed to initialize audio engine:', error);
        toast({
          title: 'Audio Initialization Failed',
          description: 'Please try again or check browser permissions',
          variant: 'destructive',
          duration: 3000,
        });
      }
    }
    return isAudioInitialized;
  };
  
  // Setup time display updates
  useEffect(() => {
    if (isPlaying) {
      timeUpdateRef.current = window.setInterval(() => {
        const seconds = audioEngine.getPosition();
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const ms = Math.floor((remainingSeconds % 1) * 100);
        
        setCurrentTime(
          `${minutes.toString().padStart(2, '0')}:${Math.floor(remainingSeconds).toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
        );
      }, 50);
    } else {
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
        timeUpdateRef.current = null;
      }
    }
    
    return () => {
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
      }
    };
  }, [isPlaying]);
  
  // Generate audio level visualizations
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        const levels = Array.from({ length: 15 }, () => Math.random() * 0.8 + 0.2);
        setAudioLevels(levels);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setAudioLevels([]);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying]);
  
  // Update tempo in audio engine when it changes
  useEffect(() => {
    if (isAudioInitialized) {
      audioEngine.setTempo(tempo);
    }
  }, [tempo, isAudioInitialized]);
  
  // Play/Pause functionality with real audio engine integration
  const handlePlayPause = async () => {
    // Initialize audio engine if not already done
    if (!isAudioInitialized) {
      const success = await initializeAudioEngine();
      if (!success) return;
    }
    
    // Toggle playback state
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);
    
    // Update audio engine
    audioEngine.togglePlay(newPlayingState);
    
    // Update global state
    audioStore.getState().setPlaying(newPlayingState);
    
    // Send transport control message via WebSocket if connected
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'transport_control',
        action: newPlayingState ? 'play' : 'stop',
        position: audioEngine.getPosition() // Current playback position in seconds
      }));
    }
  };
  
  // Stop playback and reset position
  const handleStop = () => {
    if (isPlaying) {
      setIsPlaying(false);
      
      if (isAudioInitialized) {
        audioEngine.stop();
      }
      
      // Update global state
      audioStore.getState().setPlaying(false);
      
      // Reset time display
      setCurrentTime('00:00.00');
      
      // Send stop message via WebSocket if connected
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'transport_control',
          action: 'stop',
          position: 0
        }));
      }
    }
  };
  
  // Record functionality
  const handleRecord = async () => {
    // Initialize audio engine if not already done
    if (!isAudioInitialized) {
      const success = await initializeAudioEngine();
      if (!success) return;
    }
    
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    
    // If we start recording, also start playback
    if (newRecordingState && !isPlaying) {
      setIsPlaying(true);
      audioEngine.togglePlay(true);
    }
    
    // Update global state
    audioStore.getState().setRecording(newRecordingState);
    
    // Send transport control message via WebSocket if connected
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'transport_control',
        action: newRecordingState ? 'record' : 'stop_record',
        position: audioEngine.getPosition()
      }));
    }
    
    // Show toast notification
    if (newRecordingState) {
      toast({
        title: 'Recording Started',
        description: 'Recording audio from armed tracks',
        duration: 3000,
      });
    } else {
      toast({
        title: 'Recording Stopped',
        description: 'Audio recording has been stopped',
        duration: 3000,
      });
    }
  };
  
  // Loop functionality
  const handleLoop = () => {
    const newLoopingState = !isLooping;
    setIsLooping(newLoopingState);
    
    // Update global state
    audioStore.getState().setLooping(newLoopingState);
    
    // Show toast notification
    toast({
      title: newLoopingState ? 'Loop Enabled' : 'Loop Disabled',
      description: newLoopingState ? 'Playback will loop between markers' : 'Looping has been disabled',
      duration: 2000,
    });
  };
  
  // Metronome functionality
  const handleMetronome = () => {
    const newMetronomeState = !isMetronomeActive;
    setIsMetronomeActive(newMetronomeState);
    
    // Show toast notification
    toast({
      title: newMetronomeState ? 'Metronome Enabled' : 'Metronome Disabled',
      description: newMetronomeState ? `Click track at ${tempo} BPM` : 'Click track disabled',
      duration: 2000,
    });
  };

  return (
    <div className="h-16 bg-[#121212] border-t border-[#333333] flex items-center justify-between px-6">
      <div className="flex space-x-3">
        <button 
          className="p-2 bg-[#252525] hover:bg-[#333333] rounded-md transition-colors" 
          title="Rewind"
          onClick={handleStop}
        >
          <SkipBack className="w-5 h-5 text-white" />
        </button>
        
        <button 
          className={`p-2 rounded-md transition-colors ${isPlaying 
            ? 'bg-[#FF7A00] hover:bg-[#CC6200] text-white' 
            : 'bg-[#252525] hover:bg-[#333333] text-white'}`}
          title={isPlaying ? 'Pause' : 'Play'}
          onClick={handlePlayPause}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </button>
        
        <button 
          className={`p-2 rounded-md transition-colors ${isRecording 
            ? 'bg-[#FF3333] hover:bg-[#CC2929] text-white' 
            : 'bg-[#252525] hover:bg-[#333333] text-white'}`}
          title={isRecording ? 'Stop Recording' : 'Record'}
          onClick={handleRecord}
        >
          <Disc className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
        </button>
        
        <button 
          className={`p-2 rounded-md transition-colors ${isLooping 
            ? 'bg-[#333333] text-[#FF7A00]' 
            : 'bg-[#252525] hover:bg-[#333333] text-white'}`}
          title="Loop"
          onClick={handleLoop}
        >
          <Repeat className="w-5 h-5" />
        </button>
        
        <button 
          className={`p-2 rounded-md transition-colors ${isMetronomeActive 
            ? 'bg-[#333333] text-[#FF7A00]' 
            : 'bg-[#252525] hover:bg-[#333333] text-white'}`}
          title="Metronome"
          onClick={handleMetronome}
        >
          <Timer className="w-5 h-5" />
        </button>
      </div>
      
      {/* Center Time Display */}
      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
        <div className="bg-[#191919] px-4 py-2 rounded-md border border-[#333333] flex items-center">
          <Clock className="w-4 h-4 text-[#999999] mr-2" />
          <span className="font-mono text-lg text-white">{currentTime}</span>
        </div>
      </div>
      
      {/* Right side controls */}
      <div className="flex items-center">
        {/* Audio level visualization */}
        <div className="h-6 w-32 bg-[#1A1A1A] rounded-md overflow-hidden relative border border-[#333333]">
          <div className="absolute inset-0 flex items-center justify-center space-x-0.5 px-1">
            {audioLevels.length > 0 ? (
              audioLevels.map((level, i) => (
                <div 
                  key={i} 
                  className={`h-4 w-1 rounded-sm ${level > 0.7 ? 'bg-red-500' : 'bg-[#FF7A00]'}`}
                  style={{ 
                    height: `${level * 100}%`,
                    transition: 'height 0.05s ease'
                  }}
                ></div>
              ))
            ) : (
              <div className="text-xs text-[#999999]">Audio Monitor</div>
            )}
          </div>
        </div>
        
        <div className="ml-4 bg-[#252525] px-3 py-1.5 rounded-md">
          <span className="text-[#FF7A00] font-medium text-sm">{tempo}</span>
          <span className="text-[#999999] text-xs ml-1">BPM</span>
        </div>
      </div>
    </div>
  );
}
