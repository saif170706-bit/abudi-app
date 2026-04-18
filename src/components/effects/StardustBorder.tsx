'use client';

import React from "react";
import { motion } from "framer-motion";

interface StardustBorderProps {
  children: React.ReactNode;
  className?: string;
}

export default function StardustBorder({ children, className = "" }: StardustBorderProps) {
  return (
    <div className={`relative group ${className}`}>
      {/* Animated Glowing Background */}
      <motion.div
        animate={{
          scale: [1, 1.02, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -inset-1.5 bg-gradient-to-r from-accent via-primary to-accent rounded-[38px] blur-md opacity-40 group-hover:opacity-75 transition-opacity duration-500"
      />
      
      {/* Rotating Stardust Effect */}
      <div
        className="absolute inset-[0.5px] rounded-[36px] overflow-hidden pointer-events-none"
        style={{
          maskImage: "linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)",
          maskClip: "content-box, border-box",
          maskComposite: "exclude",
          padding: "2px",
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute w-[200%] h-[200%] -top-[50%] -left-[50%]"
          style={{
            background: "conic-gradient(from 0deg, transparent 0%, transparent 40%, #DEA93E 50%, transparent 60%, transparent 100%)",
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}
