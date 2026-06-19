// src/components/HeroCarousel.jsx
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MarketChart from "./MarketChart";
import ScrollingComments from "./ScrollingComments";
import { formatDateToArabic, formatCategoryName, formatMarketVolume } from "../utils/formatters";

const HeroCarouselSkeleton = () => (
  <div className="w-full h-full bg-slate-900/40 border border-slate-900 rounded-3xl p-6 flex flex-col gap-6 animate-pulse text-right" dir="rtl">
    <div className="flex flex-row justify-between items-start gap-4 w-full">
      <div className="flex flex-row items-start gap-3 flex-1">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 shrink-0" />
        <div className="flex flex-col gap-3 flex-1 mt-1">
          <div className="h-4 bg-slate-800 rounded w-24" />
          <div className="h-5 bg-slate-800 rounded w-3/4" />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-stretch flex-1">
      <div className="md:col-span-2 flex flex-col gap-4 justify-between">
        <div className="flex gap-3">
          <div className="h-11 bg-slate-800 rounded-xl flex-1" />
          <div className="h-11 bg-slate-800 rounded-xl flex-1" />
        </div>
        <div className="h-20 bg-slate-800 rounded-xl w-full" />
      </div>
      <div className="md:col-span-3 h-full bg-slate-800 rounded-xl" />
    </div>
    <div className="h-5 bg-slate-800 rounded mt-2 w-full" />
  </div>
);

function HeroCarousel({ marketsData = [], currentIndex = 0, selectedOption, currentPrice, onAuthOpen, onActionTrigger, loading, user }) {
  const navigate = useNavigate();
  const [copiedMarketId, setCopiedMarketId] = useState(null);
  const totalRealMarkets = marketsData.length;

  const handleCopyLink = useCallback((e, marketId) => {
    e.stopPropagation();
    const marketUrl = `${window.location.origin}/market/${marketId}`;
    navigator.clipboard.writeText(marketUrl).then(() => {
      setCopiedMarketId(marketId);
      setTimeout(() => setCopiedMarketId(null), 2000);
    }).catch((err) => console.error("فشل نسخ الرابط:", err));
  }, []);

  if (loading) return <HeroCarouselSkeleton />;

  if (totalRealMarkets === 0) {
    return (
      <div className="w-full h-full min-h-[340px] bg-slate-900/40 border border-slate-900 rounded-3xl flex items-center justify-center text-slate-400 font-cairo">
        لا توجد أسواق نشطة حالياً في منصة نيزرو.
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-slate-900/40 border border-slate-900 rounded-3xl flex flex-col font-cairo text-right overflow-hidden relative group" dir="rtl">
      {/* 🟢 الحاوية الأساسية تم إرجاعها إلى ltr لضمان اصطفاف الأسواق بدقة في الذاكرة الرسومية للمتصفح */}
      <div className="flex-1 w-full h-full relative overflow-hidden" dir="ltr">
        
        {/* 🟢 مسار التحريك الأفقي السلس: تم تعديل القيمة الرياضية لـ TransalateX لتصبح سالبة لتدفع الأسواق التالية بشكل سليم وصحيح هندسياً */}
        <div 
          className="flex flex-row h-full transition-transform duration-500 ease-out"
          style={{ 
            transform: `translateX(-${currentIndex * (100 / totalRealMarkets)}%)`,
            width: `${totalRealMarkets * 100}%` 
          }}
        >
          {marketsData.map((market) => (
            <div 
              key={market.id} 
              className="w-full h-full p-6 flex flex-col gap-3 justify-between shrink-0 text-right" 
              dir="rtl"
              style={{ width: `${100 / totalRealMarkets}%` }}
            >
              {/* القسم العلوي: العنوان والتصنيف */}
              <div className="flex flex-row justify-between items-start gap-4 w-full flex-initial">
                <div className="flex flex-row items-start gap-3 flex-1 min-w-0">
                  {/* المكون الذكي لعرض الصورة المرفوعة أو البديل الرمزي */}
<div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800/80 shrink-0 overflow-hidden flex items-center justify-center font-mono font-bold text-xs text-blue-500 tracking-wider uppercase">
  {market.image_url ? (
    <img 
      src={market.image_url} 
      alt="market-hero" 
      className="w-full h-full object-cover"
    />
  ) : (
    market.ticker || `NZ-${market.id}`
  )}
</div>
                  <div className="flex flex-col gap-1 min-w-0 flex-1 text-right items-start">
                    <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md font-cairo w-fit">
                      {formatCategoryName(market.category)}
                    </span>
                    <h2 
                     onClick={() => {
  if (!user) {
    onAuthOpen?.();
  } else {
    navigate(`/market/${market.id}`);
  }
}}
                      className="text-right text-base md:text-lg font-bold text-slate-100 hover:text-white hover:underline truncate w-full block font-cairo cursor-pointer transition-all"
                    >
                      {market.question}
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => handleCopyLink(e, market.id)}
                    className="p-2 rounded-xl bg-slate-950/60 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-200 transition-all active:scale-95 cursor-pointer"
                  >
                    {copiedMarketId === market.id ? (
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAuthOpen?.();
                    }}
                    className="p-2 rounded-xl bg-slate-950/60 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-200 transition-all active:scale-95 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* قسم المحتوى الأوسط: توازن عمودي للتعليقات والمنحنى المالي */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-5 items-stretch flex-1 w-full min-h-0">
                <div className="md:col-span-2 flex flex-col gap-3.5 w-full justify-start h-full">
                  <div className="flex items-center gap-2.5 w-full shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onActionTrigger?.(market.id, "YES");
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs transition-all flex justify-between items-center cursor-pointer active:scale-[0.99] font-cairo ${
                        selectedOption === "YES" && market.id === marketsData[currentIndex]?.id
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10 ring-2 ring-emerald-400"
                          : "bg-slate-950/80 text-emerald-500 border border-slate-900 hover:bg-slate-900"
                      }`}
                    >
                      <span>شراء نعم</span>
                      <span className="font-mono text-xs opacity-90">{((market.yesPrice || 0) * 100).toFixed(0)}¢</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onActionTrigger?.(market.id, "NO");
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs transition-all flex justify-between items-center cursor-pointer active:scale-[0.99] font-cairo ${
                        selectedOption === "NO" && market.id === marketsData[currentIndex]?.id
                          ? "bg-rose-600 text-white shadow-lg shadow-rose-600/10 ring-2 ring-rose-400"
                          : "bg-slate-950/80 text-rose-500 border border-slate-900 hover:bg-slate-900"
                      }`}
                    >
                      <span>شراء لا</span>
                      <span className="font-mono text-xs opacity-90">{((market.noPrice || 0) * 100).toFixed(0)}¢</span>
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 w-full">
                    <ScrollingComments marketId={market.id === marketsData[currentIndex]?.id ? market.id : null} />
                  </div>
                </div>
                
                <div className="md:col-span-3 w-full h-full min-h-[160px] flex flex-col">
                  <MarketChart
                    marketId={market.id === marketsData[currentIndex]?.id ? market.id : null}
                    displayPrice={market.id === marketsData[currentIndex]?.id ? currentPrice : (selectedOption === "YES" ? market.yesPrice : market.noPrice)}
                    activeOption={selectedOption}
                    chartPoints={market.chartPoints}
                  />
                </div>
              </div>

              {/* القسم السفلي: الإحصائيات */}
              <div className="flex flex-row justify-between items-center w-full pt-2.5 border-t border-slate-900/60 opacity-80 text-xs flex-initial">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-400 font-cairo">نيزرو</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-500 font-medium font-cairo">
                    ينتهي في {formatDateToArabic(market.endDate)}
                  </span>
                </div>
                <span className="text-slate-500 font-medium font-cairo">
                  حجم التداول: {formatMarketVolume(market.volume)}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default HeroCarousel;