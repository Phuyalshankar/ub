import React, { useState } from 'react';
import { ub, gradient, active, hover, oklch } from './css/mycss';

const UBTestPage = () => {
  const [count, setCount] = useState(0);

  return (
    <div className={ub('bg-zinc-240 min-h-screen p-8 flex col items-center')}>
      
      {/* 1. Header with Fluid Typography */}
      <header className={ub('mb-10 ta-center')}>
        <h1 className={ub('fs-fluid:32-64 fw-800 text-indigo-150 mb-2')}>
          UB-Style v7.6.3
        </h1>
        <p className={ub('text-slate-100 fs-18')}>
          Tailwind जस्तै सजिलो, तर OKLCH पावरको साथ!
        </p>
      </header>

      {/* 2. Responsive Grid Test */}
      <div className={ub('grid-300 gap-6 w-full max-w-[1200px]')}>
        
        {/* Card 1: Height & OKLCH Color Test */}
        <div className={ub(`h-60 rounded-8 p-6 flex col justify-between shadow-10 ${gradient('135deg', 'rose-180', 'orange-150')}`)}>
          <span className={ub('bg-[rgba(255,255,255,0.2)] w-fit px-3 py-1 rounded-full text-white fs-14')}>
            Height: 240px (h-60)
          </span>
          <h2 className={ub('text-white fs-28 fw-700')}>Dynamic Gradient</h2>
        </div>

        {/* Card 2: Interaction & Scale Test */}
        <div 
          onClick={() => setCount(c => c + 1)}
          className={ub(`h-60 rounded-8 bg-white p-6 center col shadow-5 transition-all duration-300 cursor-pointer ${hover('scale-105 shadow-20')} ${active('scale-95')}`)}
        >
          <span className={ub('fs-40 mb-2')}>🚀</span>
          <p className={ub('text-zinc-50 fw-600')}>Hover & Click Me</p>
          <p className={ub('text-indigo-120 fs-24 fw-800')}>Count: {count}</p>
        </div>

        {/* Card 3: Arbitrary Values & Border Test */}
        <div className={ub('h-60 rounded-8 bg-zinc-250 border-2 border-indigo-150 p-6 flex col justify-center')}>
          <p className={ub('text-indigo-100 fw-700 mb-2')}>Arbitrary Value Test:</p>
          <div className={ub('w-[80%] h-4 bg-indigo-180 rounded-full mb-4')} />
          <p className={ub('text-zinc-80 fs-14')}>w-[80%] र h-4 (16px) को प्रयोग</p>
        </div>

      </div>

      {/* 3. Fluid Spacing & Buttons Section */}
      <section className={ub('mt-12 p-fluid:20-40 bg-white rounded-10 shadow-5 w-full max-w-[800px]')}>
        <h3 className={ub('fs-24 fw-700 text-zinc-20 mb-6')}>Interaction System</h3>
        
        <div className={ub('flex row gap-4 wrap')}>
          <button className={ub(`px-8 py-3 rounded-4 fw-600 text-white transition-colors ${gradient('45deg', 'blue-150', 'cyan-150')} ${hover('opacity-0.8')}`)}>
            Primary Button
          </button>
          
          <button className={ub(`px-8 py-3 rounded-4 fw-600 border-2 border-slate-180 text-slate-50 ${hover('bg-slate-240')}`)}>
            Outline Button
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className={ub('mt-20 text-zinc-150 fs-14')}>
        UB-StyleSheet Engine • Built with Love
      </footer>
    </div>
  );
};

export default UBTestPage;