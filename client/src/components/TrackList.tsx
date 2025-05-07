import { Track } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';

interface TrackListProps {
  tracks: Track[] | undefined;
  isLoading: boolean;
  selectedTrackId: number | null;
  onSelectTrack: (trackId: number) => void;
}

export default function TrackList({ 
  tracks, 
  isLoading, 
  selectedTrackId, 
  onSelectTrack 
}: TrackListProps) {
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="p-3 border-b border-fathom-lightgray">
          <h2 className="text-lg font-medium">Tracks</h2>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="p-3 border-b border-fathom-lightgray">
        <h2 className="text-lg font-medium">Tracks</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {tracks && tracks.length > 0 ? (
          tracks.map((track) => (
            <div 
              key={track.id}
              className={`flex items-center p-2 rounded-md cursor-pointer ${
                selectedTrackId === track.id 
                  ? 'bg-fathom-orange bg-opacity-20' 
                  : 'hover:bg-fathom-gray hover:bg-opacity-20'
              }`}
              onClick={() => onSelectTrack(track.id)}
            >
              <span 
                className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold ${
                  track.isAI ? 'bg-fathom-orange' : 'bg-fathom-gray'
                }`}
              >
                {track.name.charAt(0)}
              </span>
              <span className="ml-2 text-white">{track.name}</span>
              <div className="ml-auto flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${
                  track.isAI ? 'bg-fathom-orange' : 'bg-fathom-lightgray'
                }`}></div>
                <span className="text-xs text-fathom-text-secondary">
                  {track.isAI ? 'AI' : track.type.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-fathom-text-secondary">
            <p>No tracks yet</p>
            <button className="mt-2 px-3 py-1 text-sm bg-fathom-orange rounded text-white hover:bg-fathom-orange-dark">
              Create Track
            </button>
          </div>
        )}
      </div>
    </>
  );
}
