import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { 
  FolderOpen, 
  PlusCircle, 
  FileText, 
  LayoutTemplate, 
  Clock, 
  Settings, 
  HelpCircle,
  Github,
  Play,
  Trash2,
  Copy,
  ExternalLink,
  Star,
  Music2,
  Volume2,
  Network,
  Mic,
  Wand2,
  Brain,
  Waves,
  MoreVertical,
  X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { audioStore } from '@/lib/audio-store';
import { audioEngine } from '@/lib/audio-engine';

export default function StartPage() {
  // State
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectTempo, setNewProjectTempo] = useState<number>(120);
  const [newProjectTimeSignature, setNewProjectTimeSignature] = useState<string>('4/4');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [selectedProjectCard, setSelectedProjectCard] = useState<number | null>(null);
  
  // References
  const newProjectNameRef = useRef<HTMLInputElement>(null);
  
  // Hooks
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Get recent projects
  const { data: recentProjects, isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: true,
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: Partial<Project>) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create project');
      }
      
      return await response.json() as Project;
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: 'Project Created',
        description: `${newProject.name} has been created successfully`,
      });
      setLocation(`/project/${newProject.id}`);
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsCreatingProject(false);
    }
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete project');
      }
      
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: 'Project Deleted',
        description: `Project has been deleted successfully`,
      });
    },
    onError: (error) => {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete project. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setProjectToDelete(null);
    }
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
      
      // Focus on the project name input
      if (newProjectNameRef.current) {
        newProjectNameRef.current.focus();
      }
      
      return;
    }
    
    // Create project with the mutation
    createProjectMutation.mutate({
      name: newProjectName.trim(),
      tempo: newProjectTempo,
      timeSignature: newProjectTimeSignature,
      sampleRate: 44100,
    });
  };

  // Open a project
  const handleOpenProject = (projectId: number) => {
    // Clear any selected project card first
    setSelectedProjectCard(null);
    
    // Initialize the audio engine if needed
    if (!audioEngine.isEngineInitialized()) {
      audioEngine.initialize().catch(error => {
        console.error('Failed to initialize audio engine:', error);
      });
    }
    
    // Navigate to the project
    setLocation(`/project/${projectId}`);
  };

  // Delete a project
  const handleDeleteProject = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation(); // Prevent opening the project
    setProjectToDelete(project);
  };
  
  // Duplicate a project
  const handleDuplicateProject = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation(); // Prevent opening the project
    
    setNewProjectName(`${project.name} - Copy`);
    
    // Handle tempo and time signature safely
    const projectTempo = project.tempo || 120;
    const projectTimeSignature = project.timeSignature || '4/4';
    
    setNewProjectTempo(projectTempo);
    setNewProjectTimeSignature(projectTimeSignature);
    setIsCreatingProject(true);
    
    toast({
      title: 'Duplicating Project',
      description: `Creating a copy of "${project.name}"`,
    });
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
  
  // Show project actions
  const handleProjectCardClick = (e: React.MouseEvent, projectId: number) => {
    e.stopPropagation(); // Prevent opening the project
    
    // Toggle selection
    if (selectedProjectCard === projectId) {
      setSelectedProjectCard(null);
    } else {
      setSelectedProjectCard(projectId);
    }
  };
  
  // Get template types
  const getTemplateTypes = () => {
    return [
      { name: 'EDM Production', icon: <Music2 className="w-5 h-5" />, color: '#5D87FF' },
      { name: 'Beat Making', icon: <Volume2 className="w-5 h-5" />, color: '#9747FF' },
      { name: 'Live Recording', icon: <Mic className="w-5 h-5" />, color: '#FF7A00' },
      { name: 'Collaborative', icon: <Network className="w-5 h-5" />, color: '#00CC88' },
      { name: 'AI Assisted', icon: <Brain className="w-5 h-5" />, color: '#FF4F7A' },
      { name: 'Sample Based', icon: <Wand2 className="w-5 h-5" />, color: '#FFCB47' },
    ];
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#121212] text-white">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-[#333333]">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-[#FF7A00] to-[#CC6200] flex items-center justify-center mr-3 shadow-lg">
            <Waves className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Fathom Studio</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-[#252525] rounded-full transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsAboutOpen(true)}
            className="p-2 hover:bg-[#252525] rounded-full transition-colors"
          >
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
                onClick={() => {
                  setNewProjectName('');
                  setNewProjectTempo(120);
                  setNewProjectTimeSignature('4/4');
                  setIsCreatingProject(true);
                }}
                className="w-full flex items-center p-4 rounded-lg bg-[#1A1A1A] hover:bg-[#252525] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#FF7A00] flex items-center justify-center mr-4 shadow-md">
                  <PlusCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <span className="font-medium">New Project</span>
                  <p className="text-xs text-[#999999] mt-1">Create a blank project from scratch</p>
                </div>
              </button>
              
              <button 
                onClick={handleOpenFromFiles}
                className="w-full flex items-center p-4 rounded-lg bg-[#1A1A1A] hover:bg-[#252525] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#333333] flex items-center justify-center mr-4 shadow-md">
                  <FolderOpen className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <span className="font-medium">Open Project</span>
                  <p className="text-xs text-[#999999] mt-1">Browse and open existing projects</p>
                </div>
              </button>
              
              <button 
                onClick={handleOpenTemplates}
                className="w-full flex items-center p-4 rounded-lg bg-[#1A1A1A] hover:bg-[#252525] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#333333] flex items-center justify-center mr-4 shadow-md">
                  <LayoutTemplate className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <span className="font-medium">Project Templates</span>
                  <p className="text-xs text-[#999999] mt-1">Start with pre-configured templates</p>
                </div>
              </button>
            </div>
            
            <div className="mt-10">
              <h2 className="text-xl font-semibold mb-6">Learn</h2>
              <div className="space-y-4">
                <a 
                  href="#tutorials"
                  className="w-full flex items-center p-4 rounded-lg bg-[#1A1A1A] hover:bg-[#252525] transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#5D87FF] flex items-center justify-center mr-4 shadow-md">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">Tutorials</span>
                    <p className="text-xs text-[#999999] mt-1">Learn how to use Fathom Studio effectively</p>
                  </div>
                </a>
                
                <a 
                  href="https://github.com/fathom-studio/docs" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center p-4 rounded-lg bg-[#1A1A1A] hover:bg-[#252525] transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#9747FF] flex items-center justify-center mr-4 shadow-md">
                    <Github className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">Documentation</span>
                    <p className="text-xs text-[#999999] mt-1">Explore the detailed documentation</p>
                  </div>
                </a>
              </div>
            </div>
            
            {/* Template Categories */}
            <div className="mt-10">
              <h2 className="text-xl font-semibold mb-6">Template Categories</h2>
              <div className="grid grid-cols-2 gap-3">
                {getTemplateTypes().map((template, index) => (
                  <button 
                    key={index}
                    onClick={() => {
                      toast({
                        title: `${template.name} Templates`,
                        description: 'This template category will be available soon',
                      });
                    }}
                    className="flex flex-col items-center p-4 rounded-lg bg-[#1A1A1A] hover:bg-[#252525] transition-colors"
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                      style={{ backgroundColor: template.color }}
                    >
                      {template.icon}
                    </div>
                    <span className="text-sm text-center">{template.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right Column - Recent Projects */}
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Recent Projects</h2>
              {recentProjects && recentProjects.length > 0 && (
                <button
                  onClick={() => {
                    setNewProjectName('');
                    setNewProjectTempo(120);
                    setNewProjectTimeSignature('4/4');
                    setIsCreatingProject(true);
                  }}
                  className="flex items-center px-3 py-1.5 bg-[#FF7A00] hover:bg-[#CC6200] rounded-md transition-colors text-sm"
                >
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  New Project
                </button>
              )}
            </div>
            
            {isLoadingProjects ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-36 rounded-lg bg-[#1A1A1A]"></div>
                ))}
              </div>
            ) : !recentProjects || recentProjects.length === 0 ? (
              <div className="text-center py-16 bg-[#1A1A1A] rounded-lg">
                <Clock className="w-16 h-16 mx-auto text-[#444444] mb-4" />
                <h3 className="text-xl font-medium text-[#999999] mb-2">No Recent Projects</h3>
                <p className="text-[#777777] mb-6">
                  Create a new project to get started with Fathom Studio
                </p>
                <button
                  onClick={() => {
                    setNewProjectName('');
                    setNewProjectTempo(120);
                    setNewProjectTimeSignature('4/4');
                    setIsCreatingProject(true);
                  }}
                  className="px-4 py-2 bg-[#FF7A00] hover:bg-[#CC6200] rounded-md transition-colors inline-flex items-center"
                >
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  Create New Project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => handleOpenProject(project.id)}
                    className={`relative flex flex-col p-5 rounded-lg ${
                      selectedProjectCard === project.id 
                        ? 'bg-[#252525] ring-1 ring-[#FF7A00]' 
                        : 'bg-[#1A1A1A] hover:bg-[#252525]'
                    } transition-colors text-left cursor-pointer group`}
                  >
                    {/* Project type icon */}
                    <div className="absolute top-3 right-3 flex space-x-2">
                      <button 
                        onClick={(e) => handleProjectCardClick(e, project.id)}
                        className="p-1.5 rounded-full hover:bg-[#333333] transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-[#999999]" />
                      </button>
                    </div>
                    
                    {/* Quick actions dropdown */}
                    {selectedProjectCard === project.id && (
                      <div className="absolute top-10 right-3 w-40 bg-[#1A1A1A] border border-[#333333] rounded-md shadow-lg z-10 py-1">
                        <button 
                          onClick={(e) => handleDuplicateProject(e, project)}
                          className="w-full flex items-center p-2 hover:bg-[#252525] text-sm text-left"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            // Placeholder for export function
                            toast({
                              title: 'Export Feature',
                              description: 'Export functionality coming soon',
                            });
                          }}
                          className="w-full flex items-center p-2 hover:bg-[#252525] text-sm text-left"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Export
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            // Placeholder for favorite function
                            toast({
                              title: 'Favorite Feature',
                              description: 'Project favorites coming soon',
                            });
                          }}
                          className="w-full flex items-center p-2 hover:bg-[#252525] text-sm text-left"
                        >
                          <Star className="w-4 h-4 mr-2" />
                          Favorite
                        </button>
                        <div className="border-t border-[#333333] my-1"></div>
                        <button 
                          onClick={(e) => handleDeleteProject(e, project)}
                          className="w-full flex items-center p-2 hover:bg-[#252525] text-sm text-left text-red-500"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </button>
                      </div>
                    )}
                    
                    {/* Project info */}
                    <div 
                      className="w-8 h-8 rounded-md flex items-center justify-center mb-3 shadow-sm"
                      style={{ backgroundColor: project.id % 2 === 0 ? '#5D87FF' : '#FF7A00' }}
                    >
                      <Music2 className="w-4 h-4 text-white" />
                    </div>
                    
                    <h3 className="text-lg font-medium mb-1 truncate">{project.name}</h3>
                    
                    <div className="mt-2 text-sm text-[#999999] flex items-center mb-4">
                      <div className="flex items-center">
                        <Volume2 className="w-3.5 h-3.5 mr-1 text-[#777777]" />
                        <span>{project.tempo} BPM</span>
                      </div>
                      <span className="mx-2">•</span>
                      <div>{project.timeSignature}</div>
                    </div>
                    
                    {/* Quick play button */}
                    <div className="mt-auto flex justify-between items-center">
                      <div className="text-xs text-[#777777]">
                        Last edited {formatDistanceToNow(new Date(project.updatedAt))} ago
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // In a real app, this would play a preview
                          toast({
                            title: 'Preview Feature',
                            description: 'Project preview coming soon',
                          });
                        }}
                        className="p-1.5 bg-[#252525] hover:bg-[#333333] transition-colors rounded-full opacity-0 group-hover:opacity-100"
                      >
                        <Play className="w-3.5 h-3.5 text-[#FF7A00]" />
                      </button>
                    </div>
                  </div>
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
          <div 
            className="bg-[#1A1A1A] rounded-lg w-full max-w-md p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-6">Create New Project</h2>
            
            <form onSubmit={handleCreateProject}>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Project Name</label>
                <input
                  ref={newProjectNameRef}
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
                  <select 
                    value={newProjectTempo}
                    onChange={(e) => setNewProjectTempo(Number(e.target.value))}
                    className="w-full p-3 bg-[#252525] border border-[#333333] rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A00]"
                  >
                    <option value="80">80</option>
                    <option value="90">90</option>
                    <option value="100">100</option>
                    <option value="110">110</option>
                    <option value="120">120</option>
                    <option value="128">128</option>
                    <option value="140">140</option>
                    <option value="150">150</option>
                    <option value="160">160</option>
                    <option value="170">170</option>
                    <option value="180">180</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Time Signature</label>
                  <select 
                    value={newProjectTimeSignature}
                    onChange={(e) => setNewProjectTimeSignature(e.target.value)}
                    className="w-full p-3 bg-[#252525] border border-[#333333] rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A00]"
                  >
                    <option value="4/4">4/4</option>
                    <option value="3/4">3/4</option>
                    <option value="2/4">2/4</option>
                    <option value="6/8">6/8</option>
                    <option value="9/8">9/8</option>
                    <option value="5/4">5/4</option>
                    <option value="7/8">7/8</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setIsCreatingProject(false)}
                  className="px-4 py-2 rounded-md hover:bg-[#252525] transition-colors"
                  disabled={createProjectMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-[#FF7A00] hover:bg-[#CC6200] font-medium transition-colors flex items-center"
                  disabled={createProjectMutation.isPending || !newProjectName.trim()}
                >
                  {createProjectMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Project Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div 
            className="bg-[#1A1A1A] rounded-lg w-full max-w-md p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">Delete Project</h2>
            <p className="mb-6">
              Are you sure you want to delete "{projectToDelete.name}"? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 rounded-md hover:bg-[#252525] transition-colors"
                disabled={deleteProjectMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteProjectMutation.mutate(projectToDelete.id)}
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 font-medium transition-colors flex items-center"
                disabled={deleteProjectMutation.isPending}
              >
                {deleteProjectMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div 
            className="bg-[#1A1A1A] rounded-lg w-full max-w-md p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Settings</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 hover:bg-[#252525] rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Placeholder settings UI */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Audio Settings</h3>
                <div className="bg-[#252525] p-3 rounded-md">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm">Sample Rate</span>
                    <select className="bg-[#333333] border border-[#444444] rounded p-1 text-sm">
                      <option>44.1 kHz</option>
                      <option>48 kHz</option>
                      <option>96 kHz</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Buffer Size</span>
                    <select className="bg-[#333333] border border-[#444444] rounded p-1 text-sm">
                      <option>256</option>
                      <option>512</option>
                      <option>1024</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Theme Settings</h3>
                <div className="grid grid-cols-4 gap-2">
                  <button className="w-full h-10 bg-[#FF7A00] rounded-md"></button>
                  <button className="w-full h-10 bg-[#5D87FF] rounded-md"></button>
                  <button className="w-full h-10 bg-[#9747FF] rounded-md"></button>
                  <button className="w-full h-10 bg-[#00CC88] rounded-md"></button>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">AI Settings</h3>
                <div className="bg-[#252525] p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Enable AI Features</span>
                    <div className="relative inline-block w-10 align-middle">
                      <input 
                        type="checkbox" 
                        id="toggle" 
                        className="opacity-0 w-0 h-0"
                        defaultChecked={true} 
                      />
                      <label 
                        htmlFor="toggle" 
                        className="block overflow-hidden h-6 rounded-full bg-[#333333] cursor-pointer"
                      >
                        <span className="block h-6 w-6 rounded-full bg-[#FF7A00] transform translate-x-0 transition-transform duration-200"></span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 bg-[#252525] hover:bg-[#333333] rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* About Modal */}
      {isAboutOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div 
            className="bg-[#1A1A1A] rounded-lg w-full max-w-md p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">About Fathom Studio</h2>
              <button
                onClick={() => setIsAboutOpen(false)}
                className="p-1.5 hover:bg-[#252525] rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-md bg-gradient-to-br from-[#FF7A00] to-[#CC6200] flex items-center justify-center shadow-lg">
                <Waves className="w-10 h-10 text-white" />
              </div>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold">Fathom Studio</h3>
              <p className="text-sm text-[#999999]">Version 1.0.0</p>
              <p className="mt-4 text-sm">
                A modern, AI-powered Digital Audio Workstation with a sleek dark interface, featuring multitrack recording, 
                visual editing tools, and natural language commands.
              </p>
            </div>
            
            <div className="bg-[#252525] p-4 rounded-md mb-6">
              <h4 className="font-medium mb-2">Key Features</h4>
              <ul className="text-sm space-y-2 text-[#CCCCCC]">
                <li className="flex items-start">
                  <div className="w-5 h-5 rounded-full bg-[#FF7A00] flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                    <span className="text-xs">1</span>
                  </div>
                  <span>Natural Language Production</span>
                </li>
                <li className="flex items-start">
                  <div className="w-5 h-5 rounded-full bg-[#FF7A00] flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                    <span className="text-xs">2</span>
                  </div>
                  <span>Autonomous Mix Bots</span>
                </li>
                <li className="flex items-start">
                  <div className="w-5 h-5 rounded-full bg-[#FF7A00] flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                    <span className="text-xs">3</span>
                  </div>
                  <span>Visual Track Surfing</span>
                </li>
                <li className="flex items-start">
                  <div className="w-5 h-5 rounded-full bg-[#FF7A00] flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                    <span className="text-xs">4</span>
                  </div>
                  <span>Zero-Config Collaboration</span>
                </li>
              </ul>
            </div>
            
            <div className="text-center">
              <button
                onClick={() => setIsAboutOpen(false)}
                className="px-4 py-2 bg-[#252525] hover:bg-[#333333] rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Click away handler for project card dropdown */}
      {selectedProjectCard !== null && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setSelectedProjectCard(null)}
        />
      )}
    </div>
  );
}