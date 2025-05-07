import { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  FolderOpen, 
  PlusCircle, 
  FileText, 
  LayoutTemplate, 
  Clock, 
  Settings, 
  HelpCircle,
  Github
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Project } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export default function StartPage() {
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Get recent projects
  const { data: recentProjects, isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: true,
  });

  // Create a new project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProjectName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a project name',
        variant: 'destructive',
      });
      return;
    }
    
    setIsCreatingProject(true);
    
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProjectName,
          tempo: 120,
          timeSignature: '4/4',
          sampleRate: 44100,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create project');
      }
      
      const newProject = await response.json();
      
      toast({
        title: 'Project Created',
        description: `${newProjectName} has been created successfully`,
      });
      
      // Navigate to the project
      setLocation(`/project/${newProject.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Open a project
  const handleOpenProject = (projectId: number) => {
    setLocation(`/project/${projectId}`);
  };

  // Open project from file system
  const handleOpenFromFiles = () => {
    // In a real app, this would open a file dialog
    toast({
      title: 'Feature Coming Soon',
      description: 'Opening projects from files will be available in the next update',
    });
  };

  // Open templates
  const handleOpenTemplates = () => {
    toast({
      title: 'Templates',
      description: 'Project templates will be available in the next update',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#121212] text-white">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-[#333333]">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF7A00] to-[#CC6200] flex items-center justify-center mr-3">
            <span className="font-bold text-xl">F</span>
          </div>
          <h1 className="text-2xl font-bold">Fathom Studio</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-[#252525] rounded-full">
            <Settings className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-[#252525] rounded-full">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Left Column - Start Options */}
          <div className="md:col-span-1">
            <h2 className="text-xl font-semibold mb-6">Start</h2>
            <div className="space-y-4">
              <button 
                onClick={() => setIsCreatingProject(true)}
                className="w-full flex items-center p-4 rounded-lg bg-[#1A1A1A] hover:bg-[#252525] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#FF7A00] flex items-center justify-center mr-4">
                  <PlusCircle className="w-5 h-5 text-white" />
                </div>
                <span>New Project</span>
              </button>
              
              <button 
                onClick={handleOpenFromFiles}
                className="w-full flex items-center p-4 rounded-lg bg-[#1A1A1A] hover:bg-[#252525] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#333333] flex items-center justify-center mr-4">
                  <FolderOpen className="w-5 h-5 text-white" />
                </div>
                <span>Open Project</span>
              </button>
              
              <button 
                onClick={handleOpenTemplates}
                className="w-full flex items-center p-4 rounded-lg bg-[#1A1A1A] hover:bg-[#252525] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#333333] flex items-center justify-center mr-4">
                  <LayoutTemplate className="w-5 h-5 text-white" />
                </div>
                <span>Project Templates</span>
              </button>
            </div>
            
            <div className="mt-10">
              <h2 className="text-xl font-semibold mb-6">Learn</h2>
              <div className="space-y-4">
                <a 
                  href="#tutorials"
                  className="w-full flex items-center p-4 rounded-lg bg-[#1A1A1A] hover:bg-[#252525] transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#333333] flex items-center justify-center mr-4">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <span>Tutorials</span>
                </a>
                
                <a 
                  href="https://github.com/fathom-studio/docs" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center p-4 rounded-lg bg-[#1A1A1A] hover:bg-[#252525] transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#333333] flex items-center justify-center mr-4">
                    <Github className="w-5 h-5 text-white" />
                  </div>
                  <span>Documentation</span>
                </a>
              </div>
            </div>
          </div>
          
          {/* Right Column - Recent Projects */}
          <div className="md:col-span-2">
            <h2 className="text-xl font-semibold mb-6">Recent Projects</h2>
            
            {isLoadingProjects ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 rounded-lg bg-[#1A1A1A]"></div>
                ))}
              </div>
            ) : !recentProjects || recentProjects.length === 0 ? (
              <div className="text-center py-12 bg-[#1A1A1A] rounded-lg">
                <Clock className="w-16 h-16 mx-auto text-[#444444] mb-4" />
                <h3 className="text-xl font-medium text-[#999999] mb-2">No Recent Projects</h3>
                <p className="text-[#777777]">
                  Create a new project to get started with Fathom Studio
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleOpenProject(project.id)}
                    className="flex flex-col p-4 rounded-lg bg-[#1A1A1A] hover:bg-[#252525] transition-colors text-left"
                  >
                    <h3 className="text-lg font-medium mb-2 truncate">{project.name}</h3>
                    <div className="text-sm text-[#999999] mb-4">
                      {project.tempo} BPM - {project.timeSignature}
                    </div>
                    <div className="mt-auto text-xs text-[#777777]">
                      Last edited {formatDistanceToNow(new Date(project.updatedAt))} ago
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-[#333333] text-center text-sm text-[#777777]">
        <p>Fathom Studio v1.0.0 - Modern AI-Powered Digital Audio Workstation</p>
      </footer>

      {/* New Project Modal */}
      {isCreatingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1A1A] rounded-lg w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-6">Create New Project</h2>
            
            <form onSubmit={handleCreateProject}>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My Awesome Track"
                  className="w-full p-3 bg-[#252525] border border-[#333333] rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A00]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Tempo (BPM)</label>
                  <select className="w-full p-3 bg-[#252525] border border-[#333333] rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A00]">
                    <option value="120">120</option>
                    <option value="140">140</option>
                    <option value="90">90</option>
                    <option value="100">100</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Time Signature</label>
                  <select className="w-full p-3 bg-[#252525] border border-[#333333] rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A00]">
                    <option value="4/4">4/4</option>
                    <option value="3/4">3/4</option>
                    <option value="6/8">6/8</option>
                    <option value="5/4">5/4</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setIsCreatingProject(false)}
                  className="px-4 py-2 rounded-md hover:bg-[#252525]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-[#FF7A00] hover:bg-[#CC6200] font-medium"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}