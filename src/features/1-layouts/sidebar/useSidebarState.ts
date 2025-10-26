
import { useState, useEffect, useCallback, useRef } from "react";
import { useSidebar } from "@/features/ui/sidebar";

const SIDEBAR_STORAGE_KEY = "sidebar-state";
const MAIN_SIDEBAR_DELAY = 200;
const SUB_SIDEBAR_DELAY = 100;

export const useSidebarState = () => {
  const { setOpen } = useSidebar();
  const [activeSubSidebar, setActiveSubSidebar] = useState<string | null>(null);
  
  const timeoutsRef = useRef<{
    mainSidebar: NodeJS.Timeout | null;
    subSidebar: NodeJS.Timeout | null;
  }>({
    mainSidebar: null,
    subSidebar: null,
  });

  // Removed persistence: sub-sidebar defaults to closed on reload


  // Optimized cleanup function
  const clearTimeouts = useCallback(() => {
    if (timeoutsRef.current.mainSidebar) {
      clearTimeout(timeoutsRef.current.mainSidebar);
      timeoutsRef.current.mainSidebar = null;
    }
    if (timeoutsRef.current.subSidebar) {
      clearTimeout(timeoutsRef.current.subSidebar);
      timeoutsRef.current.subSidebar = null;
    }
  }, []);

  const handleSubSidebarChange = useCallback((subSidebar: string | null) => {
    setActiveSubSidebar(subSidebar);
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearTimeouts();
    setOpen(true);
  }, [setOpen, clearTimeouts]);

  const handleMouseLeave = useCallback(() => {
    clearTimeouts();
    
    timeoutsRef.current.mainSidebar = setTimeout(() => {
      setOpen(false);
    }, MAIN_SIDEBAR_DELAY);

    timeoutsRef.current.subSidebar = setTimeout(() => {
      setActiveSubSidebar(null);
    }, SUB_SIDEBAR_DELAY);
  }, [setOpen, clearTimeouts]);

  const handleMenuItemHover = useCallback((itemTitle: string, hasSubSidebar: boolean) => {
    clearTimeouts();
    
    if (hasSubSidebar) {
      timeoutsRef.current.subSidebar = setTimeout(() => {
        setActiveSubSidebar(itemTitle);
      }, SUB_SIDEBAR_DELAY);
    } else {
      setActiveSubSidebar(null);
    }
  }, [clearTimeouts]);

  const handleSubSidebarMouseEnter = useCallback(() => {
    clearTimeouts();
    setOpen(true);
  }, [clearTimeouts, setOpen]);

  const handleSubSidebarMouseLeave = useCallback(() => {
    clearTimeouts();
    
    timeoutsRef.current.subSidebar = setTimeout(() => {
      setActiveSubSidebar(null);
    }, SUB_SIDEBAR_DELAY);
    
    timeoutsRef.current.mainSidebar = setTimeout(() => {
      setOpen(false);
    }, MAIN_SIDEBAR_DELAY);
  }, [clearTimeouts, setOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  return {
    activeSubSidebar,
    handleSubSidebarChange,
    handleMouseEnter,
    handleMouseLeave,
    handleMenuItemHover,
    handleSubSidebarMouseEnter,
    handleSubSidebarMouseLeave,
  };
};

