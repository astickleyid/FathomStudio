import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import MainHeader from '@/components/MainHeader';
import TrackList from '@/components/TrackList';
import Timeline from '@/components/Timeline';
import MixerPanel from '@/components/MixerPanel';
import AICommandInterface from '@/components/AICommandInterface';
import TransportControls from '@/components/TransportControls';
import StatusFooter from '@/components/StatusFooter';
import { useToast } from '@/hooks/use-toast';
import useWebSocket, { ReadyState } from '@/hooks/use-websocket';
import { Project, Track } from '@shared/schema';

export default function Home() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const { toast } = useToast();

  // Get the project ID from the URL
  const [, params] = useLocation();
  const projectId = params ? parseInt(params.id) : null;

  // Query to get the specific project
  const { data: project, isLoading: isLoadingProjects } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
    enabled: !!projectId,
  });

  // Once we have the project, set it as current
  useEffect(() => {
    if (project) {
      setCurrentProject(project);
    }
  }, [project]);

  // Query to get tracks for the current project
  const { data: tracksData, isLoading: isLoadingTracks } = useQuery<Track[]>({
    queryKey: ['/api/projects', currentProject?.id, 'tracks'],
    enabled: !!currentProject?.id,
  });

  // Helper function to handle WebSocket messages
  const handleWebSocketMessage = useCallback((event: WebSocketEventMap['message']) => {
    try {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data);
      
      // Handle different message types
      if (data.type === 'pong') {
        console.log('Received pong from server');
      } else if (data.type === 'track_update' || data.type === 'track_created' || data.type === 'track_updated') {
        // Would normally fetch updated tracks or update state directly
        // For now, we'll just show a toast
        toast({
          title: 'Track Update',
          description: `Track ${data.data.name} has been updated`,
          duration: 2000,
        });
      } else if (data.type === 'ai_suggestion_created') {
        toast({
          title: 'New AI Suggestion',
          description: data.data.suggestion,
          duration: 4000,
        });
      } else if (data.type === 'connected') {
        console.log('Connection acknowledged by server:', data.message);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }, [toast]);

  // Handle WebSocket connection open
  const handleWebSocketOpen = useCallback((event: WebSocketEventMap['open']) => {
    console.log('WebSocket connection established');
    setIsConnected(true);
    toast({
      title: 'Connected to Fathom Studio',
      description: 'Real-time audio collaboration is now active',
      duration: 3000,
    });
  }, [toast]);

  // Handle WebSocket connection close
  const handleWebSocketClose = useCallback(() => {
    console.log('WebSocket connection closed');
    setIsConnected(false);
  }, []);

  // Create WebSocket URL only if we have a project
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = currentProject ? `${protocol}//${window.location.host}/ws` : null;

  // Use our custom WebSocket hook
  const { sendMessage, readyState, getWebSocket } = useWebSocket(
    wsUrl || '', // Empty string when no URL is available
    {
      onOpen: handleWebSocketOpen,
      onClose: handleWebSocketClose,
      onMessage: handleWebSocketMessage,
      shouldReconnect: !!currentProject, // Only reconnect if we have a project
      reconnectInterval: 3000,
      reconnectAttempts: 10,
      pingInterval: 20000,
    }
  );

  // Update socket ref whenever the WebSocket connection changes
  useEffect(() => {
    const ws = getWebSocket();
    if (ws) {
      setSocket(ws);
    }
    // Update connection status based on readyState
    setIsConnected(readyState === ReadyState.OPEN);
  }, [getWebSocket, readyState]);

  const handleTrackSelect = (trackId: number) => {
    setSelectedTrack(trackId);
  };

  const handleProcessAICommand = async (command: string) => {
    // Send the command to the server
    if (readyState === ReadyState.OPEN) {
      sendMessage(JSON.stringify({
        type: 'ai_command',
        command: command,
        projectId: currentProject?.id
      }));
    }
    
    try {
      const response = await fetch('/api/ai/process-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          projectId: currentProject?.id
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to process AI command');
      }
      
      const data = await response.json();
      
      toast({
        title: 'AI Response',
        description: data.suggestion,
        duration: 5000,
      });
      
      return data;
    } catch (error) {
      console.error('Error processing AI command:', error);
      toast({
        title: 'Error',
        description: 'Failed to process AI command',
        variant: 'destructive',
        duration: 3000,
      });
      return null;
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <MainHeader 
        project={currentProject} 
        isLoading={isLoadingProjects}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Track List and AI Controls */}
        <div className="w-64 bg-[#121212] border-r border-[#333333] flex flex-col">
          <TrackList 
            tracks={Array.isArray(tracksData) ? tracksData : undefined} 
            isLoading={isLoadingTracks} 
            selectedTrackId={selectedTrack}
            onSelectTrack={handleTrackSelect}
          />
          
          <AICommandInterface 
            onProcessCommand={handleProcessAICommand}
            isConnected={isConnected}
          />
        </div>
        
        {/* Main Content Area with Timeline Editor */}
        <div className="flex-1 flex flex-col bg-[#121212] overflow-hidden">
          <Timeline 
            tracks={Array.isArray(tracksData) ? tracksData : undefined} 
            isLoading={isLoadingTracks}
            project={currentProject}
          />
          
          <TransportControls 
            tempo={currentProject?.tempo || 120}
            socket={socket}
          />
        </div>
        
        {/* Right Sidebar: Mixer and Effect Panels */}
        <div className="w-80 bg-[#1A1A1A] border-l border-[#333333] flex flex-col">
          <MixerPanel 
            tracks={Array.isArray(tracksData) ? tracksData : undefined} 
            isLoading={isLoadingTracks} 
            selectedTrackId={selectedTrack}
            projectId={currentProject?.id}
          />
        </div>
      </div>
      
      {/* Footer Status Bar */}
      <StatusFooter 
        project={currentProject}
        isConnected={isConnected}
      />
    </div>
  );
}
