import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 2800),
      setTimeout(() => setPhase(5), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const claims = [
    { id: 'CLM-8901', amount: '$450.00', status: 'APPROVED', time: '1s ago', color: 'success' },
    { id: 'CLM-8902', amount: '$1,200.00', status: 'DENIED', time: '3s ago', color: 'error', reason: 'COB Information Missing' },
    { id: 'CLM-8903', amount: '$320.00', status: 'APPROVED', time: '12s ago', color: 'success' },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      {...sceneTransitions.slideLeft}
    >
      <div className="w-[80%] max-w-[1000px]">
        <motion.h2 
          className="text-4xl font-bold text-white mb-8"
          initial={{ opacity: 0, x: -30 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
        >
          Real-time <span className="text-primary">Monitoring & Resolution</span>
        </motion.h2>

        <div className="flex flex-col gap-4">
          {claims.map((claim, i) => (
            <motion.div 
              key={i}
              className={`bg-bg-muted/60 border rounded-xl p-5 flex items-center justify-between shadow-lg ${
                claim.status === 'DENIED' && phase >= 4 ? 'border-primary/50 bg-primary/5' : 'border-white/5'
              }`}
              initial={{ opacity: 0, x: 50 }}
              animate={phase >= i + 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <div className="flex items-center gap-6 w-1/3">
                <div className="font-mono text-white/80">{claim.id}</div>
                <div className="text-xl font-medium text-white">{claim.amount}</div>
              </div>
              
              <div className="w-1/3 flex justify-center">
                {claim.status === 'DENIED' && phase >= 4 ? (
                  <motion.div 
                    className="px-3 py-1 rounded-full text-sm font-bold bg-primary/20 text-primary border border-primary/30"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    AUTO-APPEALED
                  </motion.div>
                ) : (
                  <div className={`px-3 py-1 rounded-full text-sm font-bold border ${
                    claim.color === 'success' ? 'bg-success/20 text-success border-success/30' : 'bg-error/20 text-error border-error/30'
                  }`}>
                    {claim.status}
                  </div>
                )}
              </div>

              <div className="w-1/3 flex justify-end text-right font-mono text-sm text-text-muted">
                {claim.status === 'DENIED' && phase >= 3 ? (
                  <motion.div className="text-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {phase >= 4 ? <span className="text-primary">Re-submitted.</span> : claim.reason}
                  </motion.div>
                ) : (
                  claim.time
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Denial Handling Agent visualization */}
        <motion.div 
          className="mt-8 bg-bg-light/5 border border-white/10 rounded-xl p-4 overflow-hidden relative"
          initial={{ opacity: 0, height: 0 }}
          animate={phase >= 4 ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
          transition={{ duration: 0.5, ease: 'circOut' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <h4 className="text-white font-bold">Denial Handling Agent</h4>
              <p className="text-text-secondary text-sm font-mono">Found matching COB record in Patient DB. Resubmitting with updated payer details.</p>
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
