import { useState, useEffect } from 'react';

/**
 * Returns the visual viewport dimensions and offset.
 * On mobile, when the keyboard opens, visualViewport.height shrinks so the
 * chat container can use this height and keep the input bar above the keyboard.
 */
export function useVisualViewport() {
  const [viewport, setViewport] = useState(() => {
    if (typeof window === 'undefined') return { height: 0, offsetTop: 0 };
    const vv = window.visualViewport;
    return {
      height: vv?.height ?? window.innerHeight,
      offsetTop: vv?.offsetTop ?? 0,
    };
  });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      setViewport({
        height: vv.height,
        offsetTop: vv.offsetTop,
      });
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return viewport;
}
