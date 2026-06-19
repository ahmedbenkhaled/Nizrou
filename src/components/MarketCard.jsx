// src/components/MarketCard.jsx
import { formatDateToArabic, formatCategoryName, formatMarketVolume } from "../utils/formatters";

function MarketCard({ market, onActionTrigger, onSaveFavorite }) {
  // حساب النسبة المئوية للاحتمالات بأمان لمنع قيم NaN التخريبية في حال كانت البيانات فارغة من السحابة
  const yesPercentage = market?.yesPrice ? (market.yesPrice * 100).toFixed(0) : "50";
  const noPercentage = market?.noPrice ? (market.noPrice * 100).toFixed(0) : "50";

  return (
    <div className="bg-slate-900/40 border border-slate-900 hover:border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-55 transition-all font-cairo text-right group" dir="rtl">
      
      {/* القسم العلوي: الرمز والعنوان */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start w-full">
          <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded-md text-slate-400 border border-slate-900">
            {formatCategoryName(market.category)}
          </span>
          <span className="text-[10px] text-slate-500">
            {formatDateToArabic(market.endDate)}
          </span>
        </div>
        
        {/* حاوية مرنة تجمع الصورة بجانب العنوان */}
        {/* حاوية مرنة تجمع الصورة بجانب العنوان */}
<div className="flex items-start gap-2.5 w-full mt-1">
  
  {/* المكون الذكي لعرض الصورة أو البديل الرمزي */}
  <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-900 flex-shrink-0 overflow-hidden flex items-center justify-center font-mono font-bold text-[9px] text-slate-500 select-none tracking-wider uppercase">
    {market.image_url ? (
      <img 
        src={market.image_url} 
        alt="market" 
        className="w-full h-full object-cover"
      />
    ) : (
      market.ticker || (market.category ? market.category.substring(0, 5) : "MARKET")
    )}
  </div>

  <h4 
    onClick={() => onActionTrigger && onActionTrigger(market.id, "YES")} 
    className="text-xs font-bold text-slate-100 leading-relaxed line-clamp-2 group-hover:text-white group-hover:underline transition-all cursor-pointer flex-1"
  >
    {market.question} 
  </h4>
</div>
      </div>

      {/* القسم السفلي: الأزرار وحجم التداول */}
      <div className="flex flex-col gap-3 mt-auto">
        {/* أزرار نعم / لا بنمط مالي خفيف التباين */}
        <div className="grid grid-cols-2 gap-2" dir="ltr">
          {/* زر لا */}
          <button 
            onClick={() => onActionTrigger && onActionTrigger(market.id, "NO")}
            className="flex justify-between items-center px-3 py-2 bg-red-950/30 hover:bg-red-950/50 border border-red-900/30 text-red-400 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-95"
          >
            <span className="text-slate-300 font-mono">{noPercentage}%</span>
            <span className="font-cairo">لا</span>
          </button>

          {/* زر نعم */}
          <button 
            onClick={() => onActionTrigger && onActionTrigger(market.id, "YES")}
            className="flex justify-between items-center px-3 py-2 bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-900/30 text-emerald-400 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-95"
          >
            <span className="text-slate-300 font-mono">{yesPercentage}%</span>
            <span className="font-cairo">نعم</span>
          </button>
        </div>

        {/* حجم التداول وأيقونة الحفظ */}
        <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-slate-900/50">
          <div className="flex items-center gap-1">
            <span>حجم التداول:</span>
            {/* ⚡ التصحِيح السحابي: تمرير الرقم المالي لدالة التنسيق ليعرض $89,000 بدلاً من 89000 صلبة */}
            <span className="text-slate-400 font-mono font-medium">
              {formatMarketVolume(market.volume)}
            </span>
          </div>
          <button 
            onClick={() => onSaveFavorite && onSaveFavorite(market.id)}
            className="text-slate-600 hover:text-slate-400 transition-colors cursor-pointer" 
            title="حفظ في المفضلة"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>

    </div>
  );
}

export default MarketCard;