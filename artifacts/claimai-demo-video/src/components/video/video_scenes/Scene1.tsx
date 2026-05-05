import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      {...sceneTransitions.morphExpand}
    >
      <div className="relative z-10 flex items-center justify-center flex-col" style={{ perspective: 1000 }}>
        <motion.div 
          className="flex items-center gap-4 mb-6"
          initial={{ opacity: 0, scale: 0.8, rotateX: -30 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1, rotateX: 0 } : { opacity: 0, scale: 0.8, rotateX: -30 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-[0_0_40px_rgba(20,184,166,0.4)]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h1 className="text-6xl font-extrabold tracking-tight text-white">
            Claim<span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">AI</span>
          </h1>
        </motion.div>

        <motion.p 
          className="text-2xl text-text-secondary font-medium tracking-wide"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          The end of medical claim denials.
        </motion.p>
      </div>
    </motion.div>
  );
}
