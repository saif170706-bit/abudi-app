'use client';

import React from "react";
import { motion } from "framer-motion";

export default function IslamicDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`islamic-divider ${className}`}>
      <div className="islamic-divider-line" />
      <motion.div 
        animate={{ rotate: 45 + 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="islamic-divider-gem" 
      />
      <div className="islamic-divider-line" />
    </div>
  );
}
