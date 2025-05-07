import { useRef, useEffect, useState } from 'react';

// Define gesture types
export type GestureType = 'swipe-left' | 'swipe-right' | 'swipe-up' | 'swipe-down' | 'pinch-in' | 'pinch-out' | 'tap' | 'double-tap';

interface GestureState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  distanceX: number;
  distanceY: number;
  pinchDistance: number | null;
  startTime: number;
  isGesturing: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
}

interface GestureCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchIn?: (scale: number) => void;
  onPinchOut?: (scale: number) => void;
  onTap?: (position: { x: number; y: number }) => void;
  onDoubleTap?: (position: { x: number; y: number }) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}

interface UseGesturesOptions {
  swipeThreshold?: number;
  pinchThreshold?: number;
  doubleTapDelay?: number;
  longPressDelay?: number;
  preventDefaultTouchMove?: boolean;
}

const DEFAULT_OPTIONS: UseGesturesOptions = {
  swipeThreshold: 60,
  pinchThreshold: 0.15, // 15% change in distance
  doubleTapDelay: 300,
  longPressDelay: 500,
  preventDefaultTouchMove: true,
};

export function useGestures(
  elementRef: React.RefObject<HTMLElement>,
  callbacks: GestureCallbacks,
  options: UseGesturesOptions = {}
) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const [lastGesture, setLastGesture] = useState<GestureType | null>(null);
  const gestureStateRef = useRef<GestureState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    distanceX: 0,
    distanceY: 0,
    pinchDistance: null,
    startTime: 0,
    isGesturing: false,
  });
  
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPositionRef = useRef<TouchPoint | null>(null);
  
  // Calculate distance between two touch points
  const getDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touches = e.touches;
      
      // Store current time for tap detection
      const now = Date.now();
      
      if (touches.length === 1) {
        // Single touch - potential swipe or tap
        const touch = touches[0];
        gestureStateRef.current = {
          startX: touch.clientX,
          startY: touch.clientY,
          currentX: touch.clientX,
          currentY: touch.clientY,
          distanceX: 0,
          distanceY: 0,
          pinchDistance: null,
          startTime: now,
          isGesturing: true,
        };
        
        // Double tap detection
        if (
          lastTapPositionRef.current &&
          now - lastTapTimeRef.current < mergedOptions.doubleTapDelay!
        ) {
          const tapX = lastTapPositionRef.current.x;
          const tapY = lastTapPositionRef.current.y;
          const dx = touch.clientX - tapX;
          const dy = touch.clientY - tapY;
          
          // If the tap is close to the previous tap
          if (Math.sqrt(dx * dx + dy * dy) < 20) {
            callbacks.onDoubleTap?.({ x: touch.clientX, y: touch.clientY });
            setLastGesture('double-tap');
            
            // Reset tap tracking
            lastTapTimeRef.current = 0;
            lastTapPositionRef.current = null;
            return;
          }
        }
        
        // Store tap data for potential double tap
        lastTapTimeRef.current = now;
        lastTapPositionRef.current = { x: touch.clientX, y: touch.clientY };
      } 
      else if (touches.length === 2) {
        // Pinch gesture
        const touch1 = touches[0];
        const touch2 = touches[1];
        
        // Calculate the midpoint
        const midX = (touch1.clientX + touch2.clientX) / 2;
        const midY = (touch1.clientY + touch2.clientY) / 2;
        
        gestureStateRef.current = {
          startX: midX,
          startY: midY,
          currentX: midX,
          currentY: midY,
          distanceX: 0,
          distanceY: 0,
          pinchDistance: getDistance(touch1, touch2),
          startTime: now,
          isGesturing: true,
        };
      }
      
      callbacks.onGestureStart?.();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!gestureStateRef.current.isGesturing) return;
      
      if (mergedOptions.preventDefaultTouchMove) {
        e.preventDefault();
      }
      
      const touches = e.touches;
      
      if (touches.length === 1) {
        // Handle swipe movement
        const touch = touches[0];
        const gs = gestureStateRef.current;
        
        gs.currentX = touch.clientX;
        gs.currentY = touch.clientY;
        gs.distanceX = gs.currentX - gs.startX;
        gs.distanceY = gs.currentY - gs.startY;
      } 
      else if (touches.length === 2) {
        // Handle pinch movement
        const touch1 = touches[0];
        const touch2 = touches[1];
        const gs = gestureStateRef.current;
        
        // Calculate current pinch distance
        const currentDistance = getDistance(touch1, touch2);
        
        if (gs.pinchDistance !== null) {
          const scale = currentDistance / gs.pinchDistance;
          
          // Check if pinch has crossed threshold
          if (scale < 1 - mergedOptions.pinchThreshold!) {
            callbacks.onPinchIn?.(scale);
            setLastGesture('pinch-in');
          } 
          else if (scale > 1 + mergedOptions.pinchThreshold!) {
            callbacks.onPinchOut?.(scale);
            setLastGesture('pinch-out');
          }
        }
        
        // Update midpoint
        gs.currentX = (touch1.clientX + touch2.clientX) / 2;
        gs.currentY = (touch1.clientY + touch2.clientY) / 2;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!gestureStateRef.current.isGesturing) return;
      
      const gs = gestureStateRef.current;
      const duration = Date.now() - gs.startTime;
      const isQuickGesture = duration < 300; // Swipes should be quick
      
      // Process swipe gestures
      if (Math.abs(gs.distanceX) > mergedOptions.swipeThreshold! || 
          Math.abs(gs.distanceY) > mergedOptions.swipeThreshold!) {
        
        // Determine if it's a horizontal or vertical swipe
        if (Math.abs(gs.distanceX) > Math.abs(gs.distanceY)) {
          // Horizontal swipe
          if (gs.distanceX > 0) {
            callbacks.onSwipeRight?.();
            setLastGesture('swipe-right');
          } else {
            callbacks.onSwipeLeft?.();
            setLastGesture('swipe-left');
          }
        } else {
          // Vertical swipe
          if (gs.distanceY > 0) {
            callbacks.onSwipeDown?.();
            setLastGesture('swipe-down');
          } else {
            callbacks.onSwipeUp?.();
            setLastGesture('swipe-up');
          }
        }
      } 
      // Detect tap if no significant movement and not a double tap
      else if (Math.abs(gs.distanceX) < 10 && Math.abs(gs.distanceY) < 10 && e.touches.length === 0) {
        const now = Date.now();
        // Only trigger tap if it's not going to be part of a double tap
        if (now - lastTapTimeRef.current > mergedOptions.doubleTapDelay!) {
          callbacks.onTap?.({ x: gs.currentX, y: gs.currentY });
          setLastGesture('tap');
        }
      }
      
      // Reset gesture state
      gestureStateRef.current.isGesturing = false;
      callbacks.onGestureEnd?.();
    };

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: !mergedOptions.preventDefaultTouchMove });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);

    // Cleanup
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [callbacks, mergedOptions]);

  return { lastGesture };
}