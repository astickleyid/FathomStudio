import { useState, useRef, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Wand2, 
  Save, 
  Sparkles, 
  PlayCircle, 
  StopCircle, 
  RefreshCw, 
  Music,
  Volume2,
  FileText,
  Cog,
  Download,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { audioEngine } from '@/lib/audio-engine';
import { useMobile } from '@/hooks/use-mobile';
import * as Tone from 'tone';

interface AISoundDesignerProps {
  onClose: () => void;
  projectId?: number | null;
  onSoundDesigned?: (soundUrl: string, name: string) => void;
}

type PresetType = 'synth' | 'bass' | 'percussion' | 'ambient' | 'fx' | 'vocal';

interface PresetOption {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, number | boolean | string>;
}

// The AI Sound Designer component
export default function AISoundDesigner({ onClose, projectId, onSoundDesigned }: AISoundDesignerProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('synth-lead');
  const [selectedType, setSelectedType] = useState<PresetType>('synth');
  const [soundName, setSoundName] = useState('My AI Sound');
  const [generatedSound, setGeneratedSound] = useState<string | null>(null);
  const [parameters, setParameters] = useState<Record<string, number | boolean | string>>({
    attack: 0.1,
    decay: 0.2,
    sustain: 0.5,
    release: 0.8,
    filterCutoff: 2000,
    filterResonance: 2,
    distortion: 0,
    reverb: 0.3,
    delay: 0.2,
    harmonicity: 1,
    modulationIndex: 10,
    useAI: true
  });
  
  const player = useRef<Tone.Player | null>(null);
  const synth = useRef<Tone.PolySynth | null>(null);
  const isMobile = useMobile();
  const { toast } = useToast();
  
  // Presets for different sound types
  const presets: Record<PresetType, PresetOption[]> = {
    synth: [
      {
        id: 'synth-lead',
        name: 'Lead Synth',
        description: 'Bright and cutting lead sound',
        parameters: {
          attack: 0.01,
          decay: 0.3,
          sustain: 0.4,
          release: 0.8,
          filterCutoff: 4000,
          filterResonance: 4,
          distortion: 0.2,
          reverb: 0.1,
          delay: 0.2,
          harmonicity: 1,
          modulationIndex: 0,
          useAI: true
        }
      },
      {
        id: 'synth-pad',
        name: 'Atmospheric Pad',
        description: 'Lush, evolving pad sound',
        parameters: {
          attack: 0.5,
          decay: 1.0,
          sustain: 0.8,
          release: 2.5,
          filterCutoff: 2000,
          filterResonance: 1,
          distortion: 0,
          reverb: 0.8,
          delay: 0.3,
          harmonicity: 2,
          modulationIndex: 5,
          useAI: true
        }
      },
      {
        id: 'synth-pluck',
        name: 'Plucky Synth',
        description: 'Short, percussive synth sound',
        parameters: {
          attack: 0.005,
          decay: 0.1,
          sustain: 0.1,
          release: 0.3,
          filterCutoff: 5000,
          filterResonance: 3,
          distortion: 0.05,
          reverb: 0.2,
          delay: 0.1,
          harmonicity: 1.5,
          modulationIndex: 2,
          useAI: true
        }
      }
    ],
    bass: [
      {
        id: 'bass-sub',
        name: 'Sub Bass',
        description: 'Deep, powerful sub bass',
        parameters: {
          attack: 0.05,
          decay: 0.1,
          sustain: 0.9,
          release: 0.8,
          filterCutoff: 300,
          filterResonance: 0.5,
          distortion: 0.1,
          reverb: 0.05,
          delay: 0,
          harmonicity: 0.5,
          modulationIndex: 0,
          useAI: true
        }
      },
      {
        id: 'bass-wobble',
        name: 'Wobble Bass',
        description: 'Dynamic modulated bass sound',
        parameters: {
          attack: 0.01,
          decay: 0.2,
          sustain: 0.7,
          release: 0.4,
          filterCutoff: 800,
          filterResonance: 8,
          distortion: 0.3,
          reverb: 0.1,
          delay: 0.1,
          harmonicity: 1,
          modulationIndex: 8,
          useAI: true
        }
      }
    ],
    percussion: [
      {
        id: 'perc-kick',
        name: 'Kick Drum',
        description: 'Punchy kick with body',
        parameters: {
          attack: 0.001,
          decay: 0.2,
          sustain: 0.1,
          release: 0.4,
          filterCutoff: 2000,
          filterResonance: 0.5,
          distortion: 0.1,
          reverb: 0.05,
          delay: 0,
          harmonicity: 0.8,
          modulationIndex: 0,
          useAI: true
        }
      },
      {
        id: 'perc-snare',
        name: 'Snare Drum',
        description: 'Crisp snare with snap',
        parameters: {
          attack: 0.001,
          decay: 0.15,
          sustain: 0.05,
          release: 0.2,
          filterCutoff: 5000,
          filterResonance: 2,
          distortion: 0.2,
          reverb: 0.2,
          delay: 0,
          harmonicity: 2,
          modulationIndex: 5,
          useAI: true
        }
      }
    ],
    ambient: [
      {
        id: 'ambient-texture',
        name: 'Ambient Texture',
        description: 'Evolving textural soundscape',
        parameters: {
          attack: 1.0,
          decay: 1.5,
          sustain: 0.8,
          release: 3.0,
          filterCutoff: 2000,
          filterResonance: 1,
          distortion: 0.05,
          reverb: 0.9,
          delay: 0.5,
          harmonicity: 3,
          modulationIndex: 3,
          useAI: true
        }
      },
      {
        id: 'ambient-drone',
        name: 'Drone Sound',
        description: 'Sustained evolving drone',
        parameters: {
          attack: 2.0,
          decay: 1.0,
          sustain: 1.0,
          release: 4.0,
          filterCutoff: 1500,
          filterResonance: 0.5,
          distortion: 0.1,
          reverb: 0.8,
          delay: 0.3,
          harmonicity: 4,
          modulationIndex: 2,
          useAI: true
        }
      }
    ],
    fx: [
      {
        id: 'fx-riser',
        name: 'Riser Effect',
        description: 'Building tension effect',
        parameters: {
          attack: 0.5,
          decay: 1.0,
          sustain: 0.8,
          release: 0.5,
          filterCutoff: 6000,
          filterResonance: 5,
          distortion: 0.2,
          reverb: 0.6,
          delay: 0.2,
          harmonicity: 5,
          modulationIndex: 10,
          useAI: true
        }
      },
      {
        id: 'fx-impact',
        name: 'Impact Sound',
        description: 'Dramatic impact or hit',
        parameters: {
          attack: 0.001,
          decay: 0.3,
          sustain: 0.05,
          release: 1.5,
          filterCutoff: 3000,
          filterResonance: 3,
          distortion: 0.4,
          reverb: 0.7,
          delay: 0.3,
          harmonicity: 2,
          modulationIndex: 8,
          useAI: true
        }
      }
    ],
    vocal: [
      {
        id: 'vocal-pad',
        name: 'Vocal Pad',
        description: 'Ethereal vocal synth pad',
        parameters: {
          attack: 0.3,
          decay: 0.6,
          sustain: 0.7,
          release: 2.0,
          filterCutoff: 2500,
          filterResonance: 1,
          distortion: 0.05,
          reverb: 0.8,
          delay: 0.3,
          harmonicity: 1.5,
          modulationIndex: 3,
          useAI: true
        }
      },
      {
        id: 'vocal-chop',
        name: 'Vocal Chop',
        description: 'Rhythmic vocal fragment',
        parameters: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.2,
          release: 0.4,
          filterCutoff: 4000,
          filterResonance: 2,
          distortion: 0.1,
          reverb: 0.5,
          delay: 0.25,
          harmonicity: 1,
          modulationIndex: 0,
          useAI: true
        }
      }
    ]
  };
  
  // Initialize Tone.js
  useEffect(() => {
    // Initialize audio context when component mounts
    if (Tone.context.state !== 'running') {
      Tone.start();
    }

    // Initialize effects
    const reverb = new Tone.Reverb({ decay: parameters.reverb as number, wet: parameters.reverb as number }).toDestination();
    const delay = new Tone.FeedbackDelay({ delayTime: parameters.delay as number, feedback: 0.4, wet: parameters.delay as number }).connect(reverb);
    const dist = new Tone.Distortion({ distortion: parameters.distortion as number, wet: parameters.distortion as number }).connect(delay);
    const filter = new Tone.Filter({ frequency: parameters.filterCutoff as number, Q: parameters.filterResonance as number, type: 'lowpass' }).connect(dist);
    
    // Create a synth for preview
    synth.current = new Tone.PolySynth().connect(filter);
    
    // Create a player for playing back generated sounds
    player.current = new Tone.Player().connect(filter);
    
    // Update synth with current parameters
    updateSynthParameters();
    
    // Cleanup
    return () => {
      if (player.current) {
        player.current.dispose();
      }
      if (synth.current) {
        synth.current.dispose();
      }
      filter.dispose();
      dist.dispose();
      delay.dispose();
      reverb.dispose();
    };
  }, []);
  
  // Update parameters when preset changes
  useEffect(() => {
    const selectedPresetObj = presets[selectedType].find(p => p.id === selectedPreset);
    if (selectedPresetObj) {
      setParameters(selectedPresetObj.parameters);
      updateSynthParameters();
    }
  }, [selectedPreset, selectedType]);
  
  // Update the synth with current parameters
  const updateSynthParameters = () => {
    if (!synth.current) return;
    
    // Update envelope
    synth.current.set({
      envelope: {
        attack: parameters.attack as number,
        decay: parameters.decay as number,
        sustain: parameters.sustain as number,
        release: parameters.release as number
      }
    });
  };
  
  // Play a preview of the current sound
  const handlePlayPreview = () => {
    if (isPlaying) {
      handleStopPreview();
      return;
    }
    
    setIsPlaying(true);

    // If we have a generated sound, play that
    if (generatedSound && player.current) {
      player.current.start();
    }
    // Otherwise play a preview using the synth
    else if (synth.current) {
      // Play a C major chord
      synth.current.triggerAttackRelease(["C4", "E4", "G4"], 1);
      
      // Play an arpeggio
      const notes = ["C4", "E4", "G4", "B4", "C5"];
      let time = Tone.now();
      
      notes.forEach((note, i) => {
        synth.current?.triggerAttackRelease(note, "8n", time + i * 0.2);
      });
      
      // Stop playing after a short time
      setTimeout(() => {
        setIsPlaying(false);
      }, 2000);
    }
  };
  
  // Stop preview playback
  const handleStopPreview = () => {
    setIsPlaying(false);
    
    if (player.current && player.current.state === "started") {
      player.current.stop();
    }
    
    if (synth.current) {
      synth.current.releaseAll();
    }
  };
  
  // Generate a new sound using AI
  const handleGenerateSound = async () => {
    if (!parameters.useAI) {
      // Just using the synth parameters, no AI
      handlePlayPreview();
      return;
    }

    // Validate that we have a prompt
    if (!prompt && parameters.useAI) {
      toast({
        title: "Prompt Required",
        description: "Please enter a sound description to generate with AI",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsGenerating(true);
      
      // Build a request payload
      const payload = {
        prompt: prompt,
        parameters: parameters,
        soundType: selectedType,
        presetId: selectedPreset,
        projectId
      };
      
      // Call the backend API
      const response = await apiRequest('/api/ai/generate-sound', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      // Assuming the API returns a URL to the generated sound
      if (response && response.soundUrl) {
        setGeneratedSound(response.soundUrl);
        
        // Load the sound into the player
        if (player.current) {
          await player.current.load(response.soundUrl);
          
          // Auto-play
          handlePlayPreview();
        }
        
        toast({
          title: "Sound Generated",
          description: "AI has created a new sound based on your description",
        });
      }
    } catch (error) {
      console.error("Error generating sound:", error);
      toast({
        title: "Generation Failed",
        description: "There was an error generating the sound. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Save the generated sound
  const handleSaveSound = async () => {
    if (!generatedSound) {
      toast({
        title: "No Sound Generated",
        description: "Please generate a sound before saving",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Save the sound to the project
      const saveResponse = await apiRequest('/api/samples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: soundName,
          url: generatedSound,
          category: selectedType,
          isAIGenerated: true,
          parameters: JSON.stringify(parameters),
        }),
      });
      
      toast({
        title: "Sound Saved",
        description: `${soundName} has been saved to your samples`,
      });
      
      // Call the callback if provided
      if (onSoundDesigned) {
        onSoundDesigned(generatedSound, soundName);
      }
      
      // Close the dialog
      onClose();
    } catch (error) {
      console.error("Error saving sound:", error);
      toast({
        title: "Save Failed",
        description: "There was an error saving the sound. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle parameter changes
  const handleParameterChange = (paramName: string, value: number | boolean | string) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
    
    // Update the synth in real-time
    updateSynthParameters();
  };
  
  return (
    <div className="w-full max-w-4xl max-h-[90vh] bg-[#1A1A1A] rounded-md shadow-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-3 bg-[#252525] border-b border-[#333333]">
        <div className="flex items-center">
          <Wand2 className="w-5 h-5 text-[#FF7A00] mr-2" />
          <h2 className="text-base font-medium">AI Sound Designer</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-[#333333] rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Presets & Controls */}
        <div className="w-1/3 border-r border-[#333333] p-4 overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Sound Type</h3>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(presets) as PresetType[]).map((type) => (
                <button
                  key={type}
                  className={`p-2 text-xs rounded-md flex flex-col items-center justify-center transition-colors ${
                    selectedType === type 
                      ? 'bg-[#FF7A00] text-white' 
                      : 'bg-[#252525] text-[#999999] hover:bg-[#333333]'
                  }`}
                  onClick={() => {
                    setSelectedType(type);
                    // Select the first preset of this type
                    setSelectedPreset(presets[type][0].id);
                  }}
                >
                  {type === 'synth' && <Music className="w-4 h-4 mb-1" />}
                  {type === 'bass' && <Volume2 className="w-4 h-4 mb-1" />}
                  {type === 'percussion' && <PlayCircle className="w-4 h-4 mb-1" />}
                  {type === 'ambient' && <Sparkles className="w-4 h-4 mb-1" />}
                  {type === 'fx' && <Wand2 className="w-4 h-4 mb-1" />}
                  {type === 'vocal' && <FileText className="w-4 h-4 mb-1" />}
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Presets</h3>
            <div className="space-y-2">
              {presets[selectedType].map((preset) => (
                <button
                  key={preset.id}
                  className={`w-full p-2 text-xs text-left rounded-md transition-colors flex justify-between items-center ${
                    selectedPreset === preset.id 
                      ? 'bg-[#333333] text-white' 
                      : 'bg-[#252525] text-[#999999] hover:bg-[#333333]'
                  }`}
                  onClick={() => {
                    setSelectedPreset(preset.id);
                  }}
                >
                  <div>
                    <div className="font-medium">{preset.name}</div>
                    <div className="text-[10px] text-[#999999]">{preset.description}</div>
                  </div>
                  <Cog className="w-3 h-3 text-[#999999]" />
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">AI Generation</h3>
              <div className="flex items-center">
                <Label htmlFor="use-ai" className="text-xs mr-2">Use AI</Label>
                <Switch
                  id="use-ai"
                  checked={parameters.useAI as boolean}
                  onCheckedChange={(checked) => handleParameterChange('useAI', checked)}
                  className="data-[state=checked]:bg-[#FF7A00]"
                />
              </div>
            </div>
            
            <div className={parameters.useAI ? 'opacity-100' : 'opacity-50 pointer-events-none'}>
              <div className="mb-2">
                <Label htmlFor="ai-prompt" className="text-xs block mb-1">
                  Sound Description
                </Label>
                <Input
                  id="ai-prompt"
                  placeholder="Describe the sound you want to create..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="bg-[#252525] border-[#333333] text-sm"
                  disabled={!parameters.useAI as boolean}
                />
              </div>
              
              <div className="text-xs text-[#999999] mb-2">
                <p>Examples:</p>
                <ul className="list-disc pl-4 space-y-1 mt-1">
                  <li>A deep, rumbling bass sound with overtones</li>
                  <li>A sparkling ambient pad with gentle modulation</li>
                  <li>A punchy kick drum with sub-bass</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="pt-3 border-t border-[#333333]">
            <div className="flex space-x-2">
              <Button 
                onClick={handlePlayPreview} 
                variant="outline"
                className={`flex-1 flex items-center justify-center ${isPlaying ? 'bg-[#FF7A00] text-white hover:bg-[#CC6200]' : 'bg-[#252525] hover:bg-[#333333]'}`}
              >
                {isPlaying ? (
                  <>
                    <StopCircle className="mr-1 h-4 w-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-1 h-4 w-4" />
                    Play
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleGenerateSound} 
                disabled={isGenerating || (parameters.useAI as boolean && !prompt)}
                className="flex-1 bg-[#FF7A00] hover:bg-[#CC6200] text-white flex items-center justify-center"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-1 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Right Panel: Parameters & Save */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Sound Parameters</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-xs text-[#999999]">Envelope</h4>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label htmlFor="attack" className="text-xs">Attack</Label>
                      <span className="text-xs text-[#999999]">{(parameters.attack as number).toFixed(2)}s</span>
                    </div>
                    <Slider
                      id="attack"
                      min={0.001}
                      max={2}
                      step={0.01}
                      value={[parameters.attack as number]}
                      onValueChange={(value) => handleParameterChange('attack', value[0])}
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label htmlFor="decay" className="text-xs">Decay</Label>
                      <span className="text-xs text-[#999999]">{(parameters.decay as number).toFixed(2)}s</span>
                    </div>
                    <Slider
                      id="decay"
                      min={0.001}
                      max={2}
                      step={0.01}
                      value={[parameters.decay as number]}
                      onValueChange={(value) => handleParameterChange('decay', value[0])}
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label htmlFor="sustain" className="text-xs">Sustain</Label>
                      <span className="text-xs text-[#999999]">{(parameters.sustain as number).toFixed(2)}</span>
                    </div>
                    <Slider
                      id="sustain"
                      min={0}
                      max={1}
                      step={0.01}
                      value={[parameters.sustain as number]}
                      onValueChange={(value) => handleParameterChange('sustain', value[0])}
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label htmlFor="release" className="text-xs">Release</Label>
                      <span className="text-xs text-[#999999]">{(parameters.release as number).toFixed(2)}s</span>
                    </div>
                    <Slider
                      id="release"
                      min={0.001}
                      max={5}
                      step={0.01}
                      value={[parameters.release as number]}
                      onValueChange={(value) => handleParameterChange('release', value[0])}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-xs text-[#999999]">Filter</h4>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label htmlFor="filterCutoff" className="text-xs">Cutoff</Label>
                      <span className="text-xs text-[#999999]">{(parameters.filterCutoff as number).toFixed(0)} Hz</span>
                    </div>
                    <Slider
                      id="filterCutoff"
                      min={20}
                      max={20000}
                      step={1}
                      value={[parameters.filterCutoff as number]}
                      onValueChange={(value) => handleParameterChange('filterCutoff', value[0])}
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label htmlFor="filterResonance" className="text-xs">Resonance</Label>
                      <span className="text-xs text-[#999999]">{(parameters.filterResonance as number).toFixed(1)}</span>
                    </div>
                    <Slider
                      id="filterResonance"
                      min={0}
                      max={10}
                      step={0.1}
                      value={[parameters.filterResonance as number]}
                      onValueChange={(value) => handleParameterChange('filterResonance', value[0])}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-xs text-[#999999]">Effects</h4>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label htmlFor="distortion" className="text-xs">Distortion</Label>
                      <span className="text-xs text-[#999999]">{(parameters.distortion as number).toFixed(2)}</span>
                    </div>
                    <Slider
                      id="distortion"
                      min={0}
                      max={1}
                      step={0.01}
                      value={[parameters.distortion as number]}
                      onValueChange={(value) => handleParameterChange('distortion', value[0])}
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label htmlFor="reverb" className="text-xs">Reverb</Label>
                      <span className="text-xs text-[#999999]">{(parameters.reverb as number).toFixed(2)}</span>
                    </div>
                    <Slider
                      id="reverb"
                      min={0}
                      max={1}
                      step={0.01}
                      value={[parameters.reverb as number]}
                      onValueChange={(value) => handleParameterChange('reverb', value[0])}
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label htmlFor="delay" className="text-xs">Delay</Label>
                      <span className="text-xs text-[#999999]">{(parameters.delay as number).toFixed(2)}</span>
                    </div>
                    <Slider
                      id="delay"
                      min={0}
                      max={1}
                      step={0.01}
                      value={[parameters.delay as number]}
                      onValueChange={(value) => handleParameterChange('delay', value[0])}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-xs text-[#999999]">Modulation</h4>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label htmlFor="harmonicity" className="text-xs">Harmonicity</Label>
                      <span className="text-xs text-[#999999]">{(parameters.harmonicity as number).toFixed(1)}</span>
                    </div>
                    <Slider
                      id="harmonicity"
                      min={0.1}
                      max={10}
                      step={0.1}
                      value={[parameters.harmonicity as number]}
                      onValueChange={(value) => handleParameterChange('harmonicity', value[0])}
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label htmlFor="modulationIndex" className="text-xs">Modulation Index</Label>
                      <span className="text-xs text-[#999999]">{(parameters.modulationIndex as number).toFixed(0)}</span>
                    </div>
                    <Slider
                      id="modulationIndex"
                      min={0}
                      max={20}
                      step={0.1}
                      value={[parameters.modulationIndex as number]}
                      onValueChange={(value) => handleParameterChange('modulationIndex', value[0])}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Save Section */}
          {generatedSound && (
            <div className="pt-4 border-t border-[#333333]">
              <h3 className="text-sm font-medium mb-2">Save Sound</h3>
              
              <div className="mb-3">
                <Label htmlFor="sound-name" className="text-xs block mb-1">
                  Sound Name
                </Label>
                <Input
                  id="sound-name"
                  placeholder="Enter a name for your sound"
                  value={soundName}
                  onChange={(e) => setSoundName(e.target.value)}
                  className="bg-[#252525] border-[#333333] text-sm"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={handleSaveSound}
                  disabled={!soundName.trim()} 
                  className="flex-1 bg-[#FF7A00] hover:bg-[#CC6200] text-white flex items-center justify-center"
                >
                  <Save className="mr-1 h-4 w-4" />
                  Save to Project
                </Button>
                
                <Button 
                  onClick={() => {
                    // Create a download link
                    const a = document.createElement('a');
                    a.href = generatedSound;
                    a.download = `${soundName.trim() || 'ai-sound'}.wav`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  variant="outline"
                  className="flex items-center justify-center bg-[#252525] hover:bg-[#333333]"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}