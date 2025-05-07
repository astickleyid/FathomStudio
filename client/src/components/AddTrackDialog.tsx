import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusIcon, Mic2Icon, MusicIcon, WavesIcon, Layers3Icon, SettingsIcon } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useMobile } from '@/hooks/use-mobile';

interface AddTrackDialogProps {
  projectId: number | undefined | null;
}

interface TrackTypeOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const TRACK_TYPES: TrackTypeOption[] = [
  {
    id: 'audio',
    name: 'Audio Track',
    icon: <WavesIcon size={24} />,
    color: '#5b86e5',
    description: 'Recording or imported audio files'
  },
  {
    id: 'vocal',
    name: 'Vocal Track',
    icon: <Mic2Icon size={24} />, 
    color: '#ff7a00',
    description: 'Optimized for vocal recordings'
  },
  {
    id: 'midi',
    name: 'MIDI Track',
    icon: <MusicIcon size={24} />,
    color: '#36b37e',
    description: 'Virtual instruments and MIDI controllers'
  },
  {
    id: 'master',
    name: 'Master Track',
    icon: <SettingsIcon size={24} />,
    color: '#f05053',
    description: 'Final output and mastering processing'
  },
  {
    id: 'group',
    name: 'Group Track',
    icon: <Layers3Icon size={24} />,
    color: '#9747ff',
    description: 'Organize and process multiple tracks together'
  }
];

export default function AddTrackDialog({ projectId }: AddTrackDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const isMobile = useMobile();
  const { toast } = useToast();

  const createTrack = async (trackType: string) => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "No project selected",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get the track type definition
      const trackTypeOption = TRACK_TYPES.find(t => t.id === trackType);
      if (!trackTypeOption) return;
      
      // Create the track with appropriate defaults based on type
      const result = await apiRequest(
        `/api/projects/${projectId}/tracks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${trackTypeOption.name} 1`,
            type: trackType,
            color: trackTypeOption.color,
            isMuted: false,
            isSoloed: false, 
            isArmed: trackType === 'vocal' || trackType === 'audio', // Auto arm recording tracks
            isAI: false,
          })
        }
      );
      
      // Invalidate track cache to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tracks'] });
      
      toast({
        title: "Track Created",
        description: `New ${trackTypeOption.name} has been added to your project`
      });
      
      setOpen(false);
    } catch (error) {
      console.error("Error creating track:", error);
      toast({
        title: "Error",
        description: "Failed to create new track",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const duplicateTrack = async (trackId: number) => {
    // Implementation for track duplication
    // Will be added in future updates
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`fixed ${isMobile ? 'bottom-28 right-4' : 'bottom-20 left-4'} rounded-full w-12 h-12 bg-orange-600 hover:bg-orange-700 shadow-lg z-10`}
        >
          <PlusIcon className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className={`${isMobile ? 'w-[90%] max-w-[90vw]' : 'sm:max-w-md'}`}>
        <DialogHeader>
          <DialogTitle>Add New Track</DialogTitle>
          <DialogDescription>
            Select the type of track you want to create
          </DialogDescription>
        </DialogHeader>
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 py-4`}>
          {TRACK_TYPES.map((trackType) => (
            <Button
              key={trackType.id}
              variant="outline"
              className={`h-auto py-4 px-3 flex ${isMobile ? 'flex-row' : 'flex-col'} items-center justify-center gap-3 hover:bg-slate-800`}
              onClick={() => createTrack(trackType.id)}
              disabled={isLoading}
            >
              <div className="rounded-full p-2" style={{ backgroundColor: `${trackType.color}20` }}>
                <div className={`${isMobile ? 'text-xl' : 'text-2xl'}`} style={{ color: trackType.color }}>
                  {trackType.icon}
                </div>
              </div>
              <div className={`${isMobile ? 'text-left' : 'text-center'} flex-1`}>
                <div className="font-medium">{trackType.name}</div>
                {!isMobile && (
                  <div className="text-xs text-muted-foreground mt-1">{trackType.description}</div>
                )}
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}