import { useState, useRef, useEffect } from 'react';

interface FaderProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  color?: 'orange' | 'teal' | 'purple' | 'blue';
  height?: number;
}

export default function Fader({ 
  value, 
  min, 
  max, 
  onChange, 
  color = 'orange',
  height = 120
}: FaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const faderRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(value);
  
  // Map value to position (0 = top, 1 = bottom)
  const getPosition = () => {
    const range = max - min;
    const percentage = (value - min) / range;
    return (1 - percentage) * 100;
  };
  
  // Get border color based on color prop
  const getBorderColor = () => {
    switch (color) {
      case 'orange': return 'border-fathom-orange';
      case 'teal': return 'border-fathom-teal';
      case 'purple': return 'border-fathom-purple';
      case 'blue': return 'border-fathom-blue';
      default: return 'border-fathom-orange';
    }
  };
  
  // Get accent color for handle
  const getAccentColor = () => {
    switch (color) {
      case 'orange': return 'bg-fathom-orange';
      case 'teal': return 'bg-fathom-teal';
      case 'purple': return 'bg-fathom-purple';
      case 'blue': return 'bg-fathom-blue';
      default: return 'bg-fathom-orange';
    }
  };
  
  // Format value for display
  const getDisplayValue = () => {
    if (value === 0) return '0dB';
    if (value > 0) return `+${value.toFixed(1)}dB`;
    return `${value.toFixed(1)}dB`;
  };
  
  // Handle mouse down event
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Handle mouse move event
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || startYRef.current === null || !faderRef.current) return;
    
    const faderHeight = faderRef.current.clientHeight;
    const deltaY = e.clientY - startYRef.current;
    const deltaPercentage = deltaY / faderHeight;
    const range = max - min;
    const newValue = startValueRef.current - deltaPercentage * range;
    
    // Clamp value between min and max
    const clampedValue = Math.min(max, Math.max(min, newValue));
    onChange(clampedValue);
  };
  
  // Handle mouse up event
  const handleMouseUp = () => {
    setIsDragging(false);
    startYRef.current = null;
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="relative h-24 flex items-center">
      <div 
        ref={faderRef}
        className="fader"
        style={{ height: `${height}px` }}
      >
        <div 
          className={`fader-handle ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ top: `${getPosition()}%` }}
          onMouseDown={handleMouseDown}
        >
          <div className={`w-full h-1 rounded-full ${getAccentColor()}`}></div>
        </div>
      </div>
      <div className="text-xs text-fathom-text-secondary ml-2 w-10">{getDisplayValue()}</div>
    </div>
  );
}
