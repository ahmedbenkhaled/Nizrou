import { useState } from "react";

function SidebarNews() {
  // 1. بيانات محاكاة لآخر الأخبار (Dernières nouvelles) ونسب الاحتمالات الحالية في الـ RAM
  const [latestNews] = useState([
    { id: 1, text: "هل ستغلق إيران مجالها الجوي قبل نهاية الأسبوع؟", percentage: "100%", trend: "up", change: "95%" },
    { id: 2, text: "هل ستتجاوز نسبة المشاركة في الجولة الثانية من انتخابات البيرو 75%؟", percentage: "98%", trend: "up", change: "57%" },
    { id: 3, text: "هل سيتم إطلاق تحديث نموذج Claude 5 قبل 30 يونيو 2026؟", percentage: "65%", trend: "up", change: "23%" },
  ]);

  // 2. بيانات محاكاة للمواضيع الشائعة (Sujets populaires) وحجم التداول اليومي
  const [popularTopics] = useState([
    { id: 1, name: "البيرو", volume: "$119M اليوم", hot: true },
    { id: 2, name: "إسرائيل", volume: "$13M اليوم", hot: true },
    { id: 3, name: "إيران", volume: "$111M اليوم", hot: true },
    { id: 4, name: "المجال الجوي", volume: "$33M اليوم", hot: true },
    { id: 5, name: "كيكو", volume: "$15M اليوم", hot: true },
  ]);

  return (
    <aside className="w-full flex flex-col justify-between h-full gap-3 font-cairo text-right mt-1" dir="rtl">
      
      {/* قسم آخر الأخبار */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-1.5 cursor-pointer group mt-0.5">
          <h2 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">آخر الأخبار</h2>
          <span className="text-[10px] text-slate-500 group-hover:translate-x-[-2px] transform transition-transform">◀</span>
        </div>
        
        <div className="flex flex-col gap-4">
          {latestNews.map((news, index) => (
            <div key={news.id} className="flex flex-row justify-between items-start gap-4 pt-1">
              <div className="flex items-start gap-3">
                <span className="text-xs font-mono font-bold text-slate-600 pt-0.5">{index + 1}</span>
                <p className="text-xs font-sans font-normal text-slate-300 leading-relaxed hover:text-blue-400 transition-colors cursor-pointer">
                  {news.text}
                </p>
              </div>
              <div className="flex flex-col items-end shrink-0 font-mono">
                <span className="text-xs font-bold text-slate-200">{news.percentage}</span>
                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5">
                  ▲ {news.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-t border-dashed border-slate-800/60 my-2" />

      {/* قسم المواضيع الشائعة */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-1.5 cursor-pointer group">
          <h2 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">المواضيع الشائعة</h2>
          <span className="text-[10px] text-slate-500 group-hover:translate-x-[-2px] transform transition-transform">◀</span>
        </div>

        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[200px]">
          {popularTopics.map((topic, index) => (
            <div key={topic.id} className="flex flex-row justify-between items-center p-2.5 rounded-xl hover:bg-slate-900/40 transition-all duration-150 cursor-pointer group">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-slate-600">{index + 1}</span>
                <span className="text-xs font-sans font-normal text-slate-300 group-hover:text-white transition-colors">{topic.name}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-slate-500 text-[11px]">
                <span>{topic.volume}</span>
                {topic.hot && (
  <svg 
    className="w-3.5 h-3.5 shrink-0 animate-pulse" 
    viewBox="0 0 512 512" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* تعريف التدرج اللوني للنار */}
    <defs>
      <linearGradient id="fireGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ef4444" />   {/* أحمر متوهج في الأعلى */}
        <stop offset="50%" stopColor="#f97316" />  {/* برتقالي ناري في المنتصف */}
        <stop offset="100%" stopColor="#f59e0b" /> {/* أصفر دافئ في القاعدة */}
      </linearGradient>
    </defs>
    
    {/* رسمة الشعلة وتطبيق التدرج عليها عن طريق الـ fill */}
    <g transform="translate(0,512) scale(0.1,-0.1)" fill="url(#fireGradient)">
      <path d="M2471 4598 c-116 -284 -265 -588 -424 -865 -120 -209 -183 -346 -232
      -510 -35 -113 -85 -340 -85 -382 0 -31 -14 -26 -52 22 -68 83 -138 196 -207
      336 -82 166 -68 168 -156 -26 -101 -223 -183 -500 -222 -747 -26 -164 -26
      -630 1 -771 56 -299 186 -551 400 -774 223 -231 501 -375 831 -431 110 -19
      153 -21 280 -17 384 15 708 150 977 406 231 219 377 482 439 790 52 257 26
      766 -56 1111 -15 60 -30 110 -33 110 -4 0 -95 -94 -202 -209 -107 -115 -196
      -205 -198 -201 -2 5 4 55 12 112 48 323 21 662 -75 951 -94 280 -220 469 -523
      784 -126 131 -406 386 -429 391 -8 1 -27 -31 -46 -80z"/>
    </g>
  </svg>
)}
                <span className="text-[9px] text-slate-600 group-hover:text-slate-400 transition-colors mr-1">◀</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      

    </aside>
  );
}

export default SidebarNews;