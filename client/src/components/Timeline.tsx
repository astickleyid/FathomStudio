import { useRef, useEffect, useState } from 'react';
import { Track, Project, Clip } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import TrackWaveform from './audio/TrackWaveform';

interface TimelineProps {
  tracks: Track[] | undefined;
  isLoading: boolean;
  project: Project | null;
}

export default function Timeline({ tracks, isLoading, project }: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [clips, setClips] = useState<Record<number, Clip[]>>({});
  
  // Fetch clips for each track
  useEffect(() => {
    async function fetchClips() {
      if (tracks && tracks.length > 0) {
        const clipsData: Record<number, Clip[]> = {};
        
        for (const track of tracks) {
          try {
            const response = await fetch(`/api/tracks/${track.id}/clips`);
            if (response.ok) {
              const trackClips = await response.json();
              clipsData[track.id] = trackClips;
            }
          } catch (error) {
            console.error(`Error fetching clips for track ${track.id}:`, error);
          }
        }
        
        setClips(clipsData);
      }
    }
    
    fetchClips();
  }, [tracks]);
  
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="h-8 bg-fathom-darkgray border-b border-fathom-lightgray">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="flex-1">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }
  
  return (
    <>
      {/* Time Ruler */}
      <div className="h-8 bg-fathom-darkgray border-b border-fathom-lightgray flex items-end px-4">
        <div className="flex-1 flex">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-1/8 border-r border-fathom-lightgray h-4 flex items-end justify-center">
              <span className="text-xs text-fathom-text-secondary">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Tracks Timeline */}
      <div className="flex-1 overflow-auto p-1 bg-fathom-black" ref={timelineRef}>
        {tracks && tracks.length > 0 ? (
          tracks.map((track) => (
            <TrackWaveform 
              key={track.id} 
              track={track} 
              clips={clips[track.id] || []} 
              zoom={zoom}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-fathom-text-secondary">
            <p>No tracks in this project</p>
            <p className="text-sm mt-1">Create a track to get started</p>
          </div>
        )}
        
        {/* Labels track */}
        <div className="h-8 mb-1 flex">
          <div className="track-waveform ml-4 mr-4 w-full">
            <div className="h-full rounded-md relative overflow-hidden">
              <div className="absolute top-0 left-1/3 w-1/3 h-full flex items-center">
                <div className="bg-fathom-darkgray px-2 py-1 rounded text-xs text-fathom-orange border border-fathom-orange border-opacity-30">
                  {project?.name || 'Untitled'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
