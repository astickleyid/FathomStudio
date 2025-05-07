import { Project } from '@shared/schema';

interface StatusFooterProps {
  project: Project | null;
  isConnected: boolean;
}

export default function StatusFooter({ project, isConnected }: StatusFooterProps) {
  return (
    <footer className="h-6 bg-fathom-black border-t border-fathom-lightgray flex items-center justify-between px-4 text-xs text-fathom-text-secondary">
      <div>Project: {project?.name || 'Untitled'}.fathom (Unsaved)</div>
      <div>{project?.tempo || 120} BPM | 24-bit/48kHz | 00:03:24</div>
      <div>{isConnected ? 'Connected' : 'Offline'} | MixBot Active</div>
    </footer>
  );
}
