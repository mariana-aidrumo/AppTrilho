
"use client";

import { useEffect, useState } from 'react';

const MOBILE_SCREEN_QUERY = "(max-width: 768px)";

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(MOBILE_SCREEN_QUERY);
    
    const listener = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Set the initial state
    setIsMobile(mediaQueryList.matches);

    mediaQueryList.addEventListener('change', listener);
    
    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }, []);

  return isMobile;
}
