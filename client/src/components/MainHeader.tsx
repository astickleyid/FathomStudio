import { useState, useEffect } from 'react';
import { Project } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Save, Settings, User, ChevronDown, Home, Plus, 
  FileAudio, Music, Volume2, FileText, X, 
  Waves, Play, Pause, Download
} from 'lucide-react';
import { Link } from 'wouter';

interface MainHeaderProps {
  project: Project | null;
  isLoading: boolean;
}

export default function MainHeader({ project, isLoading }: MainHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tempo, setTempo] = useState<number>(project?.tempo || 120);
  const [timeSignature, setTimeSignature] = useState<string>(project?.timeSignature || "4/4");
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Update tempo and time signature if project changes
  useEffect(() => {
    if (project) {
      setTempo(project.tempo || 120);
      setTimeSignature(project.timeSignature || "4/4");
    }
  }, [project]);
  
  const handleSave = () => {
    if (!project) return;
    
    setIsSaving(true);
    
    // Simulate saving project
    setTimeout(() => {
      setIsSaving(false);
    }, 800);
  };
  
  const handleTempoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTempo = Number(e.target.value);
    setTempo(newTempo);
    // Here you would update the project via API
  };
  
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // Here you would control the actual audio playback
  };
  
  return (
    <header className="flex items-center justify-between bg-[#121212] p-2 border-b border-[#333333] z-20 relative">
      {/* Left Section: Logo and Project Controls */}
      <div className="flex items-center space-x-3">
        <Link href="/" className="flex items-center">
          <Waves className="w-7 h-7 text-[#FF7A00]" />
          <span className="ml-1.5 text-xl font-bold text-white">FATHOM</span>
        </Link>
        
        {/* Project Menu */}
        <div className="relative">
          <button 
            onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
            className="flex items-center bg-[#1A1A1A] hover:bg-[#252525] rounded-md px-3 py-1.5 text-sm transition-colors"
          >
            {isLoading ? (
              <Skeleton className="h-5 w-24" />
            ) : (
              <>
                <FileAudio className="w-4 h-4 mr-1.5" />
                {project?.name || "No Project"}
                <ChevronDown className="w-3.5 h-3.5 ml-2" />
              </>
            )}
          </button>
          
          {/* Project Dropdown Menu */}
          {isProjectMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-[#1A1A1A] shadow-lg rounded-md border border-[#333333] z-30">
              <div className="p-2 space-y-1">
                <Link href="/" 
                  className="flex items-center px-3 py-2 text-sm hover:bg-[#252525] rounded-md transition-colors"
                  onClick={() => setIsProjectMenuOpen(false)}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Project Browser
                </Link>
                <Link href="/" 
                  className="flex items-center px-3 py-2 text-sm hover:bg-[#252525] rounded-md transition-colors"
                  onClick={() => setIsProjectMenuOpen(false)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Link>
                <button 
                  className="flex items-center px-3 py-2 text-sm w-full text-left hover:bg-[#252525] rounded-md transition-colors"
                  onClick={handleSave}
                  disabled={isSaving || !project}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Project
                </button>
                <button 
                  className="flex items-center px-3 py-2 text-sm w-full text-left hover:bg-[#252525] rounded-md transition-colors"
                  disabled={!project}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Audio
                </button>
                
                {project && (
                  <>
                    <hr className="my-2 border-[#333333]" />
                    <div className="px-3 py-1 text-xs text-[#999999]">
                      Project Details
                    </div>
                    <div className="px-3 py-1 text-xs flex">
                      <span className="text-[#999999] w-24">Tempo:</span>
                      <span>{project.tempo} BPM</span>
                    </div>
                    <div className="px-3 py-1 text-xs flex">
                      <span className="text-[#999999] w-24">Time Signature:</span>
                      <span>{project.timeSignature}</span>
                    </div>
                    <div className="px-3 py-1 text-xs flex">
                      <span className="text-[#999999] w-24">Sample Rate:</span>
                      <span>{project.sampleRate} Hz</span>
                    </div>
                    <div className="px-3 py-1 text-xs flex">
                      <span className="text-[#999999] w-24">Last Modified:</span>
                      <span>{new Date(project.updatedAt).toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Save Button */}
        <button 
          onClick={handleSave}
          className="flex items-center bg-[#252525] hover:bg-[#333333] rounded-md px-3 py-1.5 text-xs transition-colors"
          disabled={isSaving || !project}
        >
          {isSaving ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5"></div>
          ) : (
            <Save className="w-3.5 h-3.5 mr-1.5" />
          )}
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
      
      {/* Center Section: Main Controls */}
      <div className="flex items-center space-x-4">
        {/* Menu Buttons */}
        <div className="flex space-x-1">
          <button className="px-3 py-1.5 bg-[#252525] rounded text-white text-xs hover:bg-[#333333] flex items-center">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            File
          </button>
          <button className="px-3 py-1.5 bg-[#252525] rounded text-white text-xs hover:bg-[#333333] flex items-center">
            <Music className="w-3.5 h-3.5 mr-1.5" />
            Mix
          </button>
          <button className="px-3 py-1.5 bg-[#252525] rounded text-white text-xs hover:bg-[#333333] flex items-center">
            <Volume2 className="w-3.5 h-3.5 mr-1.5" />
            Audio
          </button>
        </div>
        
        {/* Transport Controls */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={handlePlayPause} 
            className="p-1.5 bg-[#FF7A00] rounded-full hover:bg-[#CC6200] transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-white" />
            )}
          </button>
          
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-12" />
            </>
          ) : (
            <>
              <div className="flex items-center bg-[#252525] rounded px-3 py-1.5">
                <input 
                  type="number" 
                  value={tempo} 
                  onChange={handleTempoChange}
                  className="w-10 bg-transparent text-[#FF7A00] font-medium text-center text-sm"
                  min={20}
                  max={300}
                />
                <span className="ml-1 text-[#999999] text-xs">BPM</span>
              </div>
              
              <div className="flex items-center bg-[#252525] rounded px-3 py-1.5 text-sm">
                <span className="text-white font-medium">{timeSignature}</span>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Right Section: Settings */}
      <div className="flex items-center space-x-2">
        <div className="relative">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-1.5 bg-[#252525] rounded-full hover:bg-[#333333] transition-colors"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
          
          {/* Settings Dropdown */}
          {isSettingsOpen && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-[#1A1A1A] shadow-lg rounded-md border border-[#333333] z-30">
              <div className="flex justify-between items-center p-2 border-b border-[#333333]">
                <h3 className="text-sm font-medium">Settings</h3>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 hover:bg-[#333333] rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2 space-y-1">
                <button className="flex items-center px-3 py-2 text-sm w-full text-left hover:bg-[#252525] rounded-md transition-colors">
                  <User className="w-4 h-4 mr-2" />
                  User Profile
                </button>
                <button className="flex items-center px-3 py-2 text-sm w-full text-left hover:bg-[#252525] rounded-md transition-colors">
                  <Settings className="w-4 h-4 mr-2" />
                  Preferences
                </button>
                <button className="flex items-center px-3 py-2 text-sm w-full text-left hover:bg-[#252525] rounded-md transition-colors">
                  <Volume2 className="w-4 h-4 mr-2" />
                  Audio Settings
                </button>
                <hr className="my-1 border-[#333333]" />
                <button className="flex items-center px-3 py-2 text-sm w-full text-left hover:bg-[#252525] rounded-md transition-colors text-[#FF7A00]">
                  <Home className="w-4 h-4 mr-2" />
                  Exit to Home
                </button>
              </div>
            </div>
          )}
        </div>
        
        <button className="p-1.5 bg-[#252525] rounded-full hover:bg-[#333333] transition-colors">
          <User className="w-5 h-5 text-white" />
        </button>
      </div>
      
      {/* Click away handler for dropdowns */}
      {(isSettingsOpen || isProjectMenuOpen) && (
        <div 
          className="fixed inset-0 z-20" 
          onClick={() => {
            setIsSettingsOpen(false);
            setIsProjectMenuOpen(false);
          }}
        />
      )}
    </header>
  );
}
