import { useState, useRef, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Volume2, 
  VolumeX, 
  ListMusic, 
  Music, 
  Mic, 
  Plus, 
  Trash2, 
  Copy, 
  MoreVertical,
  MessageSquareText,
  Computer,
  MoveVertical,
  FlipHorizontal,
  Wifi
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { audioEngine } from '@/lib/audio-engine';
import { audioStore } from '@/lib/audio-store';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Track } from '@/lib/types';
import { Track as DbTrack, TrackInsert } from '@shared/schema';
import { useGestures } from '@/hooks/use-gestures';
import { useMobile } from '@/hooks/use-mobile';
import { useWebSocket } from '@/hooks/use-websocket';

interface TrackListProps {
  tracks: Track[] | undefined;
  isLoading: boolean;
  selectedTrackId: number | undefined;
  onSelectTrack: (trackId: number) => void;
}

export default function TrackList({ 
  tracks, 
  isLoading, 
  selectedTrackId, 
  onSelectTrack 
}: TrackListProps) {
  const [isAddingTrack, setIsAddingTrack] = useState(false);
  const [newTrackName, setNewTrackName] = useState('');
  const [newTrackType, setNewTrackType] = useState('audio');
  const [trackActionsOpen, setTrackActionsOpen] = useState<number | null>(null);
  const [gestureTrackId, setGestureTrackId] = useState<number | null>(null);
  const [gestureState, setGestureState] = useState<string | null>(null);
  const trackListRef = useRef<HTMLDivElement>(null);
  const trackRefs = useRef<Record<number, HTMLDivElement>>({});
  const isMobile = useMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected, sendTrackAction, lastMessage } = useWebSocket();
  
  // Handle incoming WebSocket messages - especially track_action messages from other clients
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'track_action' && lastMessage.data) {
      const { actionType, trackId, trackName } = lastMessage.data;
      
      // Show toast notification for actions from other users
      toast({
        title: `Remote track action`,
        description: `${actionType} track "${trackName}" (ID: ${trackId})`,
        duration: 2000,
      });
      
      // Refresh track data to show the changes
      if (tracks && tracks.length > 0) {
        // Get project ID from first track
        const projectId = tracks[0].projectId;
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tracks'] });
      }
    }
  }, [lastMessage, toast, queryClient, tracks]);
  
  // Create a new track with a default name and specified type
  const handleCreateTrack = async (type = newTrackType, name = newTrackName) => {
    try {
      // Get current project from global state
      const currentProject = audioStore.getState().currentProject;
      
      if (!currentProject) {
        toast({
          title: "No active project",
          description: "Please open a project to add tracks",
          variant: "destructive",
        });
        return;
      }
      
      // If name is not provided through form, use a default name based on type
      const trackName = name.trim() || `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${Math.floor(Math.random() * 1000)}`;
      
      setIsAddingTrack(true);
      
      // Generate a color based on track type
      let color;
      switch (type) {
        case 'audio':
          color = '#5D87FF';
          break;
        case 'midi':
          color = '#9747FF';
          break;
        case 'vocal':
          color = '#FF7A00';
          break;
        default:
          color = '#CCCCCC';
      }
      
      // Create track data
      const trackData: Partial<TrackInsert> = {
        name: trackName,
        type: type,
        color: color,
        isMuted: false,
        isSoloed: false,
        isArmed: false,
        isAI: false,
        projectId: currentProject.id,
        volume: 0,
        pan: 0
      };
      
      // Send API request to create track
      const dbResponse = await apiRequest<DbTrack>(`/api/projects/${currentProject.id}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trackData),
      });
      
      // Convert the database response to frontend Track type
      const response = {
        id: dbResponse.id,
        name: dbResponse.name || 'Untitled Track',
        type: dbResponse.type || 'audio',
        color: dbResponse.color || '#FF7A00',
        isMuted: dbResponse.isMuted === true,
        isSoloed: dbResponse.isSoloed === true,
        isArmed: dbResponse.isArmed === true,
        isAI: dbResponse.isAI === true,
        projectId: dbResponse.projectId,
        createdAt: typeof dbResponse.createdAt === 'string' 
          ? dbResponse.createdAt 
          : new Date().toISOString(),
        volume: dbResponse.volume ?? 0,
        pan: dbResponse.pan ?? 0
      };
      
      // Update query cache
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject.id, 'tracks'] });
      
      // Create track in audio engine
      if (audioEngine.isEngineInitialized()) {
        // Let the audio engine handle the type conversion
        audioEngine.createTrack(response);
      }
      
      // Reset form
      setNewTrackName('');
      setNewTrackType('audio');
      setIsAddingTrack(false);
      
      // Show success message
      toast({
        title: "Track created",
        description: `Track "${response.name}" has been created`,
      });
      
      // Select the new track
      onSelectTrack(response.id);
      
    } catch (error) {
      console.error("Error creating track:", error);
      toast({
        title: "Failed to create track",
        description: "There was an error creating the track. Please try again.",
        variant: "destructive",
      });
      setIsAddingTrack(false);
    }
  };
  
  // Toggle track mute state
  const handleToggleMute = async (track: Track, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent track selection
    
    try {
      const newMuteState = !track.isMuted;
      
      // Update track in database
      await apiRequest<DbTrack>(`/api/tracks/${track.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isMuted: newMuteState }),
      });
      
      // Update audio engine
      if (audioEngine.isEngineInitialized()) {
        audioEngine.updateTrack(track.id, { mute: newMuteState });
      }
      
      // Update track state in cache
      queryClient.setQueryData(
        ['/api/projects', track.projectId, 'tracks'],
        (oldData: Track[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(t => 
            t.id === track.id ? { ...t, isMuted: newMuteState } : t
          );
        }
      );
      
      // Show toast notification
      toast({
        title: newMuteState ? "Track Muted" : "Track Unmuted",
        description: `Track "${track.name}" has been ${newMuteState ? "muted" : "unmuted"}`,
        duration: 2000,
      });
      
    } catch (error) {
      console.error("Error toggling track mute:", error);
      toast({
        title: "Failed to update track",
        description: "There was an error updating the track. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Toggle track arm state for recording
  const handleToggleArm = async (track: Track, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent track selection
    
    try {
      const newArmState = !track.isArmed;
      
      // Update track in database
      await apiRequest<DbTrack>(`/api/tracks/${track.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isArmed: newArmState }),
      });
      
      // Update track state in cache
      queryClient.setQueryData(
        ['/api/projects', track.projectId, 'tracks'],
        (oldData: Track[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(t => 
            t.id === track.id ? { ...t, isArmed: newArmState } : t
          );
        }
      );
      
      // Show toast notification
      toast({
        title: newArmState ? "Track Armed" : "Track Disarmed",
        description: `Track "${track.name}" is ${newArmState ? "now" : "no longer"} armed for recording`,
        duration: 2000,
      });
      
    } catch (error) {
      console.error("Error toggling track arm:", error);
      toast({
        title: "Failed to update track",
        description: "There was an error updating the track. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Get icon for track type
  const getTrackTypeIcon = (trackType: string) => {
    switch (trackType.toLowerCase()) {
      case 'audio':
        return <ListMusic className="w-4 h-4" />;
      case 'midi':
        return <Music className="w-4 h-4" />;
      case 'vocal':
        return <Mic className="w-4 h-4" />;
      case 'ai':
        return <Computer className="w-4 h-4" />;
      default:
        return <ListMusic className="w-4 h-4" />;
    }
  };
  
  // Get color for track based on type or custom color
  const getTrackColor = (track: Track) => {
    if (track.color) return track.color;
    
    // Default colors based on type
    switch (track.type.toLowerCase()) {
      case 'audio':
        return '#5D87FF';
      case 'midi':
        return '#9747FF';
      case 'vocal':
        return '#FF7A00';
      case 'ai':
        return '#00CC88';
      default:
        return '#CCCCCC';
    }
  };
  
  // Setup gesture handlers for a track
  const setupTrackGestures = (trackId: number, trackRef: HTMLDivElement | null) => {
    if (!trackRef || !isMobile) return;
    
    // Find the track
    const track = tracks?.find(t => t.id === trackId);
    if (!track) return;
    
    // Configure gesture handlers
    return {
      onSwipeLeft: async () => {
        setGestureTrackId(trackId);
        setGestureState('swipe-left');
        
        // Mute the track if it's not already muted
        if (!track.isMuted) {
          // Use existing function but create a synthetic event
          await handleToggleMute(track, { stopPropagation: () => {} } as unknown as React.MouseEvent);
          
          // Broadcast gesture action to other clients if connected
          if (isConnected) {
            sendTrackAction('mute', track.id, track.name);
          }
          
          // Show a visual feedback
          setTimeout(() => {
            setGestureTrackId(null);
            setGestureState(null);
          }, 500);
          
          // Show toast notification
          toast({
            title: "Track Muted",
            description: `Track "${track.name}" muted (swipe right to unmute)`,
            duration: 2000,
          });
        }
      },
      onSwipeRight: async () => {
        setGestureTrackId(trackId);
        setGestureState('swipe-right');
        
        // Unmute the track if it's muted
        if (track.isMuted) {
          // Use existing function but create a synthetic event
          await handleToggleMute(track, { stopPropagation: () => {} } as unknown as React.MouseEvent);
          
          // Broadcast gesture action to other clients if connected
          if (isConnected) {
            sendTrackAction('unmute', track.id, track.name);
          }
          
          // Show a visual feedback
          setTimeout(() => {
            setGestureTrackId(null);
            setGestureState(null);
          }, 500);
          
          // Show toast notification
          toast({
            title: "Track Unmuted",
            description: `Track "${track.name}" unmuted`,
            duration: 2000,
          });
        }
      },
      onSwipeUp: async () => {
        setGestureTrackId(trackId);
        setGestureState('swipe-up');
        
        // Arm the track if it's not already armed
        if (!track.isArmed) {
          // Use existing function but create a synthetic event
          await handleToggleArm(track, { stopPropagation: () => {} } as unknown as React.MouseEvent);
          
          // Broadcast gesture action to other clients if connected
          if (isConnected) {
            sendTrackAction('arm', track.id, track.name);
          }
          
          // Show a visual feedback
          setTimeout(() => {
            setGestureTrackId(null);
            setGestureState(null);
          }, 500);
          
          // Show toast notification
          toast({
            title: "Track Armed",
            description: `Track "${track.name}" armed for recording (swipe down to disarm)`,
            duration: 2000,
          });
        }
      },
      onSwipeDown: async () => {
        setGestureTrackId(trackId);
        setGestureState('swipe-down');
        
        // Disarm the track if it's armed
        if (track.isArmed) {
          // Use existing function but create a synthetic event
          await handleToggleArm(track, { stopPropagation: () => {} } as unknown as React.MouseEvent);
          
          // Broadcast gesture action to other clients if connected
          if (isConnected) {
            sendTrackAction('disarm', track.id, track.name);
          }
          
          // Show a visual feedback
          setTimeout(() => {
            setGestureTrackId(null);
            setGestureState(null);
          }, 500);
          
          // Show toast notification
          toast({
            title: "Track Disarmed",
            description: `Track "${track.name}" disarmed`,
            duration: 2000,
          });
        }
      },
      onTap: () => {
        // Select the track
        onSelectTrack(trackId);
      },
      // Show visual feedback during gestures
      onGestureStart: () => {
        setGestureTrackId(trackId);
      },
      onGestureEnd: () => {
        // Only reset if there's no active gesture state
        if (!gestureState) {
          setGestureTrackId(null);
        }
      }
    };
  };
  
  // Apply gestures to a track element
  const handleGestureForTrack = (trackId: number) => {
    const trackRef = trackRefs.current[trackId];
    if (!trackRef || !isMobile) return;
    
    const gestureHandlers = setupTrackGestures(trackId, trackRef);
    if (!gestureHandlers) return;
    
    // Create custom event handlers directly instead of using the hook
    const touchStartHandler = (e: TouchEvent) => {
      // Handle touch start (simplified version)
      console.log('Touch start on track:', trackId);
    };
    
    const touchEndHandler = (e: TouchEvent) => {
      // On touchend, handle tap gesture manually
      onSelectTrack(trackId);
    };
    
    // Add simple event listeners
    trackRef.addEventListener('touchstart', touchStartHandler);
    trackRef.addEventListener('touchend', touchEndHandler);
    
    // Return cleanup function (not currently used, but good practice)
    return () => {
      trackRef.removeEventListener('touchstart', touchStartHandler);
      trackRef.removeEventListener('touchend', touchEndHandler);
    };
  };
  
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="p-3 border-b border-[#333333] flex justify-between items-center">
          <div className="flex items-center gap-1">
            <h2 className="text-lg font-medium">Tracks</h2>
            {/* WebSocket connection indicator */}
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} transition-colors duration-300`} 
              title={isConnected ? 'Realtime connected' : 'Realtime disconnected'} />
          </div>
          <div className="flex gap-2 items-center">
            {isMobile && isConnected && (
              <span className="text-xs text-[#666666] flex items-center" title="Realtime gestures enabled">
                <Wifi className="w-3 h-3 mr-1 text-green-500" />
                Live
              </span>
            )}
            <div className="w-7 h-7"></div> {/* Placeholder for button */}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-h-full">
      <div className="p-3 border-b border-[#333333] flex justify-between items-center">
        <div className="flex items-center gap-1">
          <h2 className="text-lg font-medium">Tracks</h2>
          {/* WebSocket connection indicator */}
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} transition-colors duration-300`} 
            title={isConnected ? 'Realtime connected' : 'Realtime disconnected'} />
        </div>
        <div className="flex gap-2 items-center">
          {isMobile && isConnected && (
            <span className="text-xs text-[#666666] flex items-center" title="Realtime gestures enabled">
              <Wifi className="w-3 h-3 mr-1 text-green-500" />
              Live
            </span>
          )}
          
          {/* Quick Add Track Buttons */}
          <div className="flex gap-1">
            <button 
              onClick={() => handleCreateTrack('audio')}
              className="p-1.5 bg-[#5D87FF] hover:bg-[#4A6BCC] rounded-full transition-colors"
              title="Add Audio Track"
              disabled={isAddingTrack}
            >
              <ListMusic className="w-3.5 h-3.5 text-white" />
            </button>
            
            <button 
              onClick={() => handleCreateTrack('midi')}
              className="p-1.5 bg-[#9747FF] hover:bg-[#7939CC] rounded-full transition-colors"
              title="Add MIDI Track"
              disabled={isAddingTrack}
            >
              <Music className="w-3.5 h-3.5 text-white" />
            </button>
            
            <button 
              onClick={() => handleCreateTrack('vocal')}
              className="p-1.5 bg-[#FF7A00] hover:bg-[#CC6200] rounded-full transition-colors"
              title="Add Vocal Track"
              disabled={isAddingTrack}
            >
              <Mic className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Track List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1" ref={trackListRef}>
        {tracks && tracks.length > 0 ? (
          tracks.map((track) => (
            <div 
              key={track.id}
              ref={(el) => {
                if (el) trackRefs.current[track.id] = el;
                // Initialize gesture handling for this track
                handleGestureForTrack(track.id);
              }}
              className={`flex flex-col rounded-md cursor-pointer transition-colors ${
                selectedTrackId === track.id 
                  ? 'bg-[#252525]' 
                  : 'hover:bg-[#1A1A1A]'
              } ${
                gestureTrackId === track.id
                  ? gestureState === 'swipe-left'
                    ? 'animate-slide-left bg-orange-950/20'
                    : gestureState === 'swipe-right'
                    ? 'animate-slide-right bg-green-950/20'
                    : gestureState === 'swipe-up'
                    ? 'animate-slide-up bg-red-950/20'
                    : gestureState === 'swipe-down'
                    ? 'animate-slide-down bg-blue-950/20'
                    : 'bg-zinc-800/50'
                  : ''
              }`}
              onClick={() => onSelectTrack(track.id)}
            >
              {/* Gesture Indicator (mobile only) */}
              {isMobile && gestureTrackId === track.id && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                  {gestureState === 'swipe-left' && (
                    <VolumeX className="w-8 h-8 text-[#FF7A00] animate-pulse" />
                  )}
                  {gestureState === 'swipe-right' && (
                    <Volume2 className="w-8 h-8 text-green-500 animate-pulse" />
                  )}
                  {gestureState === 'swipe-up' && (
                    <Mic className="w-8 h-8 text-red-500 animate-pulse" />
                  )}
                  {gestureState === 'swipe-down' && (
                    <Mic className="w-8 h-8 text-blue-500 animate-pulse" />
                  )}
                </div>
              )}
              
              {/* Main Track Row */}
              <div className="flex items-center p-2 relative">
                {/* Track Color and Type Icon */}
                <div 
                  className="w-7 h-7 flex items-center justify-center rounded-md text-white mr-2"
                  style={{ backgroundColor: getTrackColor(track) }}
                >
                  {getTrackTypeIcon(track.type)}
                </div>
                
                {/* Track Name */}
                <div className="flex-1 truncate">
                  <div className="text-sm font-medium text-white">{track.name}</div>
                  <div className="text-xs text-[#999999] flex items-center">
                    {track.type}
                    {isMobile && (
                      <span className="ml-2 text-xs text-[#666666] flex items-center" title="Mobile gesture controls enabled">
                        <FlipHorizontal className="w-3 h-3 mr-1" />
                        Swipe for actions
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Track Controls */}
                <div className="flex items-center space-x-1 ml-1">
                  {/* Mute Button */}
                  <button 
                    className={`p-1.5 rounded-md ${
                      track.isMuted 
                        ? 'bg-[#333333] text-[#FF7A00]' 
                        : 'hover:bg-[#252525] text-[#999999]'
                    }`}
                    onClick={(e) => handleToggleMute(track, e)}
                    title={track.isMuted ? 'Unmute' : 'Mute'}
                  >
                    {track.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  
                  {/* Arm Button */}
                  <button 
                    className={`p-1.5 rounded-md ${
                      track.isArmed 
                        ? 'bg-[#333333] text-red-500' 
                        : 'hover:bg-[#252525] text-[#999999]'
                    }`}
                    onClick={(e) => handleToggleArm(track, e)}
                    title={track.isArmed ? 'Disarm' : 'Arm for Recording'}
                  >
                    <Mic className={`w-3.5 h-3.5 ${track.isArmed ? 'animate-pulse' : ''}`} />
                  </button>
                  
                  {/* More Options Button */}
                  <button 
                    className="p-1.5 hover:bg-[#252525] text-[#999999] rounded-md relative"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackActionsOpen(trackActionsOpen === track.id ? null : track.id);
                    }}
                    title="More Options"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                    
                    {/* Track Actions Dropdown */}
                    {trackActionsOpen === track.id && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-[#1A1A1A] shadow-lg rounded-md border border-[#333333] z-10">
                        <button 
                          className="w-full flex items-center p-2 text-xs hover:bg-[#252525] text-left"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setTrackActionsOpen(null);
                            
                            try {
                              // Show loading toast
                              toast({
                                title: "Duplicating track",
                                description: `Creating a copy of "${track.name}"`,
                              });
                              
                              // Call the duplicate endpoint
                              const duplicatedTrack = await apiRequest<Track>(`/api/tracks/${track.id}/duplicate`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                }
                              });
                              
                              // Update the track list
                              queryClient.invalidateQueries({ 
                                queryKey: ['/api/projects', track.projectId, 'tracks'] 
                              });
                              
                              // Create track in audio engine
                              if (audioEngine.isEngineInitialized()) {
                                audioEngine.createTrack(duplicatedTrack);
                              }
                              
                              // Show success message
                              toast({
                                title: "Track duplicated",
                                description: `Created "${duplicatedTrack.name}"`,
                              });
                              
                              // Select the new track
                              onSelectTrack(duplicatedTrack.id);
                              
                            } catch (error) {
                              console.error("Error duplicating track:", error);
                              toast({
                                title: "Failed to duplicate track",
                                description: "There was an error duplicating the track. Please try again.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Copy className="w-3.5 h-3.5 mr-2" />
                          Duplicate Track
                        </button>
                        
                        <button 
                          className="w-full flex items-center p-2 text-xs hover:bg-[#252525] text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            // AI enhancement functionality
                            toast({
                              title: "Feature coming soon",
                              description: "AI enhancement feature will be available in the next update",
                            });
                            setTrackActionsOpen(null);
                          }}
                        >
                          <Computer className="w-3.5 h-3.5 mr-2" />
                          AI Enhance
                        </button>
                        
                        <button 
                          className="w-full flex items-center p-2 text-xs hover:bg-[#252525] text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Track reordering functionality
                            toast({
                              title: "Feature coming soon",
                              description: "Track reordering feature will be available in the next update",
                            });
                            setTrackActionsOpen(null);
                          }}
                        >
                          <MoveVertical className="w-3.5 h-3.5 mr-2" />
                          Reorder Track
                        </button>
                        
                        <button 
                          className="w-full flex items-center p-2 text-xs hover:bg-[#252525] text-left text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Delete track functionality
                            toast({
                              title: "Feature coming soon",
                              description: "Delete track feature will be available in the next update",
                              variant: "destructive",
                            });
                            setTrackActionsOpen(null);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Delete Track
                        </button>
                      </div>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Track volume indicator (only shown for selected track) */}
              {selectedTrackId === track.id && (
                <div className="px-2 pb-2">
                  <div className="h-1 w-full bg-[#333333] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#FF7A00] to-[#CC6200]" 
                      style={{ width: `${(track.volume ?? 0) + 80}%` }} // Convert from dB to percentage
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-[#999999]">
            <p className="mb-4">No tracks yet</p>
            <div className="flex flex-col md:flex-row gap-2">
              <button 
                className="px-3 py-2 text-sm bg-[#5D87FF] hover:bg-[#4A6BCC] rounded-md text-white flex items-center justify-center"
                onClick={() => handleCreateTrack('audio')}
                disabled={isAddingTrack}
              >
                <ListMusic className="w-4 h-4 mr-1.5" />
                Audio Track
              </button>
              <button 
                className="px-3 py-2 text-sm bg-[#9747FF] hover:bg-[#7939CC] rounded-md text-white flex items-center justify-center"
                onClick={() => handleCreateTrack('midi')}
                disabled={isAddingTrack}
              >
                <Music className="w-4 h-4 mr-1.5" />
                MIDI Track
              </button>
              <button 
                className="px-3 py-2 text-sm bg-[#FF7A00] hover:bg-[#CC6200] rounded-md text-white flex items-center justify-center"
                onClick={() => handleCreateTrack('vocal')}
                disabled={isAddingTrack}
              >
                <Mic className="w-4 h-4 mr-1.5" />
                Vocal Track
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Click away handler for dropdowns */}
      {trackActionsOpen !== null && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setTrackActionsOpen(null)}
        />
      )}
    </div>
  );
}
