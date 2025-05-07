import { Project } from '@shared/schema';
import { useMobile } from '@/hooks/use-mobile';

interface StatusFooterProps {
  project: Project | null;
  isConnected: boolean;
}

export default function StatusFooter({ project, isConnected }: StatusFooterProps) {
  const isMobile = useMobile();
  
  if (isMobile) {
    return (
      <footer className="h-5 bg-[#121212] border-t border-[#333333] flex items-center justify-between px-2 text-[9px] text-[#999999]">
        <div>{project?.name || 'Untitled'}</div>
        <div>{project?.tempo || 120} BPM</div>
        <div>{isConnected ? 'Connected' : 'Offline'}</div>
      </footer>
    );
  }
  
  return (
    <footer className="h-6 bg-[#121212] border-t border-[#333333] flex items-center justify-between px-4 text-xs text-[#999999]">
      <div>Project: {project?.name || 'Untitled'}.fathom (Unsaved)</div>
      <div>{project?.tempo || 120} BPM | 24-bit/48kHz | 00:03:24</div>
      <div>{isConnected ? 'Connected' : 'Offline'} | MixBot Active</div>
    </footer>
  );
}
