import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MasteringPreset, MasteringTargetPlatform } from "@shared/mastering-types";
import { apiRequest } from '@/lib/queryClient';
import { 
  Loader2, 
  ZapIcon, 
  SlidersHorizontal, 
  Music2Icon, 
  BarChart3, 
  VolumeIcon, 
  MusicIcon, 
  RadioIcon,
  SmartphoneIcon,
  TvIcon,
  HeadphonesIcon,
  Disc3Icon,
  DiscIcon,
  SparklesIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface AutoMasteringPanelProps {
  projectId: number | undefined | null;
  onPresetApplied?: () => void;
}

// Platform options for mastering
const PLATFORM_OPTIONS: { value: MasteringTargetPlatform; label: string; icon: React.ReactNode }[] = [
  { value: 'streaming', label: 'Streaming', icon: <HeadphonesIcon size={16} /> },
  { value: 'cd', label: 'CD', icon: <Disc3Icon size={16} /> },
  { value: 'vinyl', label: 'Vinyl', icon: <DiscIcon size={16} /> },
  { value: 'club', label: 'Club/DJ', icon: <MusicIcon size={16} /> },
  { value: 'radio', label: 'Radio', icon: <RadioIcon size={16} /> },
  { value: 'film', label: 'Film/TV', icon: <TvIcon size={16} /> },
  { value: 'podcast', label: 'Podcast', icon: <Music2Icon size={16} /> },
  { value: 'gaming', label: 'Gaming', icon: <SparklesIcon size={16} /> },
  { value: 'social', label: 'Social Media', icon: <SmartphoneIcon size={16} /> }
];

export default function AutoMasteringPanel({ projectId, onPresetApplied }: AutoMasteringPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [targetPlatform, setTargetPlatform] = useState<MasteringTargetPlatform>('streaming');
  const [masteringPreset, setMasteringPreset] = useState<MasteringPreset | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Generate mastering preset for selected platform
  const generateMasteringPreset = async () => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "Please open a project first",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const preset = await apiRequest<MasteringPreset>(
        `/api/projects/${projectId}/generate-mastering`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetPlatform })
        }
      );
      
      setMasteringPreset(preset);
      toast({
        title: "Mastering Preset Generated",
        description: `AI created a custom mastering preset for ${PLATFORM_OPTIONS.find(p => p.value === targetPlatform)?.label || targetPlatform}`,
      });
    } catch (error) {
      console.error("Error generating mastering preset:", error);
      toast({
        title: "Error",
        description: "Failed to generate mastering preset",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Apply mastering preset to project
  const applyMasteringPreset = async () => {
    if (!projectId || !masteringPreset) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiRequest(
        `/api/projects/${projectId}/apply-mastering`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preset: masteringPreset })
        }
      );
      
      toast({
        title: "Mastering Applied",
        description: `The AI mastering preset has been applied to your project`,
      });
      
      if (onPresetApplied) {
        onPresetApplied();
      }
    } catch (error) {
      console.error("Error applying mastering preset:", error);
      toast({
        title: "Error",
        description: "Failed to apply mastering preset",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Render the preset details when available
  const renderPresetDetails = () => {
    if (!masteringPreset) return null;
    
    return (
      <div className="space-y-4">
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <BarChart3 size={14} />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="eq" className="flex items-center gap-1">
              <SlidersHorizontal size={14} />
              <span>EQ</span>
            </TabsTrigger>
            <TabsTrigger value="dynamics" className="flex items-center gap-1">
              <VolumeIcon size={14} />
              <span>Dynamics</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 py-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">{masteringPreset.name}</h3>
                <p className="text-sm text-gray-300">{masteringPreset.description}</p>
              </div>
              
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between mb-1">
                    <Label>Target Loudness</Label>
                    <span className="text-sm text-orange-400">{masteringPreset.settings.loudnessTarget} LUFS</span>
                  </div>
                  <Slider 
                    disabled
                    defaultValue={[masteringPreset.settings.loudnessTarget]} 
                    max={-6} 
                    min={-24} 
                    step={0.1} 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <Label>Peak Limit</Label>
                    <span className="text-sm text-orange-400">{masteringPreset.settings.peakLimit} dB</span>
                  </div>
                  <Slider 
                    disabled
                    defaultValue={[masteringPreset.settings.peakLimit]} 
                    max={0} 
                    min={-3} 
                    step={0.1} 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <Label>Stereo Width</Label>
                    <span className="text-sm text-orange-400">{masteringPreset.settings.stereoWidth}%</span>
                  </div>
                  <Slider 
                    disabled
                    defaultValue={[masteringPreset.settings.stereoWidth]} 
                    max={150} 
                    min={50} 
                    step={1} 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <Label>Dynamic Range</Label>
                    <span className="text-sm text-orange-400">{masteringPreset.settings.dynamicRange} dB</span>
                  </div>
                  <Slider 
                    disabled
                    defaultValue={[masteringPreset.settings.dynamicRange]} 
                    max={15} 
                    min={3} 
                    step={0.5} 
                  />
                </div>
                
                <div className="pt-2">
                  <Label className="mb-2 block">Color Profile: <span className="text-orange-400">{masteringPreset.settings.colorProfile}</span></Label>
                  <div className="flex gap-1">
                    <div className={`h-1.5 flex-1 rounded-full ${masteringPreset.settings.colorProfile === 'warm' ? 'bg-orange-500' : 'bg-gray-600'}`}></div>
                    <div className={`h-1.5 flex-1 rounded-full ${masteringPreset.settings.colorProfile === 'neutral' ? 'bg-orange-500' : 'bg-gray-600'}`}></div>
                    <div className={`h-1.5 flex-1 rounded-full ${masteringPreset.settings.colorProfile === 'bright' ? 'bg-orange-500' : 'bg-gray-600'}`}></div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="eq" className="space-y-4 py-4">
            <div className="h-40 relative mb-4 border border-gray-700 rounded-md p-2">
              {/* Visualize EQ curve */}
              <div className="absolute inset-0 flex items-center justify-center">
                {masteringPreset.settings.eqSettings.bands.map((band, i) => (
                  <div
                    key={i}
                    className="absolute w-1.5 rounded-full bg-orange-500"
                    style={{
                      left: `${(Math.log10(band.frequency) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * 100}%`,
                      height: `${Math.abs(band.gain) * 5 + 4}px`,
                      bottom: band.gain >= 0 ? '50%' : `calc(50% - ${Math.abs(band.gain) * 5 + 4}px)`,
                      backgroundColor: band.gain >= 0 ? '#ff7a00' : '#3b82f6',
                    }}
                  />
                ))}
                
                {/* Draw EQ curve line */}
                <svg className="absolute inset-0 w-full h-full">
                  <g>
                    <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#4a4a4a" strokeWidth="1" />
                  </g>
                </svg>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-sm font-medium">EQ Bands</h3>
              {masteringPreset.settings.eqSettings.bands.map((band, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span>{band.frequency < 1000 ? band.frequency : `${(band.frequency/1000).toFixed(1)}k`} Hz</span>
                  <span className={band.gain >= 0 ? 'text-orange-400' : 'text-blue-400'}>
                    {band.gain > 0 ? '+' : ''}{band.gain} dB
                  </span>
                  <span>Q: {band.q.toFixed(1)}</span>
                  <span className="text-gray-400">{band.type}</span>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="dynamics" className="space-y-4 py-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <Label>Limiter Threshold</Label>
                  <span className="text-sm text-orange-400">{masteringPreset.settings.limiters.threshold} dB</span>
                </div>
                <Slider 
                  disabled
                  defaultValue={[masteringPreset.settings.limiters.threshold]} 
                  max={0} 
                  min={-12} 
                  step={0.1} 
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <Label>Limiter Ceiling</Label>
                  <span className="text-sm text-orange-400">{masteringPreset.settings.limiters.ceiling} dB</span>
                </div>
                <Slider 
                  disabled
                  defaultValue={[masteringPreset.settings.limiters.ceiling]} 
                  max={0} 
                  min={-2} 
                  step={0.1} 
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <Label>Limiter Release</Label>
                  <span className="text-sm text-orange-400">{masteringPreset.settings.limiters.release} ms</span>
                </div>
                <Slider 
                  disabled
                  defaultValue={[masteringPreset.settings.limiters.release]} 
                  max={300} 
                  min={10} 
                  step={1} 
                />
              </div>
              
              <div className="pt-4">
                <h3 className="text-sm font-medium mb-2">Enhancement Options</h3>
                <div className="space-y-2">
                  {Object.entries(masteringPreset.settings.enhanceOptions).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-sm">{formatEnhanceOptionName(key)}</Label>
                      <Switch disabled checked={value} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="pt-4">
          <Button 
            className="w-full bg-orange-600 hover:bg-orange-700"
            onClick={applyMasteringPreset}
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
                Apply Mastering Preset
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  // Helper function to format enhance option names
  const formatEnhanceOptionName = (key: string): string => {
    switch (key) {
      case 'lowEndEnhance': return 'Low End Enhancement';
      case 'highEndShimmer': return 'High End Shimmer';
      case 'stereoImaging': return 'Stereo Imaging';
      case 'harmonicExciter': return 'Harmonic Exciter';
      case 'transientEnhancer': return 'Transient Enhancer';
      default: return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <ZapIcon className="text-orange-500" />
          Auto-AI Mastering
        </CardTitle>
        <CardDescription>
          One-click platform-specific mastering with intelligent presets
        </CardDescription>
      </CardHeader>

      <CardContent>
        {masteringPreset ? (
          renderPresetDetails()
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Target Platform</Label>
              <Select
                value={targetPlatform}
                onValueChange={(value) => setTargetPlatform(value as MasteringTargetPlatform)}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Distribution Platforms</SelectLabel>
                    {PLATFORM_OPTIONS.map((platform) => (
                      <SelectItem key={platform.value} value={platform.value}>
                        <div className="flex items-center gap-2">
                          {platform.icon}
                          <span>{platform.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <div className="rounded-md border border-gray-700 p-4">
              <h3 className="text-sm font-medium mb-2">Platform Characteristics</h3>
              {targetPlatform === 'streaming' && (
                <p className="text-xs text-gray-400">Music streaming services typically normalize audio to around -14 LUFS with moderate dynamic range and balanced EQ.</p>
              )}
              {targetPlatform === 'cd' && (
                <p className="text-xs text-gray-400">CD masters can be louder (around -10 LUFS) with a focus on clarity, detail, and balanced frequency spectrum.</p>
              )}
              {targetPlatform === 'vinyl' && (
                <p className="text-xs text-gray-400">Vinyl requires controlled bass, wider dynamic range, rolled-off extreme highs, and moderate loudness (-14 LUFS).</p>
              )}
              {targetPlatform === 'club' && (
                <p className="text-xs text-gray-400">Club/DJ masters emphasize powerful bass, enhanced clarity in mid-highs, and high loudness for impact in venues.</p>
              )}
              {targetPlatform === 'radio' && (
                <p className="text-xs text-gray-400">Radio masters need consistent loudness, controlled dynamics, emphasized vocals, and brightness for small speakers.</p>
              )}
              {targetPlatform === 'film' && (
                <p className="text-xs text-gray-400">Film audio requires wider dynamic range, precisely balanced frequency content, and adherence to delivery specifications.</p>
              )}
              {targetPlatform === 'podcast' && (
                <p className="text-xs text-gray-400">Podcast audio focuses on voice clarity, controlled dynamics, and appropriate loudness levels around -16 LUFS.</p>
              )}
              {targetPlatform === 'gaming' && (
                <p className="text-xs text-gray-400">Game audio balances impact and clarity with appropriate headroom for mixing with sound effects and voice.</p>
              )}
              {targetPlatform === 'social' && (
                <p className="text-xs text-gray-400">Social media platforms benefit from louder masters with enhanced bass and treble that sound good on mobile devices.</p>
              )}
            </div>
            
            <Button 
              className="w-full"
              onClick={generateMasteringPreset}
              disabled={isLoading || !projectId}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ZapIcon className="mr-2 h-4 w-4" />
                  Generate {PLATFORM_OPTIONS.find(p => p.value === targetPlatform)?.label} Mastering Preset
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}