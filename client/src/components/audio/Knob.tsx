import { useState, useRef, useEffect } from 'react';

interface KnobProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  color?: 'orange' | 'teal' | 'purple' | 'blue';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Knob({ 
  value, 
  min, 
  max, 
  onChange, 
  color = 'orange',
  label,
  size = 'md'
}: KnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(value);
  
  // Map value to rotation (from -150 to 150 degrees)
  const getRotation = () => {
    const range = max - min;
    const percentage = (value - min) / range;
    return -150 + percentage * 300;
  };
  
  // Get color class based on color prop
  const getColorClass = () => {
    switch (color) {
      case 'orange': return 'text-fathom-orange';
      case 'teal': return 'text-fathom-teal';
      case 'purple': return 'text-fathom-purple';
      case 'blue': return 'text-fathom-blue';
      default: return 'text-fathom-orange';
    }
  };
  
  // Get glow gradient based on color prop
  const getGlowGradient = () => {
    switch (color) {
      case 'orange': return 'radial-gradient(circle, rgba(255, 122, 0, 0.2) 0%, rgba(255, 122, 0, 0) 70%)';
      case 'teal': return 'radial-gradient(circle, rgba(0, 229, 204, 0.2) 0%, rgba(0, 229, 204, 0) 70%)';
      case 'purple': return 'radial-gradient(circle, rgba(166, 74, 255, 0.2) 0%, rgba(166, 74, 255, 0) 70%)';
      case 'blue': return 'radial-gradient(circle, rgba(63, 140, 255, 0.2) 0%, rgba(63, 140, 255, 0) 70%)';
      default: return 'radial-gradient(circle, rgba(255, 122, 0, 0.2) 0%, rgba(255, 122, 0, 0) 70%)';
    }
  };
  
  // Get size class based on size prop
  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'w-10 h-10';
      case 'md': return 'w-14 h-14';
      case 'lg': return 'w-16 h-16';
      default: return 'w-14 h-14';
    }
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
    if (!isDragging || startYRef.current === null) return;
    
    const deltaY = startYRef.current - e.clientY;
    const range = max - min;
    const newValue = startValueRef.current + (deltaY / 100) * range;
    
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
    <div className="flex flex-col items-center">
      <div 
        ref={knobRef}
        className={`knob ${getSizeClass()} ${getColorClass()} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
      >
        <div 
          className="knob-glow" 
          style={{ 
            background: getGlowGradient(),
            opacity: isDragging ? 0.7 : 0.3
          }}
        ></div>
        <div className="knob-circle">
          <div 
            className="knob-indicator bg-current" 
            style={{ transform: `translateX(-50%) rotate(${getRotation()}deg)` }}
          ></div>
        </div>
      </div>
      
      {label && (
        <div className="text-xs text-center mt-1 text-white">{label}</div>
      )}
    </div>
  );
}
