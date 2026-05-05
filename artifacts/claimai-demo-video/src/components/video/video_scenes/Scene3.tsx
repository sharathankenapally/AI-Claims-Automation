import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
      setTimeout(() => setPhase(4), 4500),
      setTimeout(() => setPhase(5), 6000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const agents = ['Intake', 'Clinical NLP', 'Coding', 'Optimization', 'Submission', 'Monitoring', 'Denials', 'Reconciliation'];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center px-[10vw]"
      {...sceneTransitions.clipPolygon}
    >
      <motion.div 
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
      >
        <h2 className="text-5xl font-bold text-white">8-Agent <span className="text-accent">Pipeline</span></h2>
        <p className="text-text-secondary text-xl mt-4">Predictive risk scoring & auto-optimization</p>
      </motion.div>

      <div className="flex w-full items-center justify-center gap-4 relative">
        {agents.map((agent, i) => (
          <motion.div
            key={i}
            className="flex flex-col items-center z-10"
            initial={{ opacity: 0, y: 30 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ delay: i * 0.1, type: 'spring', stiffness: 300 }}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 ${
              i === 3 && phase >= 2 ? 'border-warning bg-warning/20 text-warning' : 
              'border-white/10 bg-bg-muted text-white'
            }`}>
              {i+1}
            </div>
            <span className="text-xs text-text-secondary mt-3 font-mono text-center w-20 leading-tight">
              {agent}
            </span>
          </motion.div>
        ))}

        {/* Connecting Line */}
        <div className="absolute top-8 left-8 right-8 h-[2px] bg-white/10 -z-10" />
        <motion.div 
          className="absolute top-8 left-8 h-[2px] bg-accent -z-10 shadow-[0_0_10px_#14B8A6]"
          initial={{ width: '0%' }}
          animate={phase >= 1 ? { width: '100%' } : { width: '0%' }}
          transition={{ duration: 2, ease: "linear", delay: 0.5 }}
        />
      </div>

      {/* Risk Score Popup */}
      <motion.div 
        className="mt-16 bg-bg-muted/80 border border-white/10 rounded-2xl p-8 flex items-center gap-12 w-[800px]"
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={phase >= 2 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 40 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <div className="flex flex-col items-center">
          <span className="text-text-secondary font-mono mb-2 uppercase text-sm">Denial Risk</span>
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="64" cy="64" r="60" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
              <motion.circle 
                cx="64" cy="64" r="60" 
                stroke={phase >= 4 ? "var(--color-success)" : "var(--color-warning)"} 
                strokeWidth="8" fill="none" 
                strokeDasharray="377"
                initial={{ strokeDashoffset: 377 }}
                animate={{ strokeDashoffset: phase >= 4 ? 377 - (377 * 0.12) : 377 - (377 * 0.78) }}
                transition={{ duration: 1.5, ease: "circOut" }}
              />
            </svg>
            <span className="text-3xl font-bold font-mono text-white">
              {phase >= 4 ? '12%' : '78%'}
            </span>
          </div>
        </div>

        <div className="flex-1">
          {phase < 4 ? (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-2 text-warning mb-2 font-bold">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                High Risk Detected
              </div>
              <p className="text-text-secondary text-sm">Missing modifier 25 for CPT 80053. Payer typically denies this combination.</p>
              
              <motion.div 
                className="mt-4 bg-warning/10 border border-warning/30 rounded p-2 text-warning text-xs font-mono flex items-center gap-2"
                initial={{ opacity: 0 }} animate={phase >= 3 ? { opacity: 1 } : {}}
              >
                <div className="w-2 h-2 rounded-full bg-warning animate-ping" />
                Auto-Fix Loop Initiated...
              </motion.div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-2 text-success mb-2 font-bold">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                Claim Optimized
              </div>
              <p className="text-text-secondary text-sm">Modifier 25 added. Documentation linked. Ready for submission.</p>
              <div className="mt-4 bg-success/10 border border-success/30 rounded p-2 text-success text-xs font-mono">
                ✓ Risk reduced to 12%. Proceeding to Submission Agent.
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
