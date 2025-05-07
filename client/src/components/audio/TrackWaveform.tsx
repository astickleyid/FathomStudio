import { useState, useEffect, useRef } from 'react';
import { Track, Clip } from '@shared/schema';

interface TrackWaveformProps {
  track: Track;
  clips: Clip[];
  zoom: number;
}

export default function TrackWaveform({ track, clips, zoom }: TrackWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trackHeight] = useState(80);
  
  // Draw waveform on canvas when clips change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas dimensions
    canvas.width = canvas.clientWidth;
    canvas.height = trackHeight;
    
    // Draw background
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw reference grid
    ctx.strokeStyle = 'rgba(51, 51, 51, 0.5)';
    ctx.lineWidth = 1;
    
    const gridSize = 40 * zoom;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Draw clips
    clips.forEach(clip => {
      // Calculate clip positions based on start time and duration
      const clipStartX = (clip.startTime / 44100) * 100 * zoom;
      const clipWidth = (clip.duration / 44100) * 100 * zoom;
      
      // Draw clip background
      ctx.fillStyle = 'rgba(255, 122, 0, 0.3)';
      ctx.fillRect(clipStartX, 0, clipWidth, canvas.height);
      
      // Draw clip border
      ctx.strokeStyle = 'rgba(255, 122, 0, 0.6)';
      ctx.strokeRect(clipStartX, 0, clipWidth, canvas.height);
      
      // Draw clip name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px Inter';
      ctx.fillText(clip.name || 'Clip', clipStartX + 4, 12);
      
      // Draw waveform if waveformData exists
      if (clip.waveformData) {
        const waveform = typeof clip.waveformData === 'string' 
          ? JSON.parse(clip.waveformData) 
          : clip.waveformData;
        
        if (Array.isArray(waveform)) {
          const waveformHeight = canvas.height * 0.6;
          const centerY = canvas.height / 2;
          
          ctx.beginPath();
          ctx.strokeStyle = '#FF7A00';
          ctx.lineWidth = 1.5;
          
          waveform.forEach((sample, i) => {
            const x = clipStartX + (i / waveform.length) * clipWidth;
            const y = centerY - (sample * waveformHeight / 2);
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });
          
          // Draw the bottom half of the waveform (mirror)
          for (let i = waveform.length - 1; i >= 0; i--) {
            const x = clipStartX + (i / waveform.length) * clipWidth;
            const y = centerY + (waveform[i] * waveformHeight / 2);
            ctx.lineTo(x, y);
          }
          
          ctx.closePath();
          ctx.fillStyle = 'rgba(255, 122, 0, 0.2)';
          ctx.fill();
          ctx.stroke();
        }
      }
    });
  }, [clips, trackHeight, zoom]);

  return (
    <div className={`h-[${trackHeight}px] mb-1 flex`}>
      <div className="track-waveform ml-4 mr-4 w-full">
        <canvas 
          ref={canvasRef} 
          className="h-full w-full rounded-md"
        />
      </div>
    </div>
  );
}
