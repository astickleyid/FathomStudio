import { useState, useRef, useEffect } from 'react';

type EQPoint = {
  x: number;
  y: number;
  frequency: number;
  gain: number;
  q: number;
  color: string;
};

export default function EQModule() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [points, setPoints] = useState<EQPoint[]>([
    { x: 20, y: 60, frequency: 100, gain: -2, q: 0.7, color: '#A64AFF' },  // Low
    { x: 40, y: 20, frequency: 500, gain: 3, q: 1, color: '#00E5CC' },     // Mid
    { x: 60, y: 80, frequency: 2000, gain: -6, q: 2, color: '#00E5CC' },   // Mid-Hi
    { x: 80, y: 30, frequency: 8000, gain: 4, q: 0.5, color: '#3F8CFF' },  // High
  ]);
  const [path, setPath] = useState<string>('');
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  
  // Generate SVG path from points
  useEffect(() => {
    const generatePath = () => {
      // Use bezier curve to make a smooth line through all points
      let newPath = `M0,60 `;
      
      // Add first point
      newPath += `C${points[0].x / 2},60 ${points[0].x / 2},${points[0].y} ${points[0].x},${points[0].y} `;
      
      // Add middle points
      for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];
        const cpDistance = (next.x - current.x) / 2;
        
        newPath += `S${current.x + cpDistance},${current.y} ${next.x},${next.y} `;
      }
      
      // Add last segment to end of SVG
      const lastPoint = points[points.length - 1];
      newPath += `S${lastPoint.x + (100 - lastPoint.x) / 2},${lastPoint.y} 100,60`;
      
      return newPath;
    };
    
    setPath(generatePath());
  }, [points]);
  
  // Handle point drag
  const handlePointMouseDown = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setActivePointIndex(index);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (activePointIndex === null || !svgRef.current) return;
      
      const svgRect = svgRef.current.getBoundingClientRect();
      const x = ((moveEvent.clientX - svgRect.left) / svgRect.width) * 100;
      const y = ((moveEvent.clientY - svgRect.top) / svgRect.height) * 100;
      
      // Keep x within boundaries of its neighbors, and clamp y
      const newX = Math.max(
        index === 0 ? 0 : points[index - 1].x + 5,
        Math.min(index === points.length - 1 ? 100 : points[index + 1].x - 5, x)
      );
      const newY = Math.max(0, Math.min(100, y));
      
      // Calculate actual EQ parameters based on position
      const frequency = Math.round(20 * Math.pow(1000, newX / 100));
      const gain = 12 - (newY / 100) * 24; // Range: -12dB to +12dB
      
      setPoints(points.map((p, i) => 
        i === index 
          ? { ...p, x: newX, y: newY, frequency, gain } 
          : p
      ));
    };
    
    const handleMouseUp = () => {
      setActivePointIndex(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="plugin-module">
      <div className="bg-gradient-to-r from-fathom-darkgray to-fathom-gray p-2 flex justify-between items-center">
        <h3 className="text-fathom-orange font-medium">EQ</h3>
        <button className="w-5 h-5 rounded bg-fathom-gray flex items-center justify-center text-xs">×</button>
      </div>
      
      <div className="p-3">
        <div className="eq-curve mb-2">
          <svg ref={svgRef} width="100%" height="100%" className="eq-line">
            <defs>
              <linearGradient id="eqGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#A64AFF" />
                <stop offset="50%" stopColor="#00E5CC" />
                <stop offset="100%" stopColor="#3F8CFF" />
              </linearGradient>
            </defs>
            <path d={path} stroke="url(#eqGradient)" strokeWidth="2" fill="none" />
          </svg>
          
          {points.map((point, index) => (
            <div
              key={index}
              className="eq-point"
              style={{ 
                left: `${point.x}%`, 
                top: `${point.y}%`, 
                backgroundColor: point.color,
                cursor: 'grab',
                zIndex: activePointIndex === index ? 20 : 10
              }}
              onMouseDown={handlePointMouseDown(index)}
            ></div>
          ))}
        </div>
        
        <div className="grid grid-cols-4 gap-2 mt-4">
          {points.map((point, index) => (
            <div key={index} className="text-center">
              <div className={`text-xs mb-1`} style={{ color: point.color }}>
                {index === 0 ? 'Low' : index === 1 ? 'Mid' : index === 2 ? 'Mid-Hi' : 'High'}
              </div>
              <div className="text-xs">{point.frequency < 1000 ? point.frequency : `${(point.frequency / 1000).toFixed(1)}k`} Hz</div>
              <div className="text-xs text-fathom-text-secondary">{point.gain.toFixed(1)} dB</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
