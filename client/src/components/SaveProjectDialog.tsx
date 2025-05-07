import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, FolderOpen, FileDown, FileUp, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Project } from '@shared/schema';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface SaveProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  action: 'save' | 'save-as' | 'open' | 'new';
}

export default function SaveProjectDialog({ open, onOpenChange, project, action }: SaveProjectDialogProps) {
  const [projectName, setProjectName] = useState(project?.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const { toast } = useToast();

  // Set project name when project changes or dialog opens
  useEffect(() => {
    if (project && (action === 'save' || action === 'save-as')) {
      setProjectName(project.name || '');
    } else if (action === 'new') {
      setProjectName('');
    }
    // Only run this when open or project/action actually changes
  }, [open, project?.id, action]);

  // Fetch projects for "open" dialog
  useEffect(() => {
    if (action === 'open') {
      const fetchProjects = async () => {
        try {
          const response = await fetch('/api/projects');
          if (!response.ok) throw new Error('Failed to fetch projects');
          const data: Project[] = await response.json();
          setProjects(data);
        } catch (error) {
          console.error('Error fetching projects:', error);
          toast({
            title: 'Error',
            description: 'Failed to load projects',
            variant: 'destructive',
          });
        }
      };
      fetchProjects();
    }
  }, [action, toast]);

  // Get dialog title based on action
  const getDialogTitle = () => {
    switch (action) {
      case 'save': return 'Save Project';
      case 'save-as': return 'Save Project As';
      case 'open': return 'Open Project';
      case 'new': return 'New Project';
      default: return 'Project';
    }
  };

  // Handle saving the project
  const handleSave = async () => {
    if (!projectName || !projectName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a project name',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      if (action === 'save' && project) {
        // Update existing project
        const updatedProject = await apiRequest<Project>(`/api/projects/${project.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: projectName }),
        });

        queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id] });
        
        toast({
          title: 'Success',
          description: `Project "${updatedProject.name}" saved successfully`,
        });
      } else if (action === 'save-as' || action === 'new') {
        // Create new project
        const newProject = await apiRequest<Project>('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName,
            tempo: 120,
            timeSignature: '4/4',
            sampleRate: 44100,
          }),
        });

        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
        
        toast({
          title: 'Success',
          description: `Project "${newProject.name}" created successfully`,
        });

        // Redirect to the new project page
        window.location.href = `/project/${newProject.id}`;
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: 'Error',
        description: 'Failed to save project',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  // Handle opening a project
  const handleOpen = () => {
    if (!selectedProjectId) {
      toast({
        title: 'Error',
        description: 'Please select a project to open',
        variant: 'destructive',
      });
      return;
    }

    // Redirect to the selected project
    window.location.href = `/project/${selectedProjectId}`;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#1A1A1A] border-[#333333]">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            {action === 'save' || action === 'save-as' 
              ? 'Enter a name for your project.' 
              : action === 'open' 
                ? 'Select a project to open.' 
                : 'Create a new project.'}
          </DialogDescription>
        </DialogHeader>

        {(action === 'save' || action === 'save-as' || action === 'new') && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project-name" className="text-right">
                Name
              </Label>
              <Input
                id="project-name"
                placeholder="My Awesome Project"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="col-span-3 bg-[#252525] border-[#333333] focus:border-[#FF7A00]"
              />
            </div>
          </div>
        )}

        {action === 'open' && (
          <div className="py-4">
            <div className="mb-4">
              <Label className="mb-2 block">Select a project</Label>
              <div className="max-h-60 overflow-y-auto bg-[#252525] rounded-md border border-[#333333]">
                {projects.length === 0 ? (
                  <div className="p-4 text-center text-[#999999]">
                    No projects found
                  </div>
                ) : (
                  <div className="divide-y divide-[#333333]">
                    {projects.map((p) => (
                      <div
                        key={p.id}
                        className={`
                          p-3 cursor-pointer hover:bg-[#333333] transition-colors
                          ${selectedProjectId === p.id ? 'bg-[#333333]' : ''}
                        `}
                        onClick={() => setSelectedProjectId(p.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{p.name}</h3>
                            <p className="text-xs text-[#999999]">
                              Last edited: {new Date(p.updatedAt).toLocaleString()}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `/project/${p.id}`;
                            }}
                          >
                            <FolderOpen className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="bg-[#252525] hover:bg-[#333333] text-white border-[#333333]"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          {(action === 'save' || action === 'save-as' || action === 'new') && (
            <Button 
              onClick={handleSave} 
              disabled={isLoading || !projectName || !projectName.trim()}
              className="bg-[#FF7A00] hover:bg-[#CC6200] text-white"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {action === 'new' ? 'Create' : 'Save'}
            </Button>
          )}
          {action === 'open' && (
            <Button 
              onClick={handleOpen} 
              disabled={!selectedProjectId}
              className="bg-[#FF7A00] hover:bg-[#CC6200] text-white"
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              Open
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}