import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AudioAnalysisResult, MixRecommendation, EQBand } from "@shared/mix-bot-types";
import { apiRequest } from '@/lib/queryClient';
import { Loader2, ZapIcon, SlidersHorizontal, WavesIcon, BarChart2 } from 'lucide-react';
import { Track } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface AutoMixPanelProps {
  track: Track | null;
  projectId: number | null;
  onMixApplied?: () => void;
}

export default function AutoMixPanel({ track, projectId, onMixApplied }: AutoMixPanelProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recommendation, setRecommendation] = useState<MixRecommendation | null>(null);
  const [activeTab, setActiveTab] = useState<string>('gain');
  const { toast } = useToast();

  // Generate mix recommendations with AI
  const generateMixRecommendations = async () => {
    if (!track || !projectId) {
      toast({
        title: "Error",
        description: "Please select a track first",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiRequest<MixRecommendation>(
        `/api/tracks/${track.id}/generate-mix`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId })
        }
      );
      
      setRecommendation(result);
      toast({
        title: "Mix Recommendations Generated",
        description: `AI analyzed "${track.name}" and created custom mix settings`,
      });
    } catch (error) {
      console.error("Error generating mix recommendations:", error);
      toast({
        title: "Error",
        description: "Failed to generate mix recommendations",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Apply mix recommendations to the track
  const applyMixRecommendations = async () => {
    if (!track || !recommendation) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiRequest(
        `/api/tracks/${track.id}/apply-mix`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recommendation })
        }
      );
      
      toast({
        title: "Mix Applied",
        description: `The AI mix has been applied to "${track.name}"`,
      });
      
      if (onMixApplied) {
        onMixApplied();
      }
    } catch (error) {
      console.error("Error applying mix:", error);
      toast({
        title: "Error",
        description: "Failed to apply mix to track",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Render EQ band visualization
  const renderEQBands = (bands: EQBand[]) => {
    return (
      <div className="h-32 relative mt-6 mb-2 flex items-end">
        {bands.map((band, index) => {
          // Convert frequency to position (logarithmic scale)
          const minFreq = 20;
          const maxFreq = 20000;
          const position = (Math.log10(band.frequency) - Math.log10(minFreq)) / 
                         (Math.log10(maxFreq) - Math.log10(minFreq)) * 100;
          
          // Convert gain to height (-12dB to +12dB mapped to height)
          const gainHeight = ((band.gain + 12) / 24) * 100;
          const gainColor = band.gain > 0 ? 'bg-orange-500' : 'bg-blue-500';
          
          return (
            <div key={index} 
                 className="absolute rounded-full w-3 cursor-pointer hover:opacity-80 transition-all"
                 style={{
                   left: `${position}%`, 
                   height: `${Math.abs(band.gain) * 4 + 8}px`,
                   bottom: band.gain >= 0 ? '50%' : `calc(50% - ${Math.abs(band.gain) * 4 + 8}px)`,
                   backgroundColor: band.gain >= 0 ? '#ff7a00' : '#3b82f6',
                   transform: 'translateX(-50%)',
                 }}
                 title={`${band.frequency}Hz: ${band.gain > 0 ? '+' : ''}${band.gain}dB Q:${band.q}`}>
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs opacity-60">
                {band.frequency < 1000 ? band.frequency : `${(band.frequency/1000).toFixed(1)}k`}
              </div>
            </div>
          );
        })}
        <div className="absolute w-full h-px bg-gray-500 top-1/2"></div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <ZapIcon className="text-orange-500" />
          Autonomous Mix Bot
        </CardTitle>
        <CardDescription>
          AI-powered mixing assistant that automatically sets optimal levels
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!track ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <SlidersHorizontal size={48} className="mb-3 opacity-30" />
            <p>Select a track to generate mix recommendations</p>
          </div>
        ) : recommendation ? (
          <div className="space-y-4">
            <Tabs defaultValue="gain" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="gain" className="flex items-center gap-1">
                  <BarChart2 size={14} />
                  <span>Gain</span>
                </TabsTrigger>
                <TabsTrigger value="eq" className="flex items-center gap-1">
                  <WavesIcon size={14} />
                  <span>EQ</span>
                </TabsTrigger>
                <TabsTrigger value="comp" className="flex items-center gap-1">
                  <SlidersHorizontal size={14} />
                  <span>Compression</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="gain" className="space-y-4 py-4">
                <p className="text-sm text-gray-300">{recommendation.gainStaging.recommendation}</p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label>Target Level</Label>
                      <span className="text-sm text-gray-400">{recommendation.gainStaging.targetLevel} dB</span>
                    </div>
                    <Slider 
                      disabled
                      defaultValue={[recommendation.gainStaging.targetLevel]} 
                      max={0} 
                      min={-24} 
                      step={1} 
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="eq" className="space-y-4 py-4">
                <p className="text-sm text-gray-300">{recommendation.eq.recommendation}</p>
                
                {renderEQBands(recommendation.eq.bands)}
                
                <div className="pt-6">
                  <div className="flex justify-between items-center">
                    <Label>Enable EQ</Label>
                    <Switch disabled defaultChecked />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="comp" className="space-y-4 py-4">
                <p className="text-sm text-gray-300">{recommendation.compression.recommendation}</p>
                
                <div className="space-y-4 pt-2">
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label>Threshold</Label>
                      <span className="text-sm text-gray-400">{recommendation.compression.threshold} dB</span>
                    </div>
                    <Slider 
                      disabled
                      defaultValue={[recommendation.compression.threshold]} 
                      max={0} 
                      min={-60} 
                      step={1} 
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label>Ratio</Label>
                      <span className="text-sm text-gray-400">{recommendation.compression.ratio}:1</span>
                    </div>
                    <Slider 
                      disabled
                      defaultValue={[recommendation.compression.ratio]} 
                      max={20} 
                      min={1} 
                      step={0.1} 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <Label>Attack</Label>
                        <span className="text-sm text-gray-400">{recommendation.compression.attack} ms</span>
                      </div>
                      <Slider 
                        disabled
                        defaultValue={[recommendation.compression.attack]} 
                        max={100} 
                        min={0.1} 
                        step={0.1} 
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <Label>Release</Label>
                        <span className="text-sm text-gray-400">{recommendation.compression.release} ms</span>
                      </div>
                      <Slider 
                        disabled
                        defaultValue={[recommendation.compression.release]} 
                        max={1000} 
                        min={10} 
                        step={10} 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label>Makeup Gain</Label>
                      <span className="text-sm text-gray-400">{recommendation.compression.makeupGain} dB</span>
                    </div>
                    <Slider 
                      disabled
                      defaultValue={[recommendation.compression.makeupGain]} 
                      max={24} 
                      min={0} 
                      step={0.5} 
                    />
                  </div>
                  
                  <div className="pt-2">
                    <div className="flex justify-between items-center">
                      <Label>Enable Compression</Label>
                      <Switch disabled defaultChecked />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="pt-4">
              <Button 
                className="w-full bg-orange-600 hover:bg-orange-700"
                onClick={applyMixRecommendations}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <ZapIcon className="mr-2 h-4 w-4" />
                    Apply AI Mix to Track
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Generate intelligent mix recommendations for {track.name} based on track type and audio analysis.
            </p>
            
            <Button 
              className="w-full"
              variant="outline"
              onClick={generateMixRecommendations}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <ZapIcon className="mr-2 h-4 w-4" />
                  Generate AI Mix
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}