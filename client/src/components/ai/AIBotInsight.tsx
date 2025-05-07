import { useState } from 'react';
import { AISuggestion } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AIBotInsightProps {
  suggestion: AISuggestion;
  trackName: string;
}

export default function AIBotInsight({ suggestion, trackName }: AIBotInsightProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [isIgnoring, setIsIgnoring] = useState(false);
  const { toast } = useToast();
  
  // Format timestamp to relative time (e.g. "2 minutes ago")
  const getRelativeTime = () => {
    const now = new Date();
    const createdAt = new Date(suggestion.createdAt);
    const diffInSeconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };
  
  // Get icon character based on bot type
  const getBotIcon = () => {
    switch (suggestion.botType) {
      case 'MixBot':
        return 'M';
      case 'ReverbBot':
        return 'R';
      case 'CommandBot':
        return 'C';
      case 'MasterBot':
        return 'Ma';
      default:
        return 'AI';
    }
  };
  
  // Apply the AI suggestion
  const handleApply = async () => {
    setIsApplying(true);
    
    try {
      // Update the suggestion as applied
      await apiRequest('PUT', `/api/ai-suggestions/${suggestion.id}`, {
        isApplied: true
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/projects', suggestion.projectId, 'ai-suggestions'] });
      
      toast({
        title: 'Suggestion Applied',
        description: `The ${suggestion.botType} suggestion has been applied.`,
        duration: 3000,
      });
      
    } catch (error) {
      console.error('Error applying suggestion:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply suggestion',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsApplying(false);
    }
  };
  
  // Ignore the AI suggestion
  const handleIgnore = async () => {
    setIsIgnoring(true);
    
    try {
      // Delete the suggestion
      await apiRequest('DELETE', `/api/ai-suggestions/${suggestion.id}`, undefined);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/projects', suggestion.projectId, 'ai-suggestions'] });
      
      toast({
        title: 'Suggestion Ignored',
        description: 'The suggestion has been removed.',
        duration: 2000,
      });
      
    } catch (error) {
      console.error('Error ignoring suggestion:', error);
      setIsIgnoring(false);
      
      toast({
        title: 'Error',
        description: 'Failed to ignore suggestion',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  return (
    <div className="bg-fathom-gray bg-opacity-20 rounded-lg p-3 border border-fathom-lightgray">
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 bot-icon mr-2 flex-shrink-0">
          <span>{getBotIcon()}</span>
        </div>
        <div>
          <h3 className="text-sm font-medium">{suggestion.botType} Suggestion</h3>
          <p className="text-xs text-fathom-text-secondary">{getRelativeTime()}</p>
        </div>
      </div>
      
      <p className="text-sm mb-3 break-words">
        {trackName && suggestion.trackId && `"${suggestion.suggestion}" for ${trackName}`}
        {!suggestion.trackId && `"${suggestion.suggestion}"`}
      </p>
      
      <div className="flex justify-end space-x-2">
        <button 
          className="px-3 py-1 bg-fathom-gray text-xs rounded hover:bg-fathom-lightgray disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleIgnore}
          disabled={isIgnoring || isApplying}
        >
          {isIgnoring ? 'Ignoring...' : 'Ignore'}
        </button>
        <button 
          className="px-3 py-1 bg-fathom-orange text-xs rounded hover:bg-fathom-orange-dark disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleApply}
          disabled={isApplying || isIgnoring || suggestion.isApplied}
        >
          {isApplying ? 'Applying...' : suggestion.isApplied ? 'Applied' : 'Apply Fix'}
        </button>
      </div>
    </div>
  );
}
