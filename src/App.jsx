import React, { useMemo, useState, useEffect } from 'react';
import { ub, debugUB, dom } from './css/mycss';

const StressTest = () => {
  const [count, setCount] = useState(100);
  const [stats, setStats] = useState({ total: 0, time: 0 });

  useEffect(() => {
    setTimeout(() => {
      const currentStats = debugUB();
      setStats({ total: currentStats.total, time: 0 });
    }, 500);
  }, []);

  const runTest = (limit) => {
    const start = performance.now();
    setCount(limit);
    
    setTimeout(() => {
      const end = performance.now();
      const currentStats = debugUB();
      console.log('Final stats:', currentStats);
      setStats({ 
        total: currentStats.total, 
        time: (end - start).toFixed(2) 
      });
    }, 1500); // थोरै समय बढाएको
  };

  // १०,००० वटा युनिक स्टाइलहरू जेनेरेट गर्ने
  const boxes = useMemo(() => {
    const items = [];
    for (let i = 0; i < count; i++) {
      // प्राइम नम्बर प्रयोग गरेर unique values बनाउने
      const uniqueID = i * 997; // prime number
      
      // युनिक shades (0-255)
      const shade = (uniqueID % 256);
      
      // युनिक widths (1-1000)
      const width = (uniqueID % 1000) + 1;
      
      // युनिक colors (10 वटा color variants)
      const colorIdx = (uniqueID % 10);
      const colors = ['blue', 'green', 'red', 'purple', 'orange', 'teal', 'pink', 'amber', 'cyan', 'lime'];
      const colorName = colors[colorIdx];
      
      // युनिक paddings (1-8)
      const padding = (uniqueID % 8) + 1;
      
      // युनिक rounded values (1-16)
      const rounded = (uniqueID % 16) + 1;
      
      // युनिक opacity (50-99)
      const opacity = 50 + (uniqueID % 50);
      
      // युनिक heights (30-200)
      const height = 30 + (uniqueID % 170);
      
      // युनिक margins (0-7)
      const margin = (uniqueID % 8);
      
      // युनिक font sizes (10-30)
      const fontSize = 10 + (uniqueID % 20);
      
      // युनिक border widths (0-5)
      const borderWidth = (uniqueID % 6);
      
      // ग्रेडियन्ट backgrounds (केहि elements मा)
      const hasGradient = i % 3 === 0;
      
      items.push(
        <dom.div 
          key={i}
          className={`
            bg-${colorName}-${shade}/${opacity}
            w-${width}
            h-${height}
            p-${padding}
            m-${margin}
            rounded-${rounded}
            text-${fontSize}
            font-bold
            shadow-2
            hover:scale-105
            hover:shadow-4
            transition-all
            duration-300
            ease-in-out
            flex
            items-center
            justify-center
            border-${borderWidth}
            border-white/30
            relative
            overflow-hidden
            ${hasGradient ? 'bg-gradient-to-br' : ''}
            cursor-pointer
          `}
          style={{ 
            minWidth: '60px',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            ...(hasGradient && {
              background: `linear-gradient(135deg, ${colorName}-${shade}, ${colorName}-${(shade + 50) % 256})`
            })
          }}
          onClick={() => console.log(`Clicked element ${i}`)}
        >
          {/* Element number */}
          <dom.span className="absolute top-1 left-1 text-8 opacity-50">
            {i}
          </dom.span>
          
          {/* Small indicator for unique combinations */}
          <dom.div className="flex flex-col items-center">
            <dom.span>{colorName[0].toUpperCase()}{shade}</dom.span>
            <dom.span className="text-8 mt-1">w{width}</dom.span>
          </dom.div>
        </dom.div>
      );
    }
    return items;
  }, [count]);

  // Calculate unique coverage percentage
  const coverage = count > 0 ? ((stats.total / count) * 100).toFixed(1) : 0;

  return (
    <dom.div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header Card */}
      <dom.div className="mb-8 p-6 bg-white shadow-4 rounded-4 border-l-4 border-blue-500 hover:shadow-5 transition-shadow">
        <dom.h1 className="text-3xl font-bold mb-2 text-gray-800">
          🚀 UB Engine v17.13.0 Stress Test
        </dom.h1>
        <dom.p className="text-gray-600 mb-4">
          १०,००० युनिक स्टाइलहरू एकै पटक लोड गरेर पर्फर्मेन्स हेर्नुहोस्।
        </dom.p>
        
        {/* Control Buttons */}
        <dom.div className="flex gap-4 mb-6 flex-wrap">
          <dom.button 
            onClick={() => runTest(1000)} 
            className="bg-green-500 text-white px-4 py-3 rounded-2 hover:bg-green-600 font-medium shadow-2 hover:shadow-3 transition-all transform hover:-translate-y-1"
          >
            🌱 Load 1,000
          </dom.button>
          
          <dom.button 
            onClick={() => runTest(5000)} 
            className="bg-yellow-500 text-white px-4 py-3 rounded-2 hover:bg-yellow-600 font-medium shadow-2 hover:shadow-3 transition-all transform hover:-translate-y-1"
          >
            🌿 Load 5,000
          </dom.button>
          
          <dom.button 
            onClick={() => runTest(10000)} 
            className="bg-red-500 text-white px-6 py-4 rounded-2 hover:bg-red-600 font-bold shadow-3 hover:shadow-4 transition-all transform hover:-translate-y-1"
          >
            🔥 FIRE 10,000!
          </dom.button>
          
          <dom.button 
            onClick={() => runTest(100)} 
            className="bg-gray-500 text-white px-4 py-3 rounded-2 hover:bg-gray-600 font-medium shadow-2 hover:shadow-3 transition-all"
          >
            ↩️ Reset (100)
          </dom.button>
        </dom.div>

        {/* Stats Grid */}
        <dom.div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-3 border border-gray-200">
          <dom.div className="text-center p-2 bg-white rounded-2 shadow-1">
            <dom.div className="text-sm text-gray-500 mb-1">Unique Styles in Cache</dom.div>
            <dom.div className="text-3xl font-bold text-blue-600">{stats.total}</dom.div>
            <dom.div className="text-xs text-gray-400 mt-1">total classes</dom.div>
          </dom.div>
          
          <dom.div className="text-center p-2 bg-white rounded-2 shadow-1">
            <dom.div className="text-sm text-gray-500 mb-1">Render Time</dom.div>
            <dom.div className="text-3xl font-bold text-green-600">{stats.time} ms</dom.div>
            <dom.div className="text-xs text-gray-400 mt-1">for {count} elements</dom.div>
          </dom.div>
          
          <dom.div className="text-center p-2 bg-white rounded-2 shadow-1">
            <dom.div className="text-sm text-gray-500 mb-1">Performance Status</dom.div>
            <dom.div className="text-xl font-bold">
              {stats.time < 500 ? (
                <dom.span className="text-green-600">⚡ Ultra Fast</dom.span>
              ) : stats.time < 1000 ? (
                <dom.span className="text-yellow-600">👍 Good</dom.span>
              ) : stats.time < 2000 ? (
                <dom.span className="text-orange-600">⚖️ Acceptable</dom.span>
              ) : (
                <dom.span className="text-red-600">🐢 Slow Down</dom.span>
              )}
            </dom.div>
            <dom.div className="text-xs text-gray-400 mt-1">
              {stats.time < 500 ? '🚀 Blazing fast!' : stats.time < 1000 ? '✅ Smooth' : '⚠️ Needs optimization'}
            </dom.div>
          </dom.div>
        </dom.div>
      </dom.div>

      {/* Info Card */}
      <dom.div className="mb-4 p-4 bg-blue-50 rounded-3 border border-blue-200 shadow-2">
        <dom.div className="flex justify-between items-center flex-wrap gap-2">
          <dom.span className="font-mono text-blue-800">
            📊 Elements: <dom.b className="text-xl">{count}</dom.b> | 
            Cache: <dom.b className="text-xl">{stats.total}</dom.b> | 
            Coverage: <dom.b className={`text-xl ${coverage < 50 ? 'text-red-500' : 'text-green-500'}`}>
              {coverage}%
            </dom.b>
          </dom.span>
          
          <dom.span className="text-sm text-gray-600">
            {stats.total === count ? (
              <dom.span className="text-green-600">✅ 100% unique styles achieved!</dom.span>
            ) : stats.total < count ? (
              <dom.span className="text-yellow-600">
                ⚠️ Only {stats.total} unique styles for {count} elements
              </dom.span>
            ) : (
              <dom.span className="text-blue-600">🔄 Some styles reused</dom.span>
            )}
          </dom.span>
        </dom.div>
        
        {/* Progress Bar */}
        <dom.div className="mt-2 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <dom.div 
            className={`h-2 rounded-full transition-all duration-500 ${
              coverage > 90 ? 'bg-green-500' : coverage > 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, coverage)}%` }}
          />
        </dom.div>
      </dom.div>

      {/* Grid Display */}
      {count > 0 && (
        <dom.div className="mt-4">
          <dom.h2 className="text-xl font-semibold mb-3 text-gray-700">
            🎨 Elements Grid ({count} items)
          </dom.h2>
          <dom.div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
            {boxes}
          </dom.div>
        </dom.div>
      )}
      
      {/* Footer Note */}
      <dom.div className="mt-8 text-center text-sm text-gray-400 border-t border-gray-200 pt-4">
        <dom.p>
          UB Engine v17.13.0 | {stats.total} unique styles generated | 
          Memory: {(performance.memory?.usedJSHeapSize / 1048576).toFixed(2) || 'N/A'} MB
        </dom.p>
      </dom.div>
    </dom.div>
  );
};

export default StressTest;