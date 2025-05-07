import { useState } from 'react';
import { Bot } from 'lucide-react';

interface AICommandInterfaceProps {
  onProcessCommand: (command: string) => Promise<any>;
  isConnected: boolean;
}

export default function AICommandInterface({ 
  onProcessCommand,
  isConnected
}: AICommandInterfaceProps) {
  const [command, setCommand] = useState('');
  const [activeBot, setActiveBot] = useState('MixBot');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!command.trim()) return;
    
    setIsProcessing(true);
    try {
      await onProcessCommand(command);
      setCommand('');
    } catch (error) {
      console.error('Error processing command:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCommand(e.target.value);
  };
  
  const handleInputFocus = () => {
    // Show placeholder examples when focused
  };
  
  const handleInputBlur = () => {
    // Reset placeholder when blurred
  };

  return (
    <div className="p-3 border-t border-[#333333]">
      <form onSubmit={handleSubmit}>
        <div className="relative rounded-3xl bg-gradient-to-b from-[#252525] to-[#1A1A1A] border border-[#333333] transition-all duration-300 p-2 flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-[#FF7A00] to-[#CC6200] rounded-full flex items-center justify-center text-white font-bold shadow-md mr-2 flex-shrink-0">
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
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={isProcessing ? "Processing..." : "Type a command or ask for help..."}
            className="w-full bg-transparent border-none focus:outline-none text-sm"
            disabled={isProcessing || !isConnected}
          />
        </div>
      </form>
      
      <div className="mt-3 flex justify-between">
        <div className="text-xs text-[#999999]">
          Active: {activeBot}
          {!isConnected && " (Offline)"}
        </div>
        <button 
          className="text-xs text-[#FF7A00] hover:text-[#CC6200]"
          onClick={() => {
            if (activeBot === 'MixBot') {
              setActiveBot('MasterBot');
            } else {
              setActiveBot('MixBot');
            }
          }}
        >
          View All Bots
        </button>
      </div>
    </div>
  );
}
