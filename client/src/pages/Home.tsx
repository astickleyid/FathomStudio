import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import MainHeader from '@/components/MainHeader';
import TrackList from '@/components/TrackList';
import Timeline from '@/components/Timeline';
import MixerPanel from '@/components/MixerPanel';
import AICommandInterface from '@/components/AICommandInterface';
import TransportControls from '@/components/TransportControls';
import StatusFooter from '@/components/StatusFooter';
import { useToast } from '@/hooks/use-toast';
import { Project, Track } from '@shared/schema';

export default function Home() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const { toast } = useToast();

  // Query to get the demo project (default)
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
    enabled: true,
  });

  // Once we have projects, select the first one
  useEffect(() => {
    if (projectsData && projectsData.length > 0) {
      setCurrentProject(projectsData[0]);
    }
  }, [projectsData]);

  // Query to get tracks for the current project
  const { data: tracksData, isLoading: isLoadingTracks } = useQuery({
    queryKey: ['/api/projects', currentProject?.id, 'tracks'],
    enabled: !!currentProject?.id,
  });

  // Set up WebSocket connection
  useEffect(() => {
    if (!socket && currentProject) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const newSocket = new WebSocket(wsUrl);
      
      newSocket.onopen = () => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        toast({
          title: 'Connected to Fathom Studio',
          description: 'Real-time audio collaboration is now active',
          duration: 3000,
        });
      };
      
      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          // Handle different message types
          if (data.type === 'track_update' || data.type === 'track_created' || data.type === 'track_updated') {
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
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      newSocket.onclose = () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        // Try to reconnect after a delay
        setTimeout(() => setSocket(null), 5000);
      };
      
      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      setSocket(newSocket);
      
      // Clean up on unmount
      return () => {
        newSocket.close();
      };
    }
  }, [currentProject, socket, toast]);

  const handleTrackSelect = (trackId: number) => {
    setSelectedTrack(trackId);
  };

  const handleProcessAICommand = async (command: string) => {
    // Send the command to the server
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
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
        <div className="w-64 bg-fathom-black border-r border-fathom-lightgray flex flex-col">
          <TrackList 
            tracks={tracksData} 
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
        <div className="flex-1 flex flex-col bg-fathom-black overflow-hidden">
          <Timeline 
            tracks={tracksData} 
            isLoading={isLoadingTracks}
            project={currentProject}
          />
          
          <TransportControls 
            tempo={currentProject?.tempo || 120}
            socket={socket}
          />
        </div>
        
        {/* Right Sidebar: Mixer and Effect Panels */}
        <div className="w-80 bg-fathom-darkgray border-l border-fathom-lightgray flex flex-col">
          <MixerPanel 
            tracks={tracksData} 
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
