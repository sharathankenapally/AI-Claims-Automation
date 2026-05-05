import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 2500),
      setTimeout(() => setPhase(5), 5200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center px-[10vw]"
      {...sceneTransitions.wipe}
    >
      <div className="flex w-full justify-between items-center h-full pt-10">
        
        {/* Left Side: Clinical Note */}
        <motion.div 
          className="w-[45%] h-[60%] bg-bg-muted/80 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl flex flex-col"
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm font-mono text-text-muted ml-2">clinical_note_1042.txt</span>
          </div>
          <div className="font-mono text-sm leading-relaxed text-text-secondary">
            <motion.p initial={{ opacity: 0 }} animate={phase >= 1 ? { opacity: 1 } : {}} transition={{ delay: 0.5 }}>
              Patient presents with acute exacerbation of chronic obstructive pulmonary disease (COPD).
            </motion.p>
            <motion.p className="mt-4" initial={{ opacity: 0 }} animate={phase >= 1 ? { opacity: 1 } : {}} transition={{ delay: 1.5 }}>
              Performed comprehensive metabolic panel and chest X-ray. Administered Albuterol nebulizer treatment.
            </motion.p>
            <motion.div 
              className="mt-6 w-full h-[1px] bg-accent/30 relative"
              initial={{ scaleX: 0 }} animate={phase >= 2 ? { scaleX: 1 } : { scaleX: 0 }} originX={0} transition={{ duration: 1 }}
            >
              <motion.div 
                className="absolute top-0 right-0 h-[1px] w-[50px] bg-accent shadow-[0_0_10px_#14B8A6]" 
                animate={{ x: [0, -400, 0] }} transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Right Side: Extraction */}
        <div className="w-[45%] h-[60%] flex flex-col justify-center gap-6">
          <motion.h2 
            className="text-4xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          >
            Clinical NLP <span className="text-accent">Extraction</span>
          </motion.h2>

          <div className="space-y-4">
            {[
              { label: 'ICD-10', code: 'J44.1', desc: 'COPD with (acute) exacerbation', phase: 2 },
              { label: 'CPT', code: '80053', desc: 'Comprehensive metabolic panel', phase: 3 },
              { label: 'CPT', code: '71045', desc: 'Radiologic exam, chest; single view', phase: 4 },
            ].map((item, i) => (
              <motion.div 
                key={i}
                className="bg-bg-muted/50 border border-white/5 rounded-xl p-4 flex items-center gap-4"
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={phase >= item.phase ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 50, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <div className="bg-primary/20 text-primary px-3 py-1 rounded font-mono text-sm border border-primary/30">
                  {item.label}
                </div>
                <div className="font-mono text-white text-lg">{item.code}</div>
                <div className="text-text-secondary text-sm truncate">{item.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
