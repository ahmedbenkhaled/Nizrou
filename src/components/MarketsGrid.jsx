import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import MarketCard from "./MarketCard";

// ⚡ كارت الهيكل النبضِي الفرعِي المخصص لشبكة كروت الأسواق
const MarketCardSkeleton = () => (
  <div className="w-full bg-slate-900/30 border border-slate-900 rounded-2xl p-4 flex flex-col gap-4 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="h-3.5 bg-slate-800 rounded w-20" />
      <div className="w-6 h-6 rounded-lg bg-slate-800" />
    </div>
    <div className="h-4 bg-slate-800 rounded w-11/12 mt-1" />
    <div className="h-4 bg-slate-800 rounded w-2/3" />
    <div className="h-3 bg-slate-900 rounded w-1/2 mt-2" />
    <div className="flex gap-2.5 mt-2">
      <div className="h-9 bg-slate-800 rounded-xl flex-1" />
      <div className="h-9 bg-slate-800 rounded-xl flex-1" />
    </div>
  </div>
);

function MarketsGrid({ detectedCountry, onActionTrigger, onSaveFavorite }) {
  const [markets, setMarkets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // أبقينا البيانات الاحتياطية فقط لحالة حدوث خطأ كارثي أو انقطاع في الاتصال بالسيرفر (Catch Error)
  const localMarketsBackup = [
    { id: 0, category: "عملات رقمية", endDate: "2026-06-30", question: "هل سيتجاوز سعر البيتكوين حاجز 120 ألف دولار قبل نهاية الشهر؟", volume: 89000, yesPrice: 0.71, noPrice: 0.29 },
    { id: 1, category: "سياسة • انتخابات", endDate: "2026-07-15", question: "هل ستتجاوز نسبة المشاركة في الجولة القادمة من الانتخابات البيروفية 75%؟", volume: 418000, yesPrice: 0.63, noPrice: 0.37 },
    { id: 2, category: "تقنية • ذكاء اصطناعي", endDate: "2026-12-31", question: "هل سيتم إطلاق تحديث نموذج Claude 5 رسميًا في هذا التاريخ؟", volume: 2000, yesPrice: 0.99, noPrice: 0.01 }
  ];

  useEffect(() => {
    let isMounted = true;

    const mapMarketFields = (m) => ({
      ...m,
      endDate: m.end_date || m.endDate || "2026-12-31", 
      yesPrice: m.yes_price ?? m.yesPrice ?? 0.5,       
      noPrice: m.no_price ?? m.noPrice ?? 0.5,         
      volume: m.volume ?? 0,
      image_url: m.image_url || null
    });

    async function fetchLiveMarkets() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("markets")
          .select("*")
          .order("id", { ascending: true });

        if (error) throw error;

        if (isMounted) {
          if (data) {
          let formattedLiveMarkets = data.map(mapMarketFields);

          // 🗺️ منطق الفرز الجغرافي الذكي
         // 🗺️ منطق الفرز الجغرافي الذكي والمؤمن ضد حالة الأحرف
          if (detectedCountry === "all") {
            // إظهار الأسواق العامة فقط وحجب أسواق البلدان الخاصة بالكامل
            formattedLiveMarkets = formattedLiveMarkets.filter(m => !m.country_code || m.country_code.toLowerCase() === "all");
          } else {
            // بلد المستخدم أولاً، ثم العام، ثم باقي الدول
            formattedLiveMarkets.sort((a, b) => {
              const aCode = (a.country_code || "all").toLowerCase();
              const bCode = (b.country_code || "all").toLowerCase();
              const currentTarget = detectedCountry.toLowerCase();

              if (aCode === currentTarget && bCode !== currentTarget) return -1;
              if (bCode === currentTarget && aCode !== currentTarget) return 1;
              
              if (aCode === "all" && bCode !== "all") return -1;
              if (bCode === "all" && aCode !== "all") return 1;

              return 0;
            });
          }

          setMarkets(formattedLiveMarkets);
        }
        }
      } catch (err) {
        console.warn("فشل الجلب من السحابة، تم تشغيل البيانات الاحتياطية بنجاح:", err.message);
        if (isMounted) setMarkets(localMarketsBackup);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchLiveMarkets();

    // الاستماع لأي تغييرات لحظية (الحذف والإنشاء والتحديث) لجعل لوحة التحكم متزامنة تماماً
    const gridChannel = supabase
      .channel("realtime-markets-grid")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "markets" }, // استماع لكل الأحداث للـ Realtime الحقيقي
        () => {
          fetchLiveMarkets(); 
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(gridChannel);
    };
  }, [detectedCountry]);

  return (
    <div className="w-full flex flex-col gap-6 mt-10 font-cairo" dir="rtl">
      <div className="flex items-center gap-2 px-2">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
        <h3 className="text-base font-bold text-white">الأسواق النشطة المتاحة</h3>
      </div>

      {/* اختبار ذكي: إذا تم انتهاء التحميل والمصفوفة فارغة تماماً، نعرض رسالة فارغة أنيقة */}
      {!isLoading && markets.length === 0 ? (
        <div className="w-full py-12 border border-dashed border-slate-900 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500">
          <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.008 1.24l.885 1.77a2.25 2.25 0 002.007 1.24h1.98a2.25 2.25 0 002.007-1.24l.885-1.77a2.25 2.25 0 012.007-1.24h3.86m-18 0h18a2.25 2.25 0 012.25 2.25v4.25A2.25 2.25 0 0118 21H6a2.25 2.25 0 01-2.25-2.25V15.75A2.25 2.25 0 016 13.5z" />
          </svg>
          <p className="text-xs font-medium">لا توجد أسواق نشطة حالياً في المنصة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {isLoading
            ? [...Array(4)].map((_, i) => <MarketCardSkeleton key={`grid-skeleton-${i}`} />)
            : markets.map((market) => (
                <MarketCard 
                  key={market.id} 
                  market={market} 
                  onActionTrigger={onActionTrigger} 
                  onSaveFavorite={onSaveFavorite}
                />
              ))}
        </div>
      )}
    </div>
  );
}

export default MarketsGrid;