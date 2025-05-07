import { useState, useRef, useEffect } from 'react';
import { 
  SkipBack, 
  Play, 
  Square, 
  Disc, 
  Repeat, 
  Timer
} from 'lucide-react';

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
  const intervalRef = useRef<number | null>(null);
  
  // Generate random audio levels for visualization
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
  
  const handlePlayPause = () => {
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);
    
    // Send transport control message via WebSocket if connected
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'transport_control',
        action: newPlayingState ? 'play' : 'stop',
        position: 0 // Current playback position in samples
      }));
    }
  };
  
  const handleRecord = () => {
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    
    // If we start recording, also start playback
    if (newRecordingState && !isPlaying) {
      setIsPlaying(true);
    }
    
    // Send transport control message via WebSocket if connected
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'transport_control',
        action: newRecordingState ? 'record' : 'stop_record',
        position: 0 // Current playback position in samples
      }));
    }
  };
  
  const handleLoop = () => {
    setIsLooping(!isLooping);
  };
  
  const handleMetronome = () => {
    setIsMetronomeActive(!isMetronomeActive);
  };

  return (
    <div className="h-16 bg-fathom-darkgray border-t border-fathom-lightgray flex items-center justify-between px-6">
      <div className="flex space-x-3">
        <button className="transport-control" title="Rewind">
          <SkipBack className="w-5 h-5 text-white" />
        </button>
        
        <button 
          className={`transport-control ${isPlaying ? 'active' : ''}`} 
          title={isPlaying ? 'Pause' : 'Play'}
          onClick={handlePlayPause}
        >
          <Play className="w-5 h-5 text-white" />
        </button>
        
        <button 
          className={`transport-control ${isRecording ? 'active' : ''}`} 
          title={isRecording ? 'Stop Recording' : 'Record'}
          onClick={handleRecord}
        >
          <Disc className="w-5 h-5 text-white" />
        </button>
        
        <button 
          className={`transport-control ${isLooping ? 'active' : ''}`} 
          title="Loop"
          onClick={handleLoop}
        >
          <Repeat className="w-5 h-5 text-white" />
        </button>
        
        <button 
          className={`transport-control ${isMetronomeActive ? 'active' : ''}`} 
          title="Metronome"
          onClick={handleMetronome}
        >
          <Timer className="w-5 h-5 text-white" />
        </button>
      </div>
      
      <div className="flex items-center">
        <div className="h-6 w-32 bg-fathom-gray bg-opacity-30 rounded-md overflow-hidden relative">
          <div className="absolute inset-0 flex items-center justify-center space-x-1">
            {/* Audio level visualization */}
            {audioLevels.length > 0 ? (
              audioLevels.map((level, i) => (
                <div 
                  key={i} 
                  className="h-4 w-1 bg-fathom-orange rounded-sm" 
                  style={{ height: `${level * 100}%` }}
                ></div>
              ))
            ) : (
              <div className="text-xs text-fathom-text-secondary">Audio Monitor</div>
            )}
          </div>
        </div>
        
        <div className="ml-2 text-fathom-text-secondary text-xs">
          <span className="text-white">{tempo}</span> BPM
        </div>
      </div>
    </div>
  );
}
