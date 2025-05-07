import { useState, useEffect } from 'react';
import { Bot, MusicIcon, Wand2, MessageSquareMore, X, ChevronUp, ChevronDown } from 'lucide-react';
import { AISuggestion } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';

interface AICommandInterfaceProps {
  onProcessCommand: (command: string) => Promise<any>;
  isConnected: boolean;
  projectId?: number;
}

type BotType = 'MixBot' | 'IdeaBot' | 'CommandBot';

interface BotInfo {
  id: BotType;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  exampleCommands: string[];
}

export default function AICommandInterface({ 
  onProcessCommand,
  isConnected,
  projectId
}: AICommandInterfaceProps) {
  const [command, setCommand] = useState('');
  const [activeBot, setActiveBot] = useState<BotType>('CommandBot');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBotSelectorOpen, setIsBotSelectorOpen] = useState(false);
  const [isSuggestionsPanelOpen, setIsSuggestionsPanelOpen] = useState(false);
  
  // Fetch AI suggestions for the current project
  const { data: suggestions, isLoading: isLoadingSuggestions } = useQuery<AISuggestion[]>({
    queryKey: ['/api/projects', projectId, 'ai-suggestions'],
    enabled: !!projectId,
  });

  // Bot definitions with their capabilities
  const bots: BotInfo[] = [
    {
      id: 'MixBot',
      name: 'Mix Bot',
      icon: <MusicIcon className="w-4 h-4" />,
      color: 'bg-gradient-to-br from-[#5D87FF] to-[#3A66FF]',
      description: 'Provides mixing tips and audio processing suggestions',
      exampleCommands: [
        'How should I EQ this vocal?',
        'Add compression to the drums',
        'Suggest reverb settings for the synth'
      ]
    },
    {
      id: 'IdeaBot',
      name: 'Idea Bot',
      icon: <Wand2 className="w-4 h-4" />,
      color: 'bg-gradient-to-br from-[#9747FF] to-[#7933CC]',
      description: 'Generates creative ideas for your music',
      exampleCommands: [
        'Give me melodic ideas for a chorus',
        'Suggest chord progressions in A minor',
        'What instruments would work for an ambient track?'
      ]
    },
    {
      id: 'CommandBot',
      name: 'Command Bot',
      icon: <Bot className="w-4 h-4" />,
      color: 'bg-gradient-to-br from-[#FF7A00] to-[#CC6200]',
      description: 'General assistance for music production questions',
      exampleCommands: [
        'How do I create side-chain compression?',
        'What is the difference between reverb and delay?',
        'How to make my drums punchier?'
      ]
    }
  ];
  
  // Get the active bot information
  const currentBot = bots.find(bot => bot.id === activeBot) || bots[2]; // Default to CommandBot
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!command.trim()) return;
    
    setIsProcessing(true);
    try {
      await onProcessCommand(command);
      setCommand('');
      // Close any open panels after submitting a command
      setIsBotSelectorOpen(false);
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
  
  // Function to get filtered suggestions by bot type
  const getSuggestionsByBot = (botType: BotType): AISuggestion[] => {
    if (!suggestions) return [];
    return suggestions.filter(s => s.botType === botType);
  };
  
  return (
    <div className="p-3 border-t border-[#333333] relative">
      {/* Bot Selector Dropdown */}
      {isBotSelectorOpen && (
        <div className="absolute bottom-full left-0 w-full p-4 bg-[#191919] border border-[#333333] rounded-t-lg shadow-lg z-10">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium">AI Assistants</h3>
            <button 
              onClick={() => setIsBotSelectorOpen(false)}
              className="p-1 hover:bg-[#333333] rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            {bots.map(bot => (
              <button
                key={bot.id}
                onClick={() => {
                  setActiveBot(bot.id);
                  setIsBotSelectorOpen(false);
                }}
                className={`w-full flex items-center p-3 rounded-lg hover:bg-[#252525] transition-colors ${activeBot === bot.id ? 'bg-[#252525]' : 'bg-[#1A1A1A]'}`}
              >
                <div className={`w-8 h-8 ${bot.color} rounded-full flex items-center justify-center text-white font-bold shadow-md mr-3 flex-shrink-0`}>
                  {bot.icon}
                </div>
                <div className="text-left">
                  <div className="font-medium">{bot.name}</div>
                  <div className="text-xs text-[#999999]">{bot.description}</div>
                </div>
              </button>
            ))}
          </div>
          
          <div className="mt-4">
            <h4 className="text-xs font-medium mb-2">Example Commands for {currentBot.name}</h4>
            <div className="space-y-2">
              {currentBot.exampleCommands.map((example, i) => (
                <button
                  key={i}
                  onClick={() => handleUseExample(example)}
                  className="w-full text-left text-xs bg-[#252525] hover:bg-[#333333] p-2 rounded transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* AI Suggestions Panel */}
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
          ) : suggestions && suggestions.length > 0 ? (
            <div className="space-y-4">
              {bots.map(bot => {
                const botSuggestions = getSuggestionsByBot(bot.id);
                if (botSuggestions.length === 0) return null;
                
                return (
                  <div key={bot.id} className="space-y-2">
                    <h4 className="text-xs font-medium flex items-center">
                      <div className={`w-5 h-5 ${bot.color} rounded-full flex items-center justify-center text-white mr-2`}>
                        {bot.icon}
                      </div>
                      {bot.name} Suggestions
                    </h4>
                    
                    {botSuggestions.slice(0, 3).map((suggestion) => (
                      <div key={suggestion.id} className="bg-[#1A1A1A] p-3 rounded-lg">
                        <p className="text-xs">{suggestion.suggestion}</p>
                        <div className="text-[10px] text-[#777777] mt-2">
                          {new Date(suggestion.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-[#999999]">
              No suggestions yet. Try asking the AI for help!
            </div>
          )}
        </div>
      )}
      
      {/* Command Input Form */}
      <form onSubmit={handleSubmit}>
        <div className={`relative rounded-3xl transition-all duration-300 p-2 flex items-center ${isProcessing ? 'bg-gradient-to-b from-[#333333] to-[#252525]' : 'bg-gradient-to-b from-[#252525] to-[#1A1A1A]'} border border-[#333333]`}>
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-md mr-2 flex-shrink-0 ${currentBot.color}`}
            onClick={() => setIsBotSelectorOpen(!isBotSelectorOpen)}
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              currentBot.icon
            )}
          </div>
          <input 
            type="text" 
            value={command}
            onChange={handleInputChange}
            placeholder={isProcessing ? "Processing..." : `Ask ${currentBot.name} for help...`}
            className="w-full bg-transparent border-none focus:outline-none text-sm"
            disabled={isProcessing || !isConnected}
          />
          {command && (
            <button
              type="submit" 
              className="ml-2 px-3 py-1 bg-[#FF7A00] hover:bg-[#CC6200] text-white text-xs font-medium rounded-full transition-colors"
              disabled={isProcessing || !isConnected}
            >
              Send
            </button>
          )}
        </div>
      </form>
      
      {/* Bottom Controls */}
      <div className="mt-3 flex justify-between">
        <div className="text-xs text-[#999999] flex items-center">
          <span className={`inline-block w-2 h-2 rounded-full mr-1 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          {currentBot.name}
          {!isConnected && " (Offline)"}
        </div>
        <div className="flex gap-3">
          <button 
            className="text-xs text-[#999999] hover:text-white flex items-center"
            onClick={() => setIsBotSelectorOpen(!isBotSelectorOpen)}
          >
            {isBotSelectorOpen ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronUp className="w-3 h-3 mr-1" />}
            Change Bot
          </button>
          <button 
            className="text-xs text-[#FF7A00] hover:text-[#CC6200] flex items-center"
            onClick={() => setIsSuggestionsPanelOpen(!isSuggestionsPanelOpen)}
          >
            <MessageSquareMore className="w-3 h-3 mr-1" />
            History
          </button>
        </div>
      </div>
    </div>
  );
}
