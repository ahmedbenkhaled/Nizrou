import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";

function TradingSlip({ market, currentOption, onOptionChange, user, onRequiredAuth }) {
  const [amount, setAmount] = useState("");
  const [shares, setShares] = useState(0);
  const [potentialPayout, setPotentialPayout] = useState(0);
  const [roi, setRoi] = useState(0);
  const [isTrading, setIsTrading] = useState(false);
  const [dbBalance, setDbBalance] = useState(0); 

  // ⚡ توحيد جلب الأسعار اللحظية لتطابق الصيغتين (snake_case و CamelCase)
  const currentPrice = currentOption === "YES" 
    ? (market?.yes_price ?? market?.yesPrice ?? 0.5) 
    : (market?.no_price ?? market?.noPrice ?? 0.5);

  // ⚡ التحقق من حالة السوق بشكل مرن (سواء كانت الحروف كبيرة أو صغيرة)
  const marketStatus = (market?.status || "active").toUpperCase();
  const isMarketResolved = marketStatus === "RESOLVED";
  const marketOutcome = (market?.outcome || "").toUpperCase();

  // جلب الرصيد الحقيقي اللحظي للمستخدم من جدول profiles مباشرة
  useEffect(() => {
    if (!user?.id) return;

    async function fetchLiveBalance() {
      const { data, error } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", user.id)
        .single();
      
      if (!error && data) {
        setDbBalance(parseFloat(data.balance || 0));
      }
    }

    fetchLiveBalance();

    const balanceChannel = supabase
      .channel(`user-balance-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
        setDbBalance(parseFloat(payload.new.balance || 0));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(balanceChannel);
    };
  }, [user?.id]);

  // حساب الحسابات الحية ومحاكاة الانزلاق السعري ومتوسط سعر التنفيذ بأسلوب Polymarket
  const calculations = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    const currentVolume = market?.volume ?? 0;

    if (numAmount > 0 && currentPrice > 0) {
      // 1. محاكاة عمق السيولة في السيرفر لحساب السعر النهائي المتوقع بعد ضخ المبلغ
      const expectedImpact = numAmount / (Math.max(currentVolume, 500) + 1000);
      const expectedNewPrice = Math.max(0.01, Math.min(0.99, currentPrice + expectedImpact));
      
      // 2. متوسط سعر التنفيذ الفعلي (Avg. Price) الذي سيحاسب عليه المستخدم
      const avgExecutionPrice = (currentPrice + expectedNewPrice) / 2;
      
      // 3. احتساب الأسهم والعوائد والـ ROI بناءً على السعر المتوسط العادل
      const calculatedShares = numAmount / avgExecutionPrice;
      const payout = calculatedShares * 1.00;
      const calculatedRoi = ((payout - numAmount) / numAmount) * 100;
      
      // 4. نسبة الانزلاق السعري الإجمالية للعرض الإيضاحي عند الحاجة
      const priceImpactPercent = ((avgExecutionPrice - currentPrice) / currentPrice) * 100;

      return {
        shares: calculatedShares,
        potentialPayout: payout,
        roi: calculatedRoi,
        avgPrice: avgExecutionPrice,
        priceImpact: priceImpactPercent
      };
    }

    return { shares: 0, potentialPayout: 0, roi: 0, avgPrice: currentPrice, priceImpact: 0 };
  }, [amount, currentOption, currentPrice, market?.volume]);

  // تحديث الحالات المحلية بناءً على الحسابات الذكية الميموية
  useEffect(() => {
    setShares(calculations.shares);
    setPotentialPayout(calculations.potentialPayout);
    setRoi(calculations.roi);
  }, [calculations]);

  const handleOrderSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!user) return onRequiredAuth();
    
    if (isMarketResolved) {
      alert("عذراً، هذا السوق مغلق وتمت تسويته نهائياً؛ لا يمكن إجراء صفقات جديدة.");
      return;
    }

    const numAmount = parseFloat(amount);

    if (numAmount > dbBalance) {
      alert("عذراً، رصيدك الحالي غير كافٍ لإتمام هذه الصفقة.");
      return;
    }

    if (isTrading || !amount || numAmount <= 0) return;
    
    const marketEndDateRaw = market?.end_date || market?.endDate;
    const marketTime = marketEndDateRaw ? new Date(marketEndDateRaw).getTime() : null;
    const currentTime = new Date().getTime();

    if (marketTime && currentTime > marketTime) {
      return alert("عذراً، انتهت صلاحية التداول في هذا السوق بالفعل.");
    }

    try {
      setIsTrading(true);
      
      const { data, error } = await supabase.rpc("execute_secure_trade", {
        p_market_id: parseInt(market.id, 10), 
        p_user_id: user.id,
        p_option: currentOption,
        p_amount: numAmount
      });
      if (error) throw error;
      
      setDbBalance(prev => prev - numAmount);
      await supabase.from("notifications").insert([
  {
    user_id: user.id,
    title: "تم تنفيذ صفقك بنجاح 📊",
    message: `لقد استثمرت $${numAmount.toFixed(2)} في سوق: "${market?.question}" على خيار (${currentOption === 'YES' ? 'نعم' : 'لا'}).`,
    type: "order",
    market_id: parseInt(market.id, 10)
  }
]);
      alert(`تم تنفيذ صفقتك بنجاح مالي! تم شراء الأسهم وحساب تأثير السعر على المنحنى البياني.`);
      setAmount("");
    } catch (err) {
      console.error("خطأ مالي في التداول الفوري:", err.message);
      alert("فشلت المعاملة الماليّة: قد يكون السعر قد تغير فجأة أو رصيدك غير كافٍ.");
    } finally {
      setIsTrading(false);
    }
  }, [market, currentOption, amount, user, dbBalance, isTrading, onRequiredAuth, isMarketResolved]);

  if (isMarketResolved) {
    return (
      <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-6 font-cairo text-right flex flex-col items-center justify-center gap-4 sticky top-6 text-center" dir="rtl">
        <div className="w-16 h-16 bg-slate-950 rounded-full border border-slate-800 flex items-center justify-center text-2xl shadow-xl">
          🏁
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-200">تمت تسوية هذا السوق</h4>
          <p className="text-[11px] text-slate-500 mt-1">تم إغلاق التداولات وتوزيع الأرباح على التوقعات الصحيحة.</p>
        </div>

        <div className="w-full bg-slate-950 border border-slate-900 rounded-xl p-4 mt-2">
          <span className="text-xs text-slate-500 block mb-1">النتيجة النهائية الفائزة</span>
          <span className={`text-xl font-black ${marketOutcome === 'YES' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {marketOutcome === 'YES' ? 'نعم (YES)' : 'لا (NO)'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900/60 border border-slate-900 rounded-2xl p-4 font-cairo text-right flex flex-col gap-4 sticky top-6" dir="rtl">
      
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-900/60">
        <button
          type="button"
          onClick={() => onOptionChange("YES")}
          className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            currentOption === "YES"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/10"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          نعم
        </button>
        <button
          type="button"
          onClick={() => onOptionChange("NO")}
          className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            currentOption === "NO"
              ? "bg-rose-600 text-white shadow-md shadow-rose-600/10"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          لا
        </button>
      </div>

      <form onSubmit={handleOrderSubmit} className="flex flex-col gap-3">
        <div className="flex justify-between items-center px-1 text-[11px]">
          <span className="text-slate-400 font-medium">مبلغ الاستثمار</span>
          {user && (
            <span className="text-slate-500 font-mono">
              المتاح: <strong className="text-slate-300">${dbBalance.toFixed(2)}</strong>
            </span>
          )}
        </div>

        <div className="relative flex items-center">
          <input
            type="number"
            min="1"
            step="any"
            disabled={isTrading}
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 hover:border-slate-800 focus:border-blue-500 rounded-xl py-3 pl-12 pr-4 text-left font-mono text-sm font-bold text-white focus:outline-none transition-all disabled:opacity-40"
          />
          <span className="absolute left-4 font-mono text-xs font-bold text-slate-500 select-none">USD</span>
        </div>

        <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 flex flex-col gap-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">سعر السهم الحالي</span>
            <span className="font-mono font-bold text-slate-300">{(currentPrice * 100).toFixed(0)}¢</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-slate-500">الأسهم المقدرة</span>
            <span className="font-mono font-bold text-blue-400">{shares.toFixed(2)}</span>
          </div>

          <div className="w-full h-px bg-slate-900/50 my-0.5" />

          {/* 🎯 العرض المتطابق مع Polymarket: عرض الأرباح متبوعاً بمتوسط سعر الشراء الفعلي المتأثر بالانزلاق */}
          <div className="flex justify-between items-center">
            <span className="text-slate-500">العائد المحتمل (إذا فزت)</span>
            <span className="font-mono font-bold text-emerald-400">${potentialPayout.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-[11px] -mt-1 text-slate-400">
            <span className="flex items-center gap-1 group relative cursor-pointer select-none">
              متوسط سعر الشراء 
              <span className="w-3 h-3 rounded-full border border-slate-600 flex items-center justify-center text-[8px] font-bold text-slate-500">i</span>
              {parseFloat(amount) > 0 && (
                <span className="pointer-events-none absolute bottom-5 right-0 bg-slate-950 border border-slate-800 text-[10px] text-slate-400 px-2 py-1 rounded-lg w-48 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  يتضمن تأثير السعر المتوقع بنسبة +{calculations.priceImpact.toFixed(2)}% نتيجة لحجم المعاملة.
                </span>
              )}
            </span>
            <span className="font-mono font-semibold">{(calculations.avgPrice * 100).toFixed(1)}¢</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500">نسبة الربح المتوقعة (ROI)</span>
            <span className="font-mono font-bold text-blue-500">+{roi.toFixed(1)}%</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isTrading || !amount || parseFloat(amount) <= 0}
          className={`w-full py-3 rounded-xl text-xs font-bold transition-all shadow-lg text-center cursor-pointer disabled:opacity-40 ${
            !amount || parseFloat(amount) <= 0
              ? "bg-slate-900 text-slate-600 border border-slate-900 cursor-not-allowed shadow-none"
              : currentOption === "YES"
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10"
              : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/10"
          }`}
        >
          {isTrading ? "جاري تنفيذ الصفقة..." : currentOption === "YES" ? "شراء أسهم نعم" : "شراء أسهم لا"}
        </button>
      </form>
    </div>
  );
}

export default TradingSlip;