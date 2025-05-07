import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Custom hook to detect if the screen size is mobile
 * @returns Boolean indicating if device is mobile size
 */
export function useMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/**
 * Custom hook to set up touch gesture handling on a track element
 * 
 * @param trackRef Ref to the track DOM element
 * @param trackId ID of the track
 * @param handlers Object containing gesture event handlers
 * @returns Object with gesture state
 */
export function useTrackGestures(
  trackRef: React.RefObject<HTMLDivElement>,
  trackId: number | undefined,
  handlers: {
    onTap?: () => void;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
  }
) {
  const [gestureState, setGestureState] = React.useState<string | null>(null);
  const isMobile = useMobile();

  React.useEffect(() => {
    if (!trackRef.current || !isMobile || trackId === undefined) return;
    
    const element = trackRef.current;
    let startX = 0;
    let startY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - startX;
      const deltaY = e.changedTouches[0].clientY - startY;
      
      // Detect tap
      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        if (handlers.onTap) {
          handlers.onTap();
        }
        return;
      }
      
      // Determine swipe direction
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
      
      if (isHorizontal && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          // Swipe right
          setGestureState('swipe-right');
          if (handlers.onSwipeRight) {
            handlers.onSwipeRight();
          }
        } else {
          // Swipe left
          setGestureState('swipe-left');
          if (handlers.onSwipeLeft) {
            handlers.onSwipeLeft();
          }
        }
      } else if (!isHorizontal && Math.abs(deltaY) > 50) {
        if (deltaY > 0) {
          // Swipe down
          setGestureState('swipe-down');
          if (handlers.onSwipeDown) {
            handlers.onSwipeDown();
          }
        } else {
          // Swipe up
          setGestureState('swipe-up');
          if (handlers.onSwipeUp) {
            handlers.onSwipeUp();
          }
        }
      }
      
      // Reset gesture state after animation
      if (gestureState) {
        setTimeout(() => {
          setGestureState(null);
        }, 500);
      }
    };
    
    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchend', handleTouchEnd);
    
    // Clean up
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [trackRef, trackId, isMobile, handlers, gestureState]);
  
  return {
    gestureState,
    isGesturing: gestureState !== null
  };
}
