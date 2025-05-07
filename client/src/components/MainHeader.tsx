import { useState } from 'react';
import { Project } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Settings } from 'lucide-react';

interface MainHeaderProps {
  project: Project | null;
  isLoading: boolean;
}

export default function MainHeader({ project, isLoading }: MainHeaderProps) {
  const [tempo, setTempo] = useState<number>(project?.tempo || 120);
  const [timeSignature, setTimeSignature] = useState<string>(project?.timeSignature || "4/4");

  return (
    <header className="flex items-center justify-between bg-[#1A1A1A] p-3 border-b border-[#333333]">
      <div className="flex items-center">
        <svg className="w-8 h-8 text-[#FF7A00]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 4h7a4 4 0 0 1 4 4v12a4 4 0 0 1-4-4V8H4v12h16V4H4z"></path>
        </svg>
        <span className="ml-2 text-xl font-semibold text-white">Fathom Studio</span>
      </div>
      
      <div className="flex space-x-4">
        <div className="flex space-x-1">
          <button className="px-3 py-1 bg-[#252525] rounded text-white hover:bg-[#333333]">File</button>
          <button className="px-3 py-1 bg-[#252525] rounded text-white hover:bg-[#333333]">Edit</button>
          <button className="px-3 py-1 bg-[#252525] rounded text-white hover:bg-[#333333]">View</button>
          <button className="px-3 py-1 bg-[#252525] rounded text-white hover:bg-[#333333]">Mix</button>
        </div>
        
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-12" />
          </>
        ) : (
          <>
            <div className="flex items-center bg-[#252525] rounded px-3 py-1">
              <input 
                type="number" 
                value={tempo} 
                onChange={(e) => setTempo(Number(e.target.value))}
                className="w-10 bg-transparent text-[#FF7A00] font-medium text-center"
              />
              <span className="ml-1 text-[#999999] text-sm">BPM</span>
            </div>
            
            <div className="flex items-center bg-[#252525] rounded px-3 py-1">
              <span className="text-white font-medium">{timeSignature}</span>
            </div>
          </>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <button className="p-2 bg-[#333333] rounded-full hover:bg-[#252525]">
          <Plus className="w-5 h-5 text-white" />
        </button>
        <button className="p-2 bg-[#333333] rounded-full hover:bg-[#252525]">
          <Settings className="w-5 h-5 text-white" />
        </button>
      </div>
    </header>
  );
}
