import { useEffect, useRef, useState } from "react";

export default function usePullToRefresh(onRefresh) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      startYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (isRefreshing) return;
      
      const scrollTop = container.scrollTop;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      // Only trigger pull-to-refresh when at top of scroll
      if (scrollTop === 0 && diff > 0) {
        const pullDistance = Math.min(diff, 80);
        const refreshIndicator = container.querySelector('[data-pull-indicator]');
        if (refreshIndicator) {
          refreshIndicator.style.opacity = Math.min(1, pullDistance / 60);
          refreshIndicator.style.transform = `rotate(${Math.min(360, (pullDistance / 60) * 360)}deg)`;
        }
      }
    };

    const handleTouchEnd = async (e) => {
      if (isRefreshing) return;

      const scrollTop = container.scrollTop;
      const currentY = e.changedTouches[0].clientY;
      const diff = currentY - startYRef.current;

      if (scrollTop === 0 && diff > 60) {
        setIsRefreshing(true);
        await onRefresh();
        setIsRefreshing(false);
        
        const refreshIndicator = container.querySelector('[data-pull-indicator]');
        if (refreshIndicator) {
          refreshIndicator.style.opacity = "0";
          refreshIndicator.style.transform = "rotate(0deg)";
        }
      }
    };

    container.addEventListener("touchstart", handleTouchStart);
    container.addEventListener("touchmove", handleTouchMove);
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isRefreshing, onRefresh]);

  return { containerRef, isRefreshing };
}