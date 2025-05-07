import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Volume, Volume2, VolumeX, Mic, MicOff, Laptop, HardDrive } from 'lucide-react';

interface AudioSettingsProps {
  onClose: () => void;
}

export default function AudioSettings({ onClose }: AudioSettingsProps) {
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInput, setSelectedInput] = useState<string>('default');
  const [selectedOutput, setSelectedOutput] = useState<string>('default');
  const [isInputEnabled, setIsInputEnabled] = useState(false);
  const [inputVolume, setInputVolume] = useState(75);
  const [outputVolume, setOutputVolume] = useState(75);
  const [isOutputMuted, setIsOutputMuted] = useState(false);
  const [sampleRate, setSampleRate] = useState('44100');
  const [bufferSize, setBufferSize] = useState('1024');
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);

  // Fetch available audio devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission to access media devices
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Get all media devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        // Filter for audio devices
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        
        setInputDevices(audioInputs);
        setOutputDevices(audioOutputs);
        
        // Set defaults if available
        if (audioInputs.length > 0) {
          setSelectedInput(audioInputs[0].deviceId);
        }
        
        if (audioOutputs.length > 0) {
          setSelectedOutput(audioOutputs[0].deviceId);
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
      } finally {
        setIsLoadingDevices(false);
      }
    };
    
    getDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, []);
  
  // Handle input device change
  const handleInputChange = (value: string) => {
    setSelectedInput(value);
    // Here you would apply the new input device to the audio engine
    console.log(`Changed input device to: ${value}`);
  };
  
  // Handle output device change
  const handleOutputChange = (value: string) => {
    setSelectedOutput(value);
    // Here you would apply the new output device to the audio engine
    console.log(`Changed output device to: ${value}`);
  };
  
  // Handle input toggle
  const handleInputToggle = (checked: boolean) => {
    setIsInputEnabled(checked);
    // Here you would enable/disable the input in the audio engine
    console.log(`Input ${checked ? 'enabled' : 'disabled'}`);
  };
  
  // Handle output mute
  const handleOutputMute = (checked: boolean) => {
    setIsOutputMuted(checked);
    // Here you would mute/unmute the output in the audio engine
    console.log(`Output ${checked ? 'muted' : 'unmuted'}`);
  };
  
  // Generate array of sample rate options
  const sampleRateOptions = ['44100', '48000', '88200', '96000'];
  
  // Generate array of buffer size options
  const bufferSizeOptions = ['128', '256', '512', '1024', '2048', '4096'];
  
  return (
    <div className="w-full max-w-md max-h-[80vh] overflow-y-auto bg-[#1A1A1A] rounded-md shadow-xl">
      <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-3 bg-[#252525] border-b border-[#333333]">
        <h2 className="text-sm font-medium">Audio Settings</h2>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-[#333333] rounded-full transition-colors"
        >
          &times;
        </button>
      </div>
      
      <div className="p-4 space-y-6">
        {isLoadingDevices ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-sm text-[#999999]">Loading audio devices...</div>
          </div>
        ) : (
          <>
            {/* Input Device Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-medium text-[#FF7A00] uppercase">Input</h3>
              
              <div className="flex items-center justify-between">
                <Label className="flex items-center">
                  {isInputEnabled ? <Mic className="w-4 h-4 mr-2 text-[#FF7A00]" /> : <MicOff className="w-4 h-4 mr-2 text-[#999999]" />}
                  Enable Input Recording
                </Label>
                <Switch 
                  checked={isInputEnabled} 
                  onCheckedChange={handleInputToggle} 
                  className="data-[state=checked]:bg-[#FF7A00]"
                />
              </div>
              
              <div>
                <Label htmlFor="input-device" className="text-xs text-[#999999] mb-1 block">
                  Input Device
                </Label>
                <Select 
                  value={selectedInput} 
                  onValueChange={handleInputChange}
                  disabled={!isInputEnabled}
                >
                  <SelectTrigger 
                    id="input-device" 
                    className="bg-[#252525] border-[#333333] focus:ring-[#FF7A00] focus:border-[#FF7A00]"
                  >
                    <SelectValue placeholder="Select input device" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-[#333333]">
                    {inputDevices.length === 0 ? (
                      <SelectItem value="no-devices">No input devices found</SelectItem>
                    ) : (
                      inputDevices.map(device => (
                        <SelectItem 
                          key={device.deviceId} 
                          value={device.deviceId}
                          className="focus:bg-[#252525]"
                        >
                          {device.label || `Input Device ${device.deviceId.slice(0, 5)}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="input-volume" className="text-xs text-[#999999]">
                    Input Volume
                  </Label>
                  <span className="text-xs text-[#999999]">{inputVolume}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-[#999999]" />
                  <Slider
                    id="input-volume"
                    value={[inputVolume]}
                    min={0}
                    max={100}
                    step={1}
                    disabled={!isInputEnabled}
                    onValueChange={(value) => setInputVolume(value[0])}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            
            {/* Output Device Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-medium text-[#FF7A00] uppercase">Output</h3>
              
              <div className="flex items-center justify-between">
                <Label className="flex items-center">
                  {isOutputMuted ? <VolumeX className="w-4 h-4 mr-2 text-[#999999]" /> : <Volume2 className="w-4 h-4 mr-2 text-[#FF7A00]" />}
                  Mute Output
                </Label>
                <Switch 
                  checked={isOutputMuted} 
                  onCheckedChange={handleOutputMute} 
                  className="data-[state=checked]:bg-[#FF7A00]"
                />
              </div>
              
              <div>
                <Label htmlFor="output-device" className="text-xs text-[#999999] mb-1 block">
                  Output Device
                </Label>
                <Select 
                  value={selectedOutput} 
                  onValueChange={handleOutputChange}
                  disabled={isOutputMuted}
                >
                  <SelectTrigger 
                    id="output-device" 
                    className="bg-[#252525] border-[#333333] focus:ring-[#FF7A00] focus:border-[#FF7A00]"
                  >
                    <SelectValue placeholder="Select output device" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-[#333333]">
                    {outputDevices.length === 0 ? (
                      <SelectItem value="no-devices">No output devices found</SelectItem>
                    ) : (
                      outputDevices.map(device => (
                        <SelectItem 
                          key={device.deviceId} 
                          value={device.deviceId}
                          className="focus:bg-[#252525]"
                        >
                          {device.label || `Output Device ${device.deviceId.slice(0, 5)}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="output-volume" className="text-xs text-[#999999]">
                    Output Volume
                  </Label>
                  <span className="text-xs text-[#999999]">{outputVolume}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume className="w-4 h-4 text-[#999999]" />
                  <Slider
                    id="output-volume"
                    value={[outputVolume]}
                    min={0}
                    max={100}
                    step={1}
                    disabled={isOutputMuted}
                    onValueChange={(value) => setOutputVolume(value[0])}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            
            {/* Advanced Settings */}
            <div className="space-y-4">
              <h3 className="text-xs font-medium text-[#FF7A00] uppercase">Advanced Settings</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sample-rate" className="text-xs text-[#999999] mb-1 block">
                    Sample Rate
                  </Label>
                  <Select value={sampleRate} onValueChange={setSampleRate}>
                    <SelectTrigger 
                      id="sample-rate" 
                      className="bg-[#252525] border-[#333333] focus:ring-[#FF7A00] focus:border-[#FF7A00]"
                    >
                      <SelectValue placeholder="Sample Rate" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[#333333]">
                      {sampleRateOptions.map(rate => (
                        <SelectItem 
                          key={rate} 
                          value={rate}
                          className="focus:bg-[#252525]"
                        >
                          {rate} Hz
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="buffer-size" className="text-xs text-[#999999] mb-1 block">
                    Buffer Size
                  </Label>
                  <Select value={bufferSize} onValueChange={setBufferSize}>
                    <SelectTrigger 
                      id="buffer-size" 
                      className="bg-[#252525] border-[#333333] focus:ring-[#FF7A00] focus:border-[#FF7A00]"
                    >
                      <SelectValue placeholder="Buffer Size" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[#333333]">
                      {bufferSizeOptions.map(size => (
                        <SelectItem 
                          key={size} 
                          value={size}
                          className="focus:bg-[#252525]"
                        >
                          {size} samples
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="flex items-center">
                  <Laptop className="w-4 h-4 mr-2 text-[#999999]" />
                  Low Latency Mode
                </Label>
                <Switch 
                  className="data-[state=checked]:bg-[#FF7A00]"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="flex items-center">
                  <HardDrive className="w-4 h-4 mr-2 text-[#999999]" />
                  Disk Streaming
                </Label>
                <Switch 
                  defaultChecked 
                  className="data-[state=checked]:bg-[#FF7A00]"
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-[#252525] text-white text-sm rounded-md hover:bg-[#333333] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Apply changes to audio engine
                  onClose();
                }}
                className="px-3 py-1.5 bg-[#FF7A00] text-white text-sm rounded-md hover:bg-[#CC6200] transition-colors"
              >
                Apply Changes
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}