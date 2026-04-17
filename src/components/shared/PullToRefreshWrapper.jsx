import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

/**
 * PullToRefreshWrapper wraps list views with native pull-to-refresh behavior.
 * Provides visual feedback and triggers refresh callback when pulled down.
 */
export default function PullToRefreshWrapper({ onRefresh, children, isLoading = false }) {
  const containerRef = useRef(null);
  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const scrollTop = useRef(0);

  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    scrollTop.current = containerRef.current?.scrollTop ?? 0;
  };

  const handleTouchMove = (e) => {
    if (scrollTop.current !== 0) return; // Not at top, ignore

    const currentY = e.touches[0].clientY;
    const diff = Math.max(0, currentY - startY.current);
    const progress = Math.min(diff / 60, 1);
    setPullProgress(progress);
  };

  const handleTouchEnd = async () => {
    if (pullProgress >= 0.8 && !isRefreshing) {
      setIsRefreshing(true);
      setPullProgress(1);
      if (onRefresh) {
        await onRefresh();
      }
      setIsRefreshing(false);
      setPullProgress(0);
    } else {
      setPullProgress(0);
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-full"
    >
      {/* Pull indicator */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: pullProgress > 0 ? 1 : 0 }}
          className="flex items-center justify-center w-10 h-10"
        >
          <motion.div
            animate={{ rotate: isRefreshing ? 360 : pullProgress * 180 }}
            transition={{ rotate: { duration: isRefreshing ? 1 : 0, repeat: isRefreshing ? Infinity : 0 } }}
          >
            <RefreshCw className="w-5 h-5 text-primary" />
          </motion.div>
        </motion.div>
      </div>

      {/* Scrollable content */}
      {children}
    </div>
  );
}