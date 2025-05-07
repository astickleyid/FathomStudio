import { useState } from 'react';
import { Track } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import Knob from './Knob';
import Fader from './Fader';

interface ChannelStripProps {
  track: Track;
}

export default function ChannelStrip({ track }: ChannelStripProps) {
  const [pan, setPan] = useState(0);
  const [volume, setVolume] = useState(0);
  const [isMuted, setIsMuted] = useState(track.isMuted);
  const [isSoloed, setIsSoloed] = useState(track.isSoloed);
  const { toast } = useToast();
  
  const handlePanChange = (value: number) => {
    setPan(value);
  };
  
  const handleVolumeChange = (value: number) => {
    setVolume(value);
  };
  
  const handleMuteToggle = async () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    try {
      await apiRequest('PUT', `/api/tracks/${track.id}`, {
        isMuted: newMutedState
      });
      
      // Invalidate track queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/projects', track.projectId, 'tracks'] });
      
      toast({
        title: newMutedState ? 'Track Muted' : 'Track Unmuted',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error updating track:', error);
      setIsMuted(!newMutedState); // Revert UI state
      
      toast({
        title: 'Error',
        description: 'Failed to update track state',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };
  
  const handleSoloToggle = async () => {
    const newSoloedState = !isSoloed;
    setIsSoloed(newSoloedState);
    
    try {
      await apiRequest('PUT', `/api/tracks/${track.id}`, {
        isSoloed: newSoloedState
      });
      
      // Invalidate track queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/projects', track.projectId, 'tracks'] });
      
      toast({
        title: newSoloedState ? 'Track Soloed' : 'Track Unsoloed',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error updating track:', error);
      setIsSoloed(!newSoloedState); // Revert UI state
      
      toast({
        title: 'Error',
        description: 'Failed to update track state',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  return (
    <div className="channel-strip">
      <div className="text-center mb-2 text-sm font-medium">{track.name}</div>
      
      <div className="flex justify-center mb-3">
        <Knob 
          value={pan} 
          min={-100} 
          max={100} 
          onChange={handlePanChange}
          color="orange"
          label="Pan"
        />
      </div>
      
      <div className="flex justify-center items-center mb-2">
        <Fader 
          value={volume} 
          min={-60} 
          max={12} 
          onChange={handleVolumeChange} 
          color="orange"
          height={100}
        />
      </div>
      
      <div className="flex justify-center space-x-2">
        <button 
          className={`w-7 h-7 rounded-md ${
            isSoloed ? 'bg-fathom-orange hover:bg-fathom-orange-dark' : 'bg-fathom-gray hover:bg-fathom-lightgray'
          } flex items-center justify-center`}
          onClick={handleSoloToggle}
        >
          <span className="text-xs font-medium">S</span>
        </button>
        <button 
          className={`w-7 h-7 rounded-md ${
            isMuted ? 'bg-fathom-orange hover:bg-fathom-orange-dark' : 'bg-fathom-gray hover:bg-fathom-lightgray'
          } flex items-center justify-center`}
          onClick={handleMuteToggle}
        >
          <span className="text-xs font-medium">M</span>
        </button>
      </div>
    </div>
  );
}
