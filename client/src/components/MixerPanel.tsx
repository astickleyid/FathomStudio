import { useState, useEffect } from 'react';
import { Track, AISuggestion } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChannelStrip from './audio/ChannelStrip';
import EQModule from './audio/EQModule';
import SoundLibrary from './audio/SoundLibrary';
import AIBotInsight from './ai/AIBotInsight';

interface MixerPanelProps {
  tracks: Track[] | undefined;
  isLoading: boolean;
  selectedTrackId: number | null;
  projectId: number | undefined;
}

export default function MixerPanel({ 
  tracks, 
  isLoading, 
  selectedTrackId,
  projectId
}: MixerPanelProps) {
  const [activeTab, setActiveTab] = useState('mixer');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  // Update selected track when tracks or selectedTrackId changes
  useEffect(() => {
    if (tracks && selectedTrackId) {
      const track = tracks.find(t => t.id === selectedTrackId);
      setSelectedTrack(track || null);
    } else {
      setSelectedTrack(null);
    }
  }, [tracks, selectedTrackId]);
  
  // Fetch AI suggestions when projectId changes
  useEffect(() => {
    async function fetchAISuggestions() {
      if (projectId) {
        setIsLoadingSuggestions(true);
        try {
          const response = await fetch(`/api/projects/${projectId}/ai-suggestions`);
          if (response.ok) {
            const suggestions = await response.json();
            setAiSuggestions(suggestions);
          }
        } catch (error) {
          console.error('Error fetching AI suggestions:', error);
        } finally {
          setIsLoadingSuggestions(false);
        }
      }
    }
    
    fetchAISuggestions();
  }, [projectId]);

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="flex border-b border-fathom-lightgray w-full justify-start rounded-none bg-transparent">
          <TabsTrigger 
            value="mixer"
            className="flex-1 py-3 data-[state=active]:border-b-2 data-[state=active]:border-fathom-orange data-[state=active]:text-fathom-orange data-[state=active]:shadow-none data-[state=inactive]:text-fathom-text-secondary bg-transparent"
          >
            Mixer
          </TabsTrigger>
          <TabsTrigger 
            value="fx"
            className="flex-1 py-3 data-[state=active]:border-b-2 data-[state=active]:border-fathom-orange data-[state=active]:text-fathom-orange data-[state=active]:shadow-none data-[state=inactive]:text-fathom-text-secondary bg-transparent"
          >
            FX
          </TabsTrigger>
          <TabsTrigger 
            value="ai"
            className="flex-1 py-3 data-[state=active]:border-b-2 data-[state=active]:border-fathom-orange data-[state=active]:text-fathom-orange data-[state=active]:shadow-none data-[state=inactive]:text-fathom-text-secondary bg-transparent"
          >
            AI Bots
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="mixer" className="flex-1 overflow-y-auto p-4 space-y-6 m-0 border-none">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : selectedTrack ? (
            <ChannelStrip track={selectedTrack} />
          ) : (
            <div className="text-center text-fathom-text-secondary h-32 flex items-center justify-center">
              <p>Select a track to view its channel strip</p>
            </div>
          )}
          
          <EQModule />
          
          <SoundLibrary />
        </TabsContent>
        
        <TabsContent value="fx" className="flex-1 overflow-y-auto p-4 space-y-6 m-0 border-none">
          <div className="plugin-module">
            <div className="bg-gradient-to-r from-fathom-darkgray to-fathom-gray p-2 flex justify-between items-center">
              <h3 className="text-fathom-teal font-medium">Compressor</h3>
              <button className="w-5 h-5 rounded bg-fathom-gray flex items-center justify-center text-xs">×</button>
            </div>
            
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <div className="w-full h-32 bg-fathom-gray bg-opacity-30 rounded-md flex items-center justify-center mb-2">
                  <div className="h-16 w-16 rounded-full bg-fathom-darkgray flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                      <div className="absolute bottom-0 left-0 right-0 bg-fathom-orange" style={{ height: '30%' }}></div>
                    </div>
                    <span className="text-sm font-medium relative z-10">-8dB</span>
                  </div>
                </div>
                <div className="text-center text-xs text-fathom-orange">GAIN REDUCTION</div>
                
                <div className="flex justify-center mt-2 space-x-2">
                  <button className="w-7 h-7 rounded-md bg-fathom-gray flex items-center justify-center text-sm">1</button>
                  <button className="w-7 h-7 rounded-md bg-fathom-orange flex items-center justify-center text-sm">4</button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col items-center">
                  <div className="knob text-fathom-orange">
                    <div className="knob-glow"></div>
                    <div className="knob-circle">
                      <div className="knob-indicator bg-current" style={{ transform: 'translateX(-50%) rotate(45deg)' }}></div>
                    </div>
                  </div>
                  <span className="text-xs mt-1">Input</span>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="knob text-fathom-teal">
                    <div className="knob-glow"></div>
                    <div className="knob-circle">
                      <div className="knob-indicator bg-current" style={{ transform: 'translateX(-50%) rotate(90deg)' }}></div>
                    </div>
                  </div>
                  <span className="text-xs mt-1">Attack</span>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="knob text-fathom-orange">
                    <div className="knob-glow"></div>
                    <div className="knob-circle">
                      <div className="knob-indicator bg-current" style={{ transform: 'translateX(-50%) rotate(120deg)' }}></div>
                    </div>
                  </div>
                  <span className="text-xs mt-1">Release</span>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="knob text-fathom-teal">
                    <div className="knob-glow"></div>
                    <div className="knob-circle">
                      <div className="knob-indicator bg-current" style={{ transform: 'translateX(-50%) rotate(135deg)' }}></div>
                    </div>
                  </div>
                  <span className="text-xs mt-1">Output</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="ai" className="flex-1 overflow-y-auto p-4 space-y-6 m-0 border-none">
          {isLoadingSuggestions ? (
            <>
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </>
          ) : aiSuggestions.length > 0 ? (
            aiSuggestions.map(suggestion => (
              <AIBotInsight 
                key={suggestion.id} 
                suggestion={suggestion} 
                trackName={
                  tracks?.find(t => t.id === suggestion.trackId)?.name || 'Unknown Track'
                }
              />
            ))
          ) : (
            <div className="text-center text-fathom-text-secondary h-32 flex items-center justify-center">
              <p>No AI suggestions yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
