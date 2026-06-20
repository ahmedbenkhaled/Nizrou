import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { createPortal } from "react-dom";

function PortfolioPage() {
  const { profile, user } = useAuth();
  
  // التحكم في التبويب النشط والأدوات المنسدلة
  const [activeSubTab, setActiveSubTab] = useState("positions"); // positions | open | history
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [currentSort, setCurrentSort] = useState("current_value");
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // حالات جلب البيانات الحية من Supabase
  const [dbPositions, setDbPositions] = useState([]);
  const [dbTransactions, setDbTransactions] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // ─── جلب البيانات الحية من جداول قاعدة البيانات ───
  // ─── جلب البيانات الحية من جداول قاعدة البيانات ───
  useEffect(() => {
    if (!user?.id) return;

    const fetchPortfolioData = async () => {
      setLoadingData(true);
      try {
        // 1. جلب المراكز الحالية مع بيانات الأسواق المرتبطة بها (بصيغة الجمع المطابقة لـ Supabase)
        const { data: posData, error: posErr } = await supabase
          .from("user_positions")
          .select(`
            *,
            markets (id, question, title, yes_price, no_price, ticker, end_date)
          `)
          .eq("user_id", user.id);

        if (!posErr && posData) setDbPositions(posData);

        // 2. جلب سجل العمليات بالكامل مع بيانات الأسواق المرتبطة بها (بصيغة الجمع المطابقة لـ Supabase)
        const { data: txData, error: txErr } = await supabase
          .from("transactions")
          .select(`
            *,
            markets (id, question, title, ticker)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!txErr && txData) setDbTransactions(txData);

      } catch (err) {
        console.error("خطأ أثناء جلب بيانات المحفظة حياً:", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchPortfolioData();

    // الاشتراك الآمن والمنظم في التحديث اللحظي لمنع تكرار الاشتراكات والانهيار
    const channelName = `portfolio-realtime-${user.id}`;
    const posChannel = supabase.channel(channelName);

    posChannel
      .on(
        "postgres_changes", 
        { event: "*", schema: "public", table: "user_positions", filter: `user_id=eq.${user.id}` }, 
        () => {
          console.log("🔄 تحديث لحظي للمحفظة: تم رصد حركة جديدة في المراكز");
          fetchPortfolioData();
        }
      )
      .subscribe();

    return () => {
      if (posChannel) {
        supabase.removeChannel(posChannel);
      }
    };
  }, [user?.id]);

  // ─── معالجة الحسابات الرياضية للمراكز (Positions) ───
  // ─── معالجة الحسابات الرياضية للمراكز (Positions) ───
  const processedPositions = useMemo(() => {
    return dbPositions.map(pos => {
      const market = pos.markets || {};
      const hasYes = Number(pos.yes_shares || 0) > 0;
      const shares = hasYes ? Number(pos.yes_shares) : Number(pos.no_shares);
      const side = hasYes ? "YES" : "NO";
      const avgCost = hasYes ? Number(pos.avg_price_yes || 0) : Number(pos.avg_price_no || 0);
      const currentPrice = hasYes ? Number(market.yes_price || 0) : Number(market.no_price || 0);
      
      const totalCost = shares * avgCost;
      const currentValue = shares * currentPrice;
      const pnlCash = currentValue - totalCost;
      const pnlPercent = avgCost > 0 ? (pnlCash / totalCost) * 100 : 0;

      return {
        id: pos.id,
        marketId: market.id,
        question: market.question || market.title || "سوق غير مسمى",
        ticker: market.ticker || `NZ-${market.id}`,
        side,
        shares,
        avgCost,
        currentPrice,
        totalCost,
        currentValue,
        pnlCash,
        pnlPercent,
        endDate: market.end_date
      };
    }).filter(pos => pos.shares > 0 && pos.question.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [dbPositions, searchQuery]);

  // ─── تصنيف وفرز الصفقات المعلقة (Open Orders) ───
  const openOrders = useMemo(() => {
    return dbTransactions.filter(tx => 
      tx.status === "pending" && 
      (tx.markets?.question || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [dbTransactions, searchQuery]);

  // ─── سجل الحركات المالية المنتهية (History) ───
  const historyTransactions = useMemo(() => {
    return dbTransactions.filter(tx => 
      tx.status !== "pending" && 
      (tx.markets?.question || tx.order_type || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [dbTransactions, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-cairo pt-36 pb-16 px-4 md:px-8" dir="rtl">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        
        {/* ─── البطاقات العلوية المباشرة ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between backdrop-blur-sm">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                <span>إجمالي قيمة الأصول التداولية</span>
                <button onClick={() => setIsAddressModalOpen(true)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0l-5.25-5.25" />
                  </svg>
                </button>
              </div>
              <div className="text-3xl font-bold font-mono text-white mt-1">
                ${processedPositions.reduce((acc, curr) => acc + curr.currentValue, 0).toFixed(2)}
              </div>
            </div>
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-800/50">
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-500">الرصيد المتاح بالمحفظة</span>
                <span className="text-sm font-bold font-mono text-emerald-400">${Number(profile?.balance || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between backdrop-blur-sm">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 text-sm font-medium">صافي الأرباح / الخسائر المفتوحة</span>
                <div className={`text-3xl font-bold font-mono mt-1 ${processedPositions.reduce((acc, curr) => acc + curr.pnlCash, 0) >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                  {processedPositions.reduce((acc, curr) => acc + curr.pnlCash, 0) >= 0 ? "+" : ""}
                  ${processedPositions.reduce((acc, curr) => acc + curr.pnlCash, 0).toFixed(2)}
                </div>
              </div>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 text-xs font-mono font-bold text-slate-400">
                {["1D", "ALL"].map((time, idx) => (
                  <button key={time} className={`px-2.5 py-1 rounded-lg transition-all ${idx === 1 ? "bg-blue-600 text-white" : ""}`}>{time}</button>
                ))}
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden mt-6">
              <div className="h-full bg-blue-500 w-[45%]" />
            </div>
          </div>
        </div>

        {/* ─── شريط التبويبات والتصفية والبحث ─── */}
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-1">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-1 bg-slate-900/30 p-1 rounded-xl border border-slate-850/60 text-sm font-semibold">
              <button onClick={() => setActiveSubTab("positions")} className={`px-5 py-2 rounded-lg transition-all cursor-pointer ${activeSubTab === "positions" ? "bg-slate-800 text-white" : "text-slate-400"}`}>المراكز الحالية ({processedPositions.length})</button>
              <button onClick={() => setActiveSubTab("open")} className={`px-5 py-2 rounded-lg transition-all cursor-pointer ${activeSubTab === "open" ? "bg-slate-800 text-white" : "text-slate-400"}`}>الطلبات المفتوحة ({openOrders.length})</button>
              <button onClick={() => setActiveSubTab("history")} className={`px-5 py-2 rounded-lg transition-all cursor-pointer ${activeSubTab === "history" ? "bg-slate-800 text-white" : "text-slate-400"}`}>السجل التاريخي</button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث في محفظتك..." className="bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none w-48 pr-8" />
                <svg className="w-3.5 h-3.5 text-slate-500 absolute top-3 right-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* ─── عرض الجداول والبيانات الحية المجلوبة ─── */}
        <div className="mt-2">
          {loadingData ? (
            <div className="text-center py-20 text-slate-500 font-medium text-xs animate-pulse">جاري الاتصال بـ سوبابيس ومزامنة البيانات الحية...</div>
          ) : (
            <>
              {/* تبويب المراكز */}
              {activeSubTab === "positions" && (
                processedPositions.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 border border-dashed border-slate-900 rounded-2xl">لا توجد صفقات أو مراكز تداول مفتوحة في حسابك حالياً.</div>
                ) : (
                  <div className="overflow-x-auto w-full bg-slate-900/10 border border-slate-900 rounded-2xl p-4 flex flex-col gap-4">
                    <div className="grid grid-cols-5 text-right text-[11px] font-bold text-slate-500 border-b border-slate-900 pb-3 font-mono">
                      <span className="col-span-2">السوق المالي</span>
                      <span>نوع السهم</span>
                      <span>متوسط التكلفة / الحالي</span>
                      <span>القيمة الإجمالية</span>
                    </div>
                    {processedPositions.map(pos => (
                      <div key={pos.id} className="grid grid-cols-5 text-sm items-center text-right border-b border-slate-900/50 pb-2">
                        <div className="col-span-2 flex flex-col">
                          <span className="font-bold text-white text-xs">{pos.question}</span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">{pos.ticker}</span>
                        </div>
                        <span className={`text-xs font-bold ${pos.side === "YES" ? "text-blue-400" : "text-rose-400"}`}>{pos.side} ({pos.shares} سهم)</span>
                        <span className="font-mono text-xs text-slate-300">${pos.avgCost.toFixed(2)} ← ${pos.currentPrice.toFixed(2)}</span>
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-bold text-white">${pos.currentValue.toFixed(2)}</span>
                          <span className={`text-[10px] font-mono ${pos.pnlCash >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                            {pos.pnlCash >= 0 ? "▲ +" : "▼ "}${pos.pnlCash.toFixed(2)} ({pos.pnlPercent.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* تبويب الطلبات المفتوحة */}
              {activeSubTab === "open" && (
                openOrders.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 border border-dashed border-slate-900 rounded-2xl">لا توجد صفقات معلقة بانتظار التنفيذ.</div>
                ) : (
                  <div className="overflow-x-auto w-full bg-slate-900/10 border border-slate-900 rounded-2xl p-4">
                    {/* محاكاة جدول الحركات المعلقة */}
                  </div>
                )
              )}

              {/* تبويب السجل التاريخي */}
              {activeSubTab === "history" && (
                historyTransactions.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 border border-dashed border-slate-900 rounded-2xl">سجل معاملاتك المالية فارغ تماماً.</div>
                ) : (
                  <div className="overflow-x-auto w-full bg-slate-900/10 border border-slate-900 rounded-2xl p-4 flex flex-col gap-3">
                    {historyTransactions.map(tx => (
                      <div key={tx.id} className="flex justify-between items-center text-xs border-b border-slate-900/60 pb-2">
                        <div className="flex flex-col text-right">
                          <span className="font-bold text-slate-200">{tx.markets?.question || "معاملة نظام عامة"}</span>
                          <span className="text-[10px] text-slate-500 mt-0.5 font-mono">{tx.order_type} • {tx.side}</span>
                        </div>
                        <div className="flex flex-col text-left font-mono">
                          <span className="font-bold text-white">${Number(tx.amount || tx.total_cost || 0).toFixed(2)}</span>
                          <span className="text-[9px] text-slate-600">{new Date(tx.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* مودال البوابة الفرعية لعرض معرف المحفظة لـ Privy الآمن */}
      {isAddressModalOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsAddressModalOpen(false)} />
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full relative z-10 text-right animate-fadeIn" dir="rtl">
            <h3 className="text-base font-bold text-white pb-3 border-b border-slate-800">معرف محفظتك الذكي</h3>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">هذا المعرف مخصص للربط البرمجي المباشر لعمليات السحب والإيداع المشفرة.</p>
            <div className="mt-5 flex items-center gap-2 bg-slate-950 border border-slate-850 rounded-xl p-3 font-mono text-xs text-slate-300">
              <span className="flex-1 select-all break-all text-right">{profile?.wallet_address || "لا يوجد عنوان مرتبط بعد"}</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default PortfolioPage;