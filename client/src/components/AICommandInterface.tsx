import { useState } from 'react';
import { Bot, Sparkles, MessageSquareMore, X, ChevronUp, ChevronDown, Brain, List } from 'lucide-react';
import { AISuggestion } from '@shared/schema';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface AICommandInterfaceProps {
  onProcessCommand: (command: string) => Promise<any>;
  isConnected: boolean;
  projectId?: number;
}

// Example command categories for the unified assistant
interface CommandCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  exampleCommands: string[];
}

export default function AICommandInterface({ 
  onProcessCommand,
  isConnected,
  projectId
}: AICommandInterfaceProps) {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExamplesOpen, setIsExamplesOpen] = useState(false);
  const [isSuggestionsPanelOpen, setIsSuggestionsPanelOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('mixing');
  const queryClient = useQueryClient();
  
  // Fetch AI suggestions for the current project
  const { data: suggestions = [], isLoading: isLoadingSuggestions } = useQuery<AISuggestion[]>({
    queryKey: ['/api/projects', projectId, 'ai-suggestions'],
    enabled: !!projectId,
  });

  // Command categories with examples
  const commandCategories: CommandCategory[] = [
    {
      id: 'mixing',
      name: 'Mixing & Effects',
      icon: <Bot className="w-4 h-4" />,
      exampleCommands: [
        'How should I EQ this vocal?',
        'Add compression to the drums',
        'Suggest reverb settings for the synth',
        'How to make my drums punchier?'
      ]
    },
    {
      id: 'creative',
      name: 'Creative Ideas',
      icon: <Sparkles className="w-4 h-4" />,
      exampleCommands: [
        'Give me melodic ideas for a chorus',
        'Suggest chord progressions in A minor',
        'What instruments would work for an ambient track?',
        'Create a beat structure for trap music'
      ]
    },
    {
      id: 'technical',
      name: 'Technical Help',
      icon: <Brain className="w-4 h-4" />,
      exampleCommands: [
        'How do I create side-chain compression?',
        'What is the difference between reverb and delay?',
        'Explain how to use parallel processing',
        'How to fix phase cancellation issues'
      ]
    }
  ];
  
  // Get active category
  const currentCategory = commandCategories.find(cat => cat.id === activeCategory) || commandCategories[0];
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!command.trim() || !projectId) return;
    
    setIsProcessing(true);
    try {
      await onProcessCommand(command);
      setCommand('');
      // Close any open panels after submitting a command
      setIsExamplesOpen(false);
      
      // Invalidate suggestions query to refresh the list
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'ai-suggestions'] });
      }, 1000);
    } catch (error) {
      console.error('Error processing command:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCommand(e.target.value);
  };
  
  const handleUseExample = (example: string) => {
    setCommand(example);
    // Focus the input after selecting an example
    const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (inputElement) {
      inputElement.focus();
    }
  };
  
  // Get the most recent suggestions
  const recentSuggestions = suggestions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
  
  return (
    <div className="p-3 border-t border-[#333333] relative">
      {/* Example Commands Panel */}
      {isExamplesOpen && (
        <div className="absolute bottom-full left-0 w-full p-4 bg-[#191919] border border-[#333333] rounded-t-lg shadow-lg z-10">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium">What can Fathom AI help you with?</h3>
            <button 
              onClick={() => setIsExamplesOpen(false)}
              className="p-1 hover:bg-[#333333] rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
            {commandCategories.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-3 py-1.5 rounded-full text-xs flex items-center whitespace-nowrap ${
                  activeCategory === category.id 
                    ? 'bg-[#FF7A00] text-white' 
                    : 'bg-[#252525] text-[#999999] hover:bg-[#333333] hover:text-white'
                }`}
              >
                {category.icon}
                <span className="ml-1.5">{category.name}</span>
              </button>
            ))}
          </div>
          
          <div className="space-y-2">
            {currentCategory.exampleCommands.map((example, i) => (
              <button
                key={i}
                onClick={() => handleUseExample(example)}
                className="w-full text-left text-xs bg-[#252525] hover:bg-[#333333] p-2 rounded transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
          
          <div className="mt-4 pt-3 border-t border-[#333333] text-xs text-[#999999]">
            <p>Fathom AI can help with mixing, creative ideas, technical questions, and more. Just ask in natural language!</p>
          </div>
        </div>
      )}
      
      {/* AI Suggestions History Panel */}
      {isSuggestionsPanelOpen && (
        <div className="absolute bottom-full left-0 w-full max-h-[50vh] overflow-y-auto p-4 bg-[#191919] border border-[#333333] rounded-t-lg shadow-lg z-10">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium">Recent AI Suggestions</h3>
            <button 
              onClick={() => setIsSuggestionsPanelOpen(false)}
              className="p-1 hover:bg-[#333333] rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {isLoadingSuggestions ? (
            <div className="py-8 text-center text-[#999999]">
              <div className="w-8 h-8 border-2 border-[#FF7A00] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              Loading suggestions...
            </div>
          ) : recentSuggestions.length > 0 ? (
            <div className="space-y-4 divide-y divide-[#333333]">
              {recentSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="pt-3 first:pt-0">
                  <div className="bg-[#1A1A1A] p-3 rounded-lg">
                    <p className="text-xs whitespace-pre-line">{suggestion.suggestion}</p>
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-[10px] text-[#777777]">
                        {new Date(suggestion.createdAt).toLocaleString()}
                      </div>
                      {suggestion.trackId && (
                        <div className="text-[10px] text-[#FF7A00]">
                          Track specific
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-[#999999]">
              No suggestions yet. Try asking Fathom AI for help!
            </div>
          )}
        </div>
      )}
      
      {/* Command Input Form */}
      <form onSubmit={handleSubmit}>
        <div className={`relative rounded-3xl transition-all duration-300 p-2 flex items-center ${isProcessing ? 'bg-gradient-to-b from-[#333333] to-[#252525]' : 'bg-gradient-to-b from-[#252525] to-[#1A1A1A]'} border border-[#333333]`}>
          <div 
            className="w-8 h-8 bg-gradient-to-br from-[#FF7A00] to-[#CC6200] rounded-full flex items-center justify-center text-white font-bold shadow-md mr-2 flex-shrink-0 cursor-pointer"
            onClick={() => setIsExamplesOpen(!isExamplesOpen)}
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Bot className="w-4 h-4" />
            )}
          </div>
          <input 
            type="text" 
            value={command}
            onChange={handleInputChange}
            placeholder={isProcessing ? "Processing..." : `Ask Fathom AI for music production help...`}
            className="w-full bg-transparent border-none focus:outline-none text-sm"
            disabled={isProcessing || !isConnected || !projectId}
          />
          {command && (
            <button
              type="submit" 
              className="ml-2 px-3 py-1 bg-[#FF7A00] hover:bg-[#CC6200] text-white text-xs font-medium rounded-full transition-colors"
              disabled={isProcessing || !isConnected || !projectId}
            >
              Send
            </button>
          )}
        </div>
      </form>
      
      {/* Bottom Controls */}
      <div className="mt-3 flex justify-between">
        <div className="text-xs text-[#999999] flex items-center">
          <span className={`inline-block w-2 h-2 rounded-full mr-1 ${isConnected && projectId ? 'bg-green-500' : 'bg-red-500'}`}></span>
          Fathom AI
          {!isConnected && " (Offline)"}
          {!projectId && " (No project)"}
        </div>
        <div className="flex gap-3">
          <button 
            className="text-xs text-[#999999] hover:text-white flex items-center"
            onClick={() => setIsExamplesOpen(!isExamplesOpen)}
          >
            {isExamplesOpen ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronUp className="w-3 h-3 mr-1" />}
            Examples
          </button>
          <button 
            className="text-xs text-[#FF7A00] hover:text-[#CC6200] flex items-center"
            onClick={() => setIsSuggestionsPanelOpen(!isSuggestionsPanelOpen)}
          >
            <List className="w-3 h-3 mr-1" />
            History
          </button>
        </div>
      </div>
    </div>
  );
}
