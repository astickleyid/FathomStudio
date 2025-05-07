import React, { useState } from 'react';
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { 
  Maximize2Icon, 
  Minimize2Icon, 
  XIcon, 
  MoveIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PanelTopIcon
} from 'lucide-react';

interface PanelProps {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultSize?: number;
  minSize?: number;
  isVisible?: boolean;
  toggleVisibility?: (id: string) => void;
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export const ModulePanel = ({
  id,
  title,
  children,
  defaultSize = 20,
  minSize = 10,
  isVisible = true,
  toggleVisibility,
  direction = 'horizontal',
  className
}: PanelProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isVisible) return null;

  const handleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    setIsMaximized(false);
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
    setIsCollapsed(false);
  };

  const handleClose = () => {
    if (toggleVisibility) {
      toggleVisibility(id);
    }
  };

  return (
    <div 
      className={cn(
        "flex flex-col overflow-hidden border border-[#333333] rounded-md bg-[#1A1A1A]",
        isMaximized ? "fixed inset-4 z-50" : "",
        className
      )}
    >
      {/* Header with controls */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#252525] border-b border-[#333333]">
        <div className="flex items-center gap-2">
          <MoveIcon size={14} className="cursor-move text-gray-400" />
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={handleCollapse} 
                  className="p-1 hover:bg-[#333333] rounded"
                >
                  {isCollapsed ? 
                    (direction === 'horizontal' ? <ChevronRightIcon size={14} /> : <ChevronLeftIcon size={14} />) : 
                    (direction === 'horizontal' ? <ChevronLeftIcon size={14} /> : <ChevronRightIcon size={14} />)
                  }
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isCollapsed ? 'Expand' : 'Collapse'}</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={handleMaximize} 
                  className="p-1 hover:bg-[#333333] rounded"
                >
                  {isMaximized ? <Minimize2Icon size={14} /> : <Maximize2Icon size={14} />}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isMaximized ? 'Restore' : 'Maximize'}</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={handleClose} 
                  className="p-1 hover:bg-[#333333] rounded text-red-500"
                >
                  <XIcon size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Close</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Content */}
      <div className={cn(
        "flex-1 overflow-auto", 
        isCollapsed ? "hidden" : ""
      )}>
        {children}
      </div>
    </div>
  );
};

interface ResizableLayoutProps {
  children: React.ReactNode;
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export const ResizableLayout = ({ 
  children, 
  direction = 'horizontal',
  className
}: ResizableLayoutProps) => {
  // Convert children to array for processing
  const childrenArray = React.Children.toArray(children).filter(
    child => React.isValidElement(child)
  ) as React.ReactElement[];
  
  return (
    <ResizablePanelGroup 
      direction={direction} 
      className={cn("h-full", className)}
    >
      {childrenArray.map((child, index) => {
        const isLastChild = index === childrenArray.length - 1;
        
        // Calculate default size evenly if not specified
        const defaultSize = child.props.defaultSize || 100 / childrenArray.length;
        const minSize = child.props.minSize || 10;
        
        return (
          <React.Fragment key={child.props.id || index}>
            <ResizablePanel 
              defaultSize={defaultSize}
              minSize={minSize}
              className="overflow-hidden"
            >
              {child}
            </ResizablePanel>
            
            {!isLastChild && <ResizableHandle withHandle />}
          </React.Fragment>
        );
      })}
    </ResizablePanelGroup>
  );
};

// Context for managing panel visibility
interface PanelVisibilityContextType {
  visiblePanels: Record<string, boolean>;
  togglePanelVisibility: (id: string) => void;
}

export const PanelVisibilityContext = React.createContext<PanelVisibilityContextType>({
  visiblePanels: {
    tracks: true,
    mixer: true,
    browser: true,
    ai: true,
    transport: true,
    timeline: true,
  },
  togglePanelVisibility: () => {},
});

export const PanelVisibilityProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [visiblePanels, setVisiblePanels] = useState<Record<string, boolean>>({
    tracks: true,
    mixer: true,
    browser: true,
    ai: true,
    transport: true,
    timeline: true,
  });

  const togglePanelVisibility = (id: string) => {
    setVisiblePanels(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <PanelVisibilityContext.Provider value={{ visiblePanels, togglePanelVisibility }}>
      {children}
    </PanelVisibilityContext.Provider>
  );
};

// Hook to use panel visibility
export const usePanelVisibility = () => {
  const context = React.useContext(PanelVisibilityContext);
  if (!context) {
    throw new Error('usePanelVisibility must be used within a PanelVisibilityProvider');
  }
  return context;
};