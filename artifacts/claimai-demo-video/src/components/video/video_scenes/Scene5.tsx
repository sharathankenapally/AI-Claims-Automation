import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-bg-dark"
      {...sceneTransitions.zoomThrough}
    >
      <div className="relative z-10 flex items-center justify-center flex-col">
        <motion.div 
          className="flex items-center gap-4 mb-8"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.6)]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h1 className="text-7xl font-extrabold tracking-tight text-white">
            Claim<span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">AI</span>
          </h1>
        </motion.div>

        <motion.h2 
          className="text-3xl text-white font-medium mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        >
          Automate your revenue cycle.
        </motion.h2>

        <motion.div
          className="px-8 py-4 bg-white text-bg-dark font-bold rounded-full text-lg shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        >
          Start Optimizing Today
        </motion.div>
      </div>
      
      {/* Background ambient particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-accent/40"
          initial={{ 
            x: '50vw', 
            y: '50vh',
            scale: 0
          }}
          animate={phase >= 1 ? {
            x: `${Math.random() * 100}vw`,
            y: `${Math.random() * 100}vh`,
            scale: [0, Math.random() * 2 + 1, 0]
          } : {}}
          transition={{ 
            duration: Math.random() * 3 + 2, 
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut"
          }}
        />
      ))}
    </motion.div>
  );
}
