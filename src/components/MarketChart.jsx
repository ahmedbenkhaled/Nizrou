// src/components/MarketChart.jsx
import { useMemo } from "react";

function MarketChart({ marketId, displayPrice, activeOption }) {
  const chartColor = "#3b82f6"; 
  const gradientId = `chart-grad-${marketId}-${activeOption}`;

  // نقاط المنحنى الافتراضية الثابتة المتزنة
  const points = [{ x: 0, y: 140 }, { x: 50, y: 130 }, { x: 100, y: 144 }, { x: 150, y: 90 }, { x: 200, y: 110 }, { x: 250, y: 70 }];

  const { pathD, areaD, lastY, safePercentage } = useMemo(() => {
    let parsedPrice = typeof displayPrice === "number" ? displayPrice : parseFloat(displayPrice);
    if (isNaN(parsedPrice)) parsedPrice = 0.5;
    if (parsedPrice > 1) parsedPrice = parsedPrice / 100;

    const currentY = 200 - (parsedPrice * 150) - 25; 
    const baseLines = points.map(p => `${p.x} ${p.y}`).join(" L ");
    
    return {
      pathD: `M 0 140 L ${baseLines} L 300 ${currentY}`,
      areaD: `M 0 140 L ${baseLines} L 300 ${currentY} L 300 200 L 0 200 Z`,
      lastY: currentY,
      safePercentage: (parsedPrice * 100).toFixed(0)
    };
  }, [displayPrice]);

  return (
    <div className="w-full h-full bg-slate-950/20 border border-slate-900/60 p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between flex-1" dir="ltr">
      
      {/* مؤشر النسبة اللحظية العلوية المستقل */}
      <div className="w-full flex flex-col items-start font-mono select-none flex-initial pb-2">
        <span className="text-2xl md:text-3xl font-black tracking-tight leading-none" style={{ color: chartColor }}>
          {safePercentage}%
        </span>
        <span className="text-[10px] font-bold mt-1" style={{ color: chartColor }}>
    تغير السعر اللحظي
  </span>
      </div>

      {/* الـ SVG مضبوط هندسياً بدون تمدد مشوه لملء الفراغ الرأسي بالكامل */}
      <div className="flex-1 w-full min-h-0 relative mt-2">
        <svg 
          className="w-full h-full overflow-visible" 
          viewBox="0 0 300 200" 
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="glow">
    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
    <feMerge>
      <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColor} stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#020617" stopOpacity="0"/>
            </linearGradient>
          </defs>
          
          {/* شبكة الأسطر الخلفية للنسب المئوية */}
          <g className="opacity-20 font-mono text-[9px] fill-slate-400 stroke-slate-800/80" strokeWidth="0.75">
            <line x1="0" y1="25" x2="280" y2="25" strokeDasharray="4,4" />
            <text x="284" y="28" stroke="none">100%</text>
            
            <line x1="0" y1="100" x2="280" y2="100" strokeDasharray="4,4" />
            <text x="284" y="103" stroke="none">50%</text>
            
            <line x1="0" y1="175" x2="280" y2="175" strokeDasharray="4,4" />
            <text x="284" y="178" stroke="none">0%</text>
          </g>
          <g className="font-mono text-[8px] fill-slate-500">
  <text x="5" y="195">أفريل</text>
  <text x="150" y="195">ماي</text>
  <text x="250" y="195">جوان</text>
</g>
          {/* مساحة التدرج اللوني السفلي */}
          <path d={areaD} fill={`url(#${gradientId})`} className="transition-all duration-300 ease-in-out" />
          
          {/* خط المنحنى الرئيسي */}
          <path d={pathD} fill="none" stroke={chartColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300 ease-in-out" />
          
          {/* النقطة التفاعلية المتحركة في نهاية المنحنى */}
          <circle cx="300" cy={lastY} r="4" fill={chartColor} filter="url(#glow)" className="transition-all duration-300" />
        </svg>
      </div>
    </div>
  );
}

export default MarketChart;