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
        <div className="p-3 border-b border-[#333333]">
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
      <div className="p-3 border-b border-[#333333]">
        <h2 className="text-lg font-medium">Tracks</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {tracks && tracks.length > 0 ? (
          tracks.map((track) => (
            <div 
              key={track.id}
              className={`flex items-center p-2 rounded-md cursor-pointer ${
                selectedTrackId === track.id 
                  ? 'bg-[#FF7A00] bg-opacity-20' 
                  : 'hover:bg-[#252525] hover:bg-opacity-20'
              }`}
              onClick={() => onSelectTrack(track.id)}
            >
              <span 
                className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold ${
                  track.isAI ? 'bg-[#FF7A00]' : 'bg-[#252525]'
                }`}
              >
                {track.name.charAt(0)}
              </span>
              <span className="ml-2 text-white">{track.name}</span>
              <div className="ml-auto flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${
                  track.isAI ? 'bg-[#FF7A00]' : 'bg-[#333333]'
                }`}></div>
                <span className="text-xs text-[#999999]">
                  {track.isAI ? 'AI' : (track.type && track.type.length > 0 ? track.type.charAt(0).toUpperCase() : 'A')}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-[#999999]">
            <p>No tracks yet</p>
            <button className="mt-2 px-3 py-1 text-sm bg-[#FF7A00] rounded text-white hover:bg-[#CC6200]">
              Create Track
            </button>
          </div>
        )}
      </div>
    </>
  );
}
