import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Sample } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';

export default function SoundLibrary() {
  const [category, setCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSamples, setFilteredSamples] = useState<Sample[]>([]);
  
  // Query to get samples
  const { data: samples, isLoading } = useQuery({
    queryKey: ['/api/samples', { category }],
    enabled: true,
  });
  
  // Apply search filter
  useEffect(() => {
    if (samples) {
      if (!searchTerm) {
        setFilteredSamples(samples);
      } else {
        const search = searchTerm.toLowerCase();
        setFilteredSamples(
          samples.filter(sample => 
            sample.name.toLowerCase().includes(search) ||
            sample.category.toLowerCase().includes(search) ||
            (sample.tags && sample.tags.some(tag => tag.toLowerCase().includes(search)))
          )
        );
      }
    }
  }, [samples, searchTerm]);
  
  const handlePlaySample = (sample: Sample) => {
    // In a real app, this would play the sample using Web Audio API or Tone.js
    console.log('Playing sample:', sample.name);
  };
  
  const handleDragStart = (e: React.DragEvent, sample: Sample) => {
    e.dataTransfer.setData('application/json', JSON.stringify(sample));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="plugin-module">
      <div className="bg-gradient-to-r from-fathom-darkgray to-fathom-gray p-2 flex justify-between items-center">
        <h3 className="text-fathom-teal font-medium">Sound Library</h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-fathom-text-secondary" />
          <input 
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-fathom-gray text-xs py-1 pl-7 pr-2 w-24 rounded border border-fathom-lightgray focus:outline-none focus:border-fathom-teal"
          />
        </div>
      </div>
      
      <div className="p-2">
        <div className="flex space-x-2 mb-2">
          <button 
            className={`text-xs px-2 py-1 rounded ${!category ? 'bg-fathom-teal text-black' : 'bg-fathom-gray text-white hover:bg-fathom-lightgray'}`}
            onClick={() => setCategory(null)}
          >
            All
          </button>
          <button 
            className={`text-xs px-2 py-1 rounded ${category === 'Drums' ? 'bg-fathom-teal text-black' : 'bg-fathom-gray text-white hover:bg-fathom-lightgray'}`}
            onClick={() => setCategory('Drums')}
          >
            Drums
          </button>
          <button 
            className={`text-xs px-2 py-1 rounded ${category === 'Synth' ? 'bg-fathom-teal text-black' : 'bg-fathom-gray text-white hover:bg-fathom-lightgray'}`}
            onClick={() => setCategory('Synth')}
          >
            Synth
          </button>
          <button 
            className={`text-xs px-2 py-1 rounded ${category === 'Bass' ? 'bg-fathom-teal text-black' : 'bg-fathom-gray text-white hover:bg-fathom-lightgray'}`}
            onClick={() => setCategory('Bass')}
          >
            Bass
          </button>
        </div>
      </div>
      
      <div className="p-2 space-y-2 max-h-60 overflow-y-auto">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))
        ) : filteredSamples && filteredSamples.length > 0 ? (
          filteredSamples.map((sample) => (
            <div 
              key={sample.id} 
              className="flex items-center p-2 hover:bg-fathom-gray hover:bg-opacity-30 rounded cursor-pointer"
              onClick={() => handlePlaySample(sample)}
              draggable
              onDragStart={(e) => handleDragStart(e, sample)}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-fathom-orange-dark to-fathom-orange rounded flex-shrink-0 overflow-hidden">
                {/* Waveform preview */}
                <svg width="100%" height="100%" viewBox="0 0 32 32" preserveAspectRatio="none">
                  <path 
                    d="M0,16 Q2,8 4,12 T8,20 T12,12 T16,16 T20,8 T24,12 T28,20 T32,12" 
                    stroke="#FFC499" 
                    fill="none" 
                    strokeWidth="1.5" 
                  />
                </svg>
              </div>
              <div className="ml-2 flex-1">
                <div className="text-xs font-medium">{sample.name}</div>
                <div className="text-xs text-fathom-text-secondary">
                  {sample.tempo ? `${sample.tempo} BPM` : ''} {sample.key ? `${sample.key}` : ''}
                </div>
              </div>
              <div className="text-xs text-fathom-teal">
                {sample.id.toString(36).toUpperCase()}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-fathom-text-secondary">
            {searchTerm ? 'No matching samples found' : 'No samples available'}
          </div>
        )}
      </div>
    </div>
  );
}
