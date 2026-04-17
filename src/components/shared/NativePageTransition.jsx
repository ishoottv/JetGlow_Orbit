import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

const routeIndexMap = {
  "/": 0,
  "/aircraft": 1,
  "/customers": 2,
  "/flights": 3,
  "/maintenance": 4,
  "/alerts": 5,
  "/rules": 6,
  "/quotes": 7,
  "/settings": 8,
  "/aircraft/archived": 1.1,
};

/**
 * NativePageTransition provides push/pop animation based on navigation direction.
 * Deeper routes animate in from the right (push), shallower routes animate out to the right (pop).
 */
export default function NativePageTransition({ children }) {
  const location = useLocation();
  const prevIndex = useRef(0);

  const currentIndex = routeIndexMap[location.pathname] ?? 99;
  const direction = currentIndex > prevIndex.current ? "push" : "pop";
  prevIndex.current = currentIndex;

  const variants = {
    push: {
      initial: { x: "100%", opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: "-30%", opacity: 0 },
    },
    pop: {
      initial: { x: "-30%", opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: "100%", opacity: 0 },
    },
  };

  const variant = variants[direction];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={variant.initial}
        animate={variant.animate}
        exit={variant.exit}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        style={{ width: "100%", height: "100%" }}
        className="flex flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}