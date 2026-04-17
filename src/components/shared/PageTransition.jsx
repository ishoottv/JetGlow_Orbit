import React from "react";
import { motion } from "framer-motion";

export default function PageTransition({ children, direction = "in" }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: direction === "in" ? 10 : -10, y: 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: direction === "out" ? 10 : -10, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}