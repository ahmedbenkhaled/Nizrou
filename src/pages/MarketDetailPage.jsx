import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo, useRef } from "react"; 
import { useAuth } from "../context/AuthContext"; 
import { supabase } from "../lib/supabaseClient"; 
import Navbar from "../components/Navbar";       
import Footer from "../components/Footer";       
import TradingSlip from "../components/TradingSlip"; 
import HowItWorksModal from "../components/HowItWorksModal"; 
import { formatDateToArabic, formatCategoryName, formatMarketVolume } from "../utils/formatters";

function MarketDetailPage({ 
  isModalOpen, 
  setIsModalOpen, 
  modalView, 
  setModalView 
}) { 
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); 

  const safeId = useMemo(() => id ? decodeURIComponent(id) : "", [id]);

  const [currentOption, setCurrentOption] = useState(() => location.state?.initialOption || "YES");
  const [market, setMarket] = useState(null);
  const [dbTrades, setDbTrades] = useState([]); 
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [hoveredPoint, setHoveredPoint] = useState({ x: 560, y: 100, active: false, label: "", price: 0 });
  const [activeTimeframe, setActiveTimeframe] = useState("الكل");
  const [activeRulesTab, setActiveRulesTab] = useState("rules"); 
  const [activeCommentsTab, setActiveCommentsTab] = useState("comments");
  const [sortBy, setSortBy] = useState("newest");
  const [filterHolders, setFilterHolders] = useState(false);
  const [isSaved, setIsSaved] = useState(() => localStorage.getItem(`saved_market_${safeId}`) === "true");
  const [commentsLimit, setCommentsLimit] = useState(5);

  const chartContainerRef = useRef(null);

  // حقول حية لحفظ مركز المستخدم الحالي وقائمة كبار الملاك
  const [userPosition, setUserPosition] = useState(null);
  const [topHolders, setTopHolders] = useState({ yes: [], no: [] });
  const [positionsLeaderboard, setPositionsLeaderboard] = useState({ yes: [], no: [] });

// 📈 جلب ومراقبة لوحة الصدارة للأرباح (PNL Leaderboard) لحظياً وتحديثها مع حركة السوق
  // 📈 جلب ومراقبة لوحة الصدارة للأرباح (PNL Leaderboard) الحقيقية 100% من تاريخ الصفقات
 // 📈 جلب ومراقبة لوحة الصدارة للأرباح (PNL Leaderboard) الحقيقية 100% من تاريخ الصفقات
  useEffect(() => {
    if (!safeId || activeCommentsTab !== "positions") return;
    
    const numericId = parseInt(safeId, 10);
    if (isNaN(numericId)) return;

    async function fetchPositionsLeaderboard() {
      // 1️⃣ جلب المراكز الحالية وجلب تفاصيل صفقات السوق الفعلي بدون تصفية خاطئة للـ status
      const { data: positionsData, error: posError } = await supabase
        .from("user_positions")
        .select(`
          user_id,
          yes_shares, no_shares,
          profiles ( display_name, avatar_url )
        `)
        .eq("market_id", numericId);

      const { data: tradesData, error: tradeError } = await supabase
        .from("transactions")
        .select("user_id, option_type, shares_count, price, side") // مطابقة دقيقة لحقول جدولك الفعلي
        .eq("market_id", numericId);

      if (!posError && positionsData && !tradeError && tradesData) {
        const currentYesPrice = market?.yesPrice ?? 0.5;
        const currentNoPrice = market?.noPrice ?? 0.5;

        // دالة مساعدة تحسب متوسط سعر الدخول الفعلي (Weighted Average) لكل مستخدم بدقة متناهية
        const calculateActualAvgEntry = (userId, optionType) => {
          const userTrades = tradesData.filter(
            t => t.user_id === userId && t.option_type?.toUpperCase() === optionType
          );

          let totalCost = 0;
          let totalShares = 0;

          userTrades.forEach(t => {
            const shares = parseFloat(t.shares_count || 0);
            const pricePaid = parseFloat(t.price || 0); // الاعتماد على حقل price من جدولك مباشرة

            if (t.side?.toLowerCase() === "buy") {
              totalCost += (shares * pricePaid); // إجمالي المبلغ المدفوع = الأسهم * السعر
              totalShares += shares;
            } else if (t.side?.toLowerCase() === "sell") {
              // للحفاظ على دقة المتوسط عند البيع الجزئي للأسهم
              const avgBeforeSell = totalShares > 0 ? totalCost / totalShares : 0;
              totalShares = Math.max(0, totalShares - shares);
              totalCost = totalShares * avgBeforeSell;
            }
          });

          // إذا لم يجد صفقات مسجلة مطلقاً في الـ History (Fallback)، يعود بسعر السوق الحالي بدلاً من 50¢ ثابتة
          if (totalShares === 0) {
            return optionType === "YES" ? currentYesPrice : currentNoPrice;
          }

          return totalCost / totalShares;
        };

        // 🟢 حساب أرباح ومراكز خيار نعم (YES) الفعلي
        const yesPositions = positionsData
          .filter(h => parseFloat(h.yes_shares || 0) > 0)
          .map(h => {
            const shares = parseFloat(h.yes_shares);
            const actualEntryPrice = calculateActualAvgEntry(h.user_id, "YES"); 
            const currentVal = shares * currentYesPrice;
            const entryVal = shares * actualEntryPrice;
            const pnl = currentVal - entryVal; // الربح أو الخسارة الحقيقية بالدولار

            return { ...h, pnl, avgEntry: actualEntryPrice };
          })
          .sort((a, b) => b.pnl - a.pnl) // الترتيب من الأكثر ربحاً للأقل
          .slice(0, 7);

        // 🔴 حساب أرباح ومراكز خيار لا (NO) الفعلي
        const noPositions = positionsData
          .filter(h => parseFloat(h.no_shares || 0) > 0)
          .map(h => {
            const shares = parseFloat(h.no_shares);
            const actualEntryPrice = calculateActualAvgEntry(h.user_id, "NO");
            const currentVal = shares * currentNoPrice;
            const entryVal = shares * actualEntryPrice;
            const pnl = currentVal - entryVal;

            return { ...h, pnl, avgEntry: actualEntryPrice };
          })
          .sort((a, b) => b.pnl - a.pnl)
          .slice(0, 7);

        setPositionsLeaderboard({ yes: yesPositions, no: noPositions });
      }
    }

    fetchPositionsLeaderboard();

    // القنوات الحية: إعادة الحساب الفوري لحظة تحديث المراكز أو حقن صفقة جديدة في التداولات
    const leaderboardChannel = supabase
      .channel(`realtime-pnl-exact-${safeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_positions', filter: `market_id=eq.${numericId}` }, () => {
        fetchPositionsLeaderboard();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `market_id=eq.${numericId}` }, () => {
        fetchPositionsLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leaderboardChannel);
    };
  }, [safeId, activeCommentsTab, market?.yesPrice, market?.noPrice]);

  // 🏆 جلب ومراقبة كبار الملاك المستثمرين (Top Holders) في هذا السوق لحظياً
  useEffect(() => {
    if (!safeId || activeCommentsTab !== "owners") return;
    
    const numericId = parseInt(safeId, 10);
    if (isNaN(numericId)) return;

    async function fetchTopHolders() {
      const { data, error } = await supabase
        .from("user_positions")
        .select(`
          yes_shares, no_shares,
          profiles ( display_name, avatar_url )
        `)
        .eq("market_id", numericId);

      if (!error && data) {
        // 🟢 تصفية وترتيب حاملي أسهم نعم (YES) - تنازلياً
        const yesHolders = data
          .filter(h => parseFloat(h.yes_shares || 0) > 0)
          .sort((a, b) => parseFloat(b.yes_shares) - parseFloat(a.yes_shares))
          .slice(0, 7);

        // 🔴 تصفية وترتيب حاملي أسهم لا (NO) - تنازلياً
        const noHolders = data
          .filter(h => parseFloat(h.no_shares || 0) > 0)
          .sort((a, b) => parseFloat(b.no_shares) - parseFloat(a.no_shares))
          .slice(0, 7);

        setTopHolders({ yes: yesHolders, no: noHolders });
      }
    }

    fetchTopHolders();

    // الاستماع اللحظي لتحديث قائمة كبار الملاك فور حدوث صفقات شراء ضخمة تُغيّر الترتيب
    const holdersChannel = supabase
      .channel(`realtime-holders-${safeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_positions', filter: `market_id=eq.${numericId}` }, () => {
        fetchTopHolders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(holdersChannel);
    };
  }, [safeId, activeCommentsTab]);

  // 👤 جلب ومراقبة مركز المستخدم النشط حالياً في هذا السوق لملء الـ State وإظهار كارت الحساب الخاص
  useEffect(() => {
    if (!safeId || !user) {
      setUserPosition(null);
      return;
    }
    
    const numericId = parseInt(safeId, 10);
    if (isNaN(numericId)) return;

    async function fetchUserPosition() {
      const { data, error } = await supabase
        .from("user_positions")
        .select("yes_shares, no_shares")
        .eq("market_id", numericId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setUserPosition(data);
      } else {
        setUserPosition(null);
      }
    }

    fetchUserPosition();

    // مراقبة مركز المستخدم الفعلي وتغيير الأرقام فوراً عند تنفيذه لأي عملية تداول
    const positionChannel = supabase
      .channel(`user-position-${safeId}-${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_positions', 
        filter: `market_id=eq.${numericId} AND user_id=eq.${user.id}` 
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setUserPosition(null);
        } else {
          setUserPosition(payload.new);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(positionChannel);
    };
  }, [safeId, user]);

  useEffect(() => {
    setNewComment("");
  }, [safeId]);

  useEffect(() => {
    let isMounted = true;
    const cleanId = safeId;

    async function fetchData() {
      if (!cleanId) return;
      try {
        setIsLoading(true);
        const numericId = parseInt(cleanId, 10);
        
        if (isNaN(numericId)) {
          throw new Error("المعرف المستلم ليس رقماً صالحاً.");
        }

        const { data: mData, error: mError } = await supabase
          .from("markets")
          .select("*")
          .eq("id", numericId)
          .single();

        if (mError) throw mError;

        const formattedMarket = {
          ...mData,
          created_at: mData.created_at,
          initial_price: mData.initial_price ?? 0.5,
          endDate: mData.end_date || mData.endDate,
          yesPrice: mData.yes_price ?? mData.yesPrice ?? 0.5,
          noPrice: mData.no_price ?? mData.noPrice ?? 0.5,
          volume: mData.volume ?? 0,
          ticker: mData.ticker || `NZ-${mData.id}`,
          image_url: mData.image_url || null,
        };

        const { data: tData, error: tError } = await supabase
          .from("transactions")
          .select("created_at, resulting_yes_price")
          .eq("market_id", numericId)
          .order("created_at", { ascending: true });

        if (tError) {
          console.error("⚠️ فشل جلب الصفقات الحقيقية:", tError.message);
        }

        const { data: cData, error: cError } = await supabase
          .from("comments")
          .select(`
            id, text, created_at, user_id,
            profiles ( display_name, avatar_url, is_holder )
          `)
          .eq("market_id", numericId)
          .order('created_at', { ascending: false });

        if (cError) throw cError;

        if (isMounted) {
          setMarket(formattedMarket); 
          setDbTrades(tData || []); 
          setComments(cData || []);
        }
      } catch (err) {
        console.error("📡 خطأ حرج في جلب البيانات الفعلية:", err);
        if (isMounted) setMarket(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchData();

    const marketChannel = supabase
      .channel(`realtime-market-detail-${cleanId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'markets', filter: `id=eq.${cleanId}` }, (payload) => {
        if (isMounted) {
          setMarket(prev => ({
            ...prev,
            ...payload.new,
            endDate: payload.new.end_date || payload.new.endDate || "2026-12-31",
            yesPrice: payload.new.yes_price ?? payload.new.yesPrice ?? 0.5,
            noPrice: payload.new.no_price ?? payload.new.noPrice ?? 0.5,
          }));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `market_id=eq.${cleanId}` }, (payload) => {
        if (isMounted) {
          setDbTrades(prev => [...prev, {
            created_at: payload.new.created_at,
            resulting_yes_price: payload.new.resulting_yes_price
          }]);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `market_id=eq.${cleanId}` }, async (payload) => {
        // تحسين وحماية الأداء: إذا كان التعليق الحسي من المستخدم الحالي ندمجه فوراً لتوفير طلبات الـ N+1 الاستعلامية المتتالية
        let profileData = null;
        if (user && payload.new.user_id === user.id) {
          profileData = {
            display_name: user.user_metadata?.display_name || "أنت",
            avatar_url: user.user_metadata?.avatar_url || null,
            is_holder: userPosition ? true : false
          };
        } else {
          const { data } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, is_holder')
            .eq('id', payload.new.user_id)
            .single();
          profileData = data;
        }

        const fullComment = { ...payload.new, profiles: profileData };
        if (isMounted) setComments((prev) => [fullComment, ...prev]);
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(marketChannel);
    };
  }, [safeId, user, userPosition]);

  const handleCopyLink = useCallback(() => {
    const productionDomain = window.location.origin; 
    const shareUrl = `${productionDomain}/market/${safeId}`;
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [safeId]);

  const toggleFavorite = useCallback(() => {
    if (!user) {
      setModalView("login");
      setIsModalOpen(true);
      return;
    }
    setIsSaved((prev) => {
      const nextState = !prev;
      localStorage.setItem(`saved_market_${safeId}`, String(nextState));
      return nextState;
    });
  }, [user, safeId, setIsModalOpen, setModalView]);

  const handlePostComment = useCallback(async () => {
    if (!newComment.trim()) return;
    if (!user) {
      setModalView("login");
      setIsModalOpen(true);
      return;
    }
    if (isSubmitting) return;

    const cleanText = newComment.replace(/<[^>]*>/g, "").trim();
    if (!cleanText) return;

    try {
      setIsSubmitting(true);
      const { data, error } = await supabase.from("comments").insert([
        { 
          market_id: parseInt(safeId, 10), 
          user_id: user.id, 
          text: cleanText
        }
      ]).select();

      if (error) throw error;
      setNewComment(""); 
    } catch (error) {
      alert("حدث خطأ في الشبكة، حاول مجدداً.");
    } finally {
      setIsSubmitting(false); 
    }
  }, [newComment, safeId, user, isSubmitting, setIsModalOpen, setModalView]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePostComment();
    }
  }, [handlePostComment]);

  const triggerAuthModal = useCallback(() => {
    setModalView("login");
    setIsModalOpen(true);
  }, [setIsModalOpen, setModalView]);

  const yesPrice = market?.yesPrice ?? 0.5;
  const noPrice = market?.noPrice ?? 0.5;
  const currentPriceDisplay = currentOption === "YES" ? yesPrice : noPrice;

  const formatTradeLabel = (tradeTime, marketStartTime) => {
    const diffMs = new Date(tradeTime) - new Date(marketStartTime);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "عند الافتتاح";
    if (diffMins < 60) return `بعد ${diffMins} دقيقة`;
    if (diffHours < 24) return `بعد ${diffHours} ساعة`;
    return `بعد ${diffDays} يوم`;
  };

 const chartPoints = useMemo(() => {
  if (!market) return [];
  const nowTime = new Date().getTime();
  const currentPriceVal = currentOption === "YES" ? yesPrice : noPrice;

  let rawPoints = [
    { created_at: market.created_at, resulting_yes_price: market.initial_price ?? 0.5 }
  ];

  dbTrades.forEach(t => {
    rawPoints.push({
      created_at: t.created_at,
      resulting_yes_price: t.resulting_yes_price
    });
  });

  rawPoints.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const filteredRaw = rawPoints.filter(pt => {
    const ptTime = new Date(pt.created_at).getTime();
    if (activeTimeframe === "1H") return (nowTime - ptTime) <= 3600000;
    if (activeTimeframe === "6H") return (nowTime - ptTime) <= 21600000;
    return true;
  });

  if (filteredRaw.length === 0) {
    return [
      { x: 0, y: 190 - (currentPriceVal * 180), label: "بدء النطاق", price: currentPriceVal },
      { x: 560, y: 190 - (currentPriceVal * 180), label: "الآن الحاضر", price: currentPriceVal }
    ];
  }

  const firstTime = new Date(filteredRaw[0].created_at).getTime();
  const lastTime = Math.max(nowTime, new Date(filteredRaw[filteredRaw.length - 1].created_at).getTime());
  const totalDuration = lastTime - firstTime || 1;

  // 1️⃣ قمنا بتخزين مخرجات الـ map هنا في متغير points بدلاً من عمل return مباشر
  let points = filteredRaw.map((pt) => {
    const ptTime = new Date(pt.created_at).getTime();
    const x = ((ptTime - firstTime) / totalDuration) * 560;
    const priceVal = currentOption === "YES" ? pt.resulting_yes_price : (1 - pt.resulting_yes_price);
    const y = 190 - (priceVal * 180);
        
    return {
      x: Math.max(0, Math.min(560, x)),
      y,
      label: formatTradeLabel(pt.created_at, market.created_at),
      price: priceVal
    };
  });

  // 2️⃣ هنا أضفنا شرط إغلاق وتسوّية السوق لإجبار المنحنى على القفز إلى 100% أو 0% في النهاية
  if (market.status === 'resolved' || market.status === 'closed') {
    const finalPrice = market.outcome === currentOption ? 1.0 : 0.0;
    const y = 190 - (finalPrice * 180);

    points.push({
      x: 560, // عند نهاية الرسم البياني تماماً
      y,
      label: "تمت التسوية",
      price: finalPrice
    });
  }

  // 3️⃣ إرجاع النقاط كاملة بعد التحقق
  return points;

}, [market, dbTrades, currentOption, yesPrice, noPrice, activeTimeframe]);

  const activePoints = useMemo(() => {
    if (!hoveredPoint.active) return chartPoints;
    return chartPoints.filter(p => p.x <= hoveredPoint.x);
  }, [chartPoints, hoveredPoint]);
  
  const handleChartInteraction = useCallback((clientX, currentTarget) => {
    const rect = currentTarget.getBoundingClientRect();
    if (rect.width === 0 || chartPoints.length === 0) return;
    
    const relativeX = (clientX - rect.left) / rect.width;
    const targetX = relativeX * 560;
    
    let closestPoint = chartPoints[0];
    let minDiff = Math.abs(chartPoints[0].x - targetX);
    
    for (let i = 1; i < chartPoints.length; i++) {
      const diff = Math.abs(chartPoints[i].x - targetX);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = chartPoints[i];
      }
    }
    
    setHoveredPoint({
      x: closestPoint.x,
      y: closestPoint.y,
      active: true,
      label: closestPoint.label,
      price: closestPoint.price
    });
  }, [chartPoints]);

  const dynamicPathD = useMemo(() => {
    if (activePoints.length === 0) return "M 0 100";
    return activePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [activePoints]);

  const lastActivePoint = useMemo(() => {
    return activePoints[activePoints.length - 1] || { x: 560, y: 100 };
  }, [activePoints]);

  const dynamicGlowD = useMemo(() => {
    if (!dynamicPathD || dynamicPathD === "M 0 100") {
      return `M 0 190 L 0 100 L 560 100 L 560 190 Z`;
    }
    return `M 0 190 L ${dynamicPathD.substring(2)} L ${lastActivePoint.x} 190 Z`;
  }, [dynamicPathD, lastActivePoint]);

  const chartColor = useMemo(() => {
    return currentOption === "YES" ? "#10b981" : "#f43f5e"; 
  }, [currentOption]);

  const processedComments = useMemo(() => {
    let list = [...comments];
    if (filterHolders) {
      list = list.filter(c => c.profiles?.is_holder === true);
    }
    return list.sort((a, b) => {
      return sortBy === "newest" 
        ? new Date(b.created_at) - new Date(a.created_at)
        : new Date(a.created_at) - new Date(b.created_at);
    });
  }, [comments, sortBy, filterHolders]);

  const rulesData = useMemo(() => [
    { id: "r1", text: `• يستند هذا السوق بشكل أساسي وصارم على البيانات الصادرة من الجهات المعنية الموثقة بحلول تاريخ الإغلاق.` },
    { id: "r2", text: `• إذا تأخرت الأنباء، يحتفظ النظام بحق تمديد الإغلاق لفترة إضافية أقصاها 14 يوماً فقط لحين التوثيق المالي.` },
    { id: "r3", text: `• يتم تسوية الأسهم الرابحة تلقائياً بقيمة 1.00$ لكل سهم، في حين تؤول قيمة الأسهم الخاسرة إلى الصفر تماماً.` }
  ], []);

  const contextData = useMemo(() => [
    { id: "c1", text: `• يتم تحديث هذا السوق بناءً على المؤشرات العامة المرتبطة بالفئة: ${market?.category || "عام"}.` },
    { id: "c2", text: `• تم إطلاق هذا السوق لتوفير مساحة توقعات شفافة ومفتوحة بالكامل لرموز التداول الفريدة.` }
  ], [market]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-cairo">
        جاري تحميل البيانات الحية السلسة...
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center font-cairo">
        <p className="text-sm text-slate-400 mb-4">السوق المطلوبة غير موجودة حالياً.</p>
        <button onClick={() => navigate("/")} className="px-4 py-2 bg-blue-600 text-white text-xs rounded-xl cursor-pointer">العودة للرئيسية</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Navbar 
        isModalOpen={isModalOpen} 
        setIsModalOpen={setIsModalOpen} 
        modalView={modalView} 
        setModalView={setModalView} 
      />

      <main className="w-full max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start" dir="rtl">
        
        <div className="lg:col-span-2 flex flex-col gap-6 text-right">
          
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-md">
                {formatCategoryName(market.category)}
              </span>
              <span className="text-xs text-slate-500">
                ينتهي في {formatDateToArabic(market.endDate)}
              </span>
            </div>

            <div className="flex justify-between items-start gap-4 w-full">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center font-mono font-bold text-xs text-slate-400 select-none">
                  {market.ticker || `NZ-${market.id}`}
                </div>
                <h1 className="text-lg md:text-2xl font-bold text-slate-100 leading-snug flex-1 break-words">
                  {market.question}
                </h1>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                <button 
                  onClick={toggleFavorite}
                  className="p-2 rounded-xl bg-slate-900/60 border border-slate-900 hover:border-slate-800 hover:bg-slate-900 transition-all active:scale-95 cursor-pointer" 
                  title="حفظ في المفضلة"
                >
                  <svg className={`w-4 h-4 ${isSaved ? "text-amber-400 fill-amber-400" : "text-slate-400"}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.151-.326.613-.326.765 0l2.378 5.105 5.433.243c.36.016.504.465.224.693l-4.144 3.393 1.258 5.21c.084.346-.29.62-.593.433L12 16.241l-4.665 2.536c-.302.187-.677-.087-.593-.433l1.258-5.21-4.144-3.393c-.28-.228-.136-.677.224-.693l5.433-.243 2.378-5.105z" />
                  </svg>
                </button>
                <button 
                  onClick={handleCopyLink}
                  className="p-2 rounded-xl bg-slate-900/60 border border-slate-900 hover:border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white transition-all active:scale-95 cursor-pointer"
                  title="نسخ رابط المشاركة"
                >
                  {isCopied ? (
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742a3 3 0 114.243 4.243l-3.522 3.522a3 3 0 01-4.243-4.243l1.102-1.101" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col gap-6">
            <div className="w-full bg-slate-950/40 border border-slate-900/60 p-6 rounded-2xl flex flex-col gap-2 relative">
              <div className="flex flex-col items-start text-right font-cairo z-10">
                <span className="text-xs font-bold text-slate-400 mb-1 tracking-wider">
                  {currentOption === "YES" ? "خيار نعم / مؤشر التداول" : "خيار لا / مؤشر التداول"}
                </span>
                <div className="flex items-baseline gap-2 flex-row-reverse">
                  <span className="text-3xl font-black text-slate-100 font-mono">
                    {hoveredPoint.active ? (hoveredPoint.price * 100).toFixed(0) : (currentPriceDisplay * 100).toFixed(0)}¢
                  </span>
                </div>
              </div>

              <div ref={chartContainerRef} className="w-full h-[260px] relative mt-2 select-none touch-pan-y" dir="ltr">
                <svg 
                  className="w-full h-full overflow-visible" 
                  viewBox="0 0 600 220" 
                  preserveAspectRatio="none"
                  onMouseMove={(e) => handleChartInteraction(e.clientX, e.currentTarget)}
                  onTouchMove={(e) => {
                    if (e.touches && e.touches[0]) {
                      const touch = e.touches[0];
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = touch.clientX - rect.left;
                      if (x >= 0 && x <= rect.width) {
                        if (e.cancelable) e.preventDefault();
                        handleChartInteraction(touch.clientX, e.currentTarget);
                      }
                    }
                  }}
                  onMouseLeave={() => setHoveredPoint(prev => ({ ...prev, active: false }))}
                  onTouchEnd={() => setHoveredPoint(prev => ({ ...prev, active: false }))}
                >
                  <defs>
                    <linearGradient id="chartGlowGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartColor} stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                    </linearGradient>
                    <filter id="glowBlur" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                    </filter>
                  </defs>

                  <g className="stroke-slate-900" strokeWidth="1" strokeDasharray="4,4">
                    <line x1="0" y1="10" x2="560" y2="10" />   
                    <line x1="0" y1="50" x2="560" y2="50" />   
                    <line x1="0" y1="100" x2="560" y2="100" /> 
                    <line x1="0" y1="150" x2="560" y2="150" /> 
                    <line x1="0" y1="190" x2="560" y2="190" /> 
                  </g>

                  <g className="font-mono text-[10px] fill-slate-600" textAnchor="start">
                    <text x="570" y="13">100¢</text>
                    <text x="570" y="53">75¢</text>
                    <text x="570" y="103">50¢</text>
                    <text x="570" y="153">25¢</text>
                    <text x="570" y="193">0¢</text>
                  </g>

                  <path d={dynamicGlowD} fill="url(#chartGlowGradient)" filter="url(#glowBlur)" className="transition-all duration-300 ease-in-out" pointerEvents="none" />
                  <path d={dynamicPathD} fill="none" stroke={chartColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx={hoveredPoint.active ? hoveredPoint.x : lastActivePoint.x} cy={hoveredPoint.active ? hoveredPoint.y : lastActivePoint.y} r="5" fill={chartColor} />

                  {hoveredPoint.active && (
                    <g transform={`translate(${Math.max(10, Math.min(500, hoveredPoint.x - 45))}, ${Math.max(40, hoveredPoint.y - 50)})`}>
                      <rect width="90" height="40" rx="6" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
                      <text x="45" y="16" textAnchor="middle" fill={chartColor} className="font-mono text-[11px] font-bold">
                        {(hoveredPoint.price * 100).toFixed(0)}¢
                      </text>
                      <text x="45" y="30" textAnchor="middle" fill="#64748b" className="font-cairo text-[9px]">
                        {hoveredPoint.label}
                      </text>
                    </g>
                  )}
                </svg>

                <div className="absolute bottom-0 left-0 w-[560px] flex justify-between text-[10px] font-cairo text-slate-600 px-1 border-t border-slate-900/40 pt-2 select-none">
                  {chartPoints.length <= 2 ? (
                    <><span>لحظة فتح السوق</span><span>الآن</span></>
                  ) : (
                    <>
                      <span>{chartPoints[0]?.label || "الافتتاح"}</span>
                      <span>{chartPoints[Math.floor(chartPoints.length / 2)]?.label || "منتصف المدة"}</span>
                      <span>الآن الحاضر</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-500 font-cairo border-t border-slate-900/60 pt-3 mt-1" dir="rtl">
                <div className="flex items-center gap-1">
                  <span>حجم التداول الإجمالي:</span>
                  <span className="text-slate-300 font-mono font-bold">{formatMarketVolume(market.volume)}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-500 font-mono">
                  <div className="flex gap-1.5 text-[10px] bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-800/80 text-slate-400">
                    {["1H", "6H", "الكل"].map((tf) => (
                      <button
                        key={tf}
                        role="tab"
                        aria-selected={activeTimeframe === tf}
                        onClick={() => setActiveTimeframe(tf)}
                        className={`px-1.5 py-0.5 rounded-md cursor-pointer transition-all font-bold ${
                          activeTimeframe === tf ? "bg-blue-600/10 text-blue-500 border border-blue-500/20" : "hover:text-slate-200"
                        }`}
                      >
                        {tf === "1H" ? "ساعة" : tf === "6H" ? "6 ساعات" : "الكل"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full border-t border-slate-900/60 pt-6 flex flex-col gap-4 text-right">
              <div className="flex gap-6 border-b border-slate-900/40 pb-2 text-xs font-bold">
                {["rules", "context"].map((tab) => (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={activeRulesTab === tab}
                    onClick={() => setActiveRulesTab(tab)}
                    className={`pb-2 cursor-pointer transition-all ${activeRulesTab === tab ? "text-white border-b-2 border-blue-500" : "text-slate-500 hover:text-slate-400"}`}
                  >
                    {tab === "rules" ? "القواعد الشاملة" : "سياق السوق اللحظي"}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-3 text-xs leading-relaxed text-slate-400 font-cairo">
                {activeRulesTab === "rules" ? (
                  rulesData.map(r => <p key={r.id}>{r.text}</p>)
                ) : (
                  contextData.map(c => <p key={c.id}>{c.text}</p>)
                )}
              </div>
            </div>
          </div>

          <div className="w-full border-t border-slate-900/60 pt-6 flex flex-col gap-5 text-right font-cairo">
            <div className="flex gap-6 border-b border-slate-900/40 pb-2 text-xs font-bold text-slate-500">
              {[
                { id: "comments", label: "التعليقات الحية", count: !isLoading ? processedComments.length.toString() : null }, 
                { id: "owners", label: "كبار الملاك" },
                { id: "positions", label: "المراكز المفتوحة" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeCommentsTab === tab.id}
                  onClick={() => setActiveCommentsTab(tab.id)}
                  className={`pb-2 cursor-pointer transition-all flex items-center gap-1.5 ${
                    activeCommentsTab === tab.id ? "text-white border-b-2 border-blue-500" : "hover:text-slate-400"
                  }`}
                >
                  {tab.label}
                  {tab.count && <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded-md text-slate-400 font-mono">{tab.count}</span>}
                </button>
              ))}
            </div>

           {activeCommentsTab === "comments" && (
              <>
                <div className="w-full bg-slate-950/20 border border-slate-900 p-4 rounded-xl flex flex-col gap-3">
                  <textarea 
                    value={newComment} 
                    onChange={(e) => setNewComment(e.target.value)} 
                    onKeyDown={handleKeyDown}
                    disabled={isSubmitting}
                    placeholder={!user ? "يجب تسجيل الدخول لإضافة تعليق..." : "أضف تعليقاً على هذا السوق الحالي..."} 
                    className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none resize-none h-14 leading-relaxed text-right disabled:opacity-50"
                  />
                  <div className="flex justify-between items-center border-t border-slate-900/60 pt-3" dir="ltr">
                    <button 
                      onClick={handlePostComment} 
                      disabled={isSubmitting || !newComment.trim()}
                      className={`px-4 py-1.5 text-white font-bold text-xs rounded-lg transition-all ${
                        isSubmitting ? "bg-blue-600/40 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 active:scale-95 cursor-pointer disabled:opacity-40"
                      }`}
                    >
                      {isSubmitting ? "جاري النشر..." : "نشر التعليق"}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px]" dir="rtl">
                  <div className="flex items-center gap-4 text-slate-400">
                    <button onClick={() => setSortBy(prev => prev === "newest" ? "oldest" : "newest")} className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
                      <span>{sortBy === "newest" ? "الأحدث أولاً" : "الأقدم أولاً"}</span>
                    </button>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input type="checkbox" checked={filterHolders} onChange={(e) => setFilterHolders(e.target.checked)} className="accent-blue-500 rounded text-xs" />
                      <span>الملاك والمستثمرين فقط</span>
                    </label>
                  </div>
                </div>
              
                <div className="flex flex-col gap-4 mt-1">
                  {processedComments.length === 0 ? (
                    <div className="w-full py-8 text-center border border-dashed border-slate-900/60 rounded-xl bg-slate-950/10">
                      <p className="text-xs text-slate-500 font-cairo">لا توجد تعليقات بعد، كن أول من يشارك رأيه الموثق!</p>
                    </div>
                  ) : (
                    processedComments.slice(0, commentsLimit).map((comment) => (
                      <div key={comment.id} className="flex gap-3 border-b border-slate-900/30 pb-4 animate-fadeIn">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 overflow-hidden">
                          {comment.profiles?.avatar_url && <img src={comment.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-slate-200">{comment.profiles?.display_name || "مستخدم مجهول"}</span>
                            {comment.profiles?.is_holder && <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-bold">مالك أسهم</span>}
                            <span className="text-[10px] text-slate-500">{new Date(comment.created_at || new Date().toISOString()).toLocaleDateString("ar-EG")}</span>
                          </div>
                          <p className="text-xs text-slate-300 break-words whitespace-pre-line">{comment.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {processedComments.length > commentsLimit && (
                  <button onClick={() => setCommentsLimit(prev => prev + 5)} className="mx-auto mt-4 px-5 py-2 bg-slate-900/40 hover:bg-slate-900 border border-slate-900 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer">
                    عرض المزيد من التعليقات الحية
                  </button>
                )}
              </>
            )}

            {/* 📈 تبويب المراكز المفتوحة (User Positions) الحية */}
            {/* 📈 تبويب المراكز المفتوحة والأرباح (Positions & PNL) المتطابق مع Polymarket */}
            {activeCommentsTab === "positions" && (
              <div className="w-full flex flex-col gap-6" dir="rtl">
                
                {/* 1. كارت المركز المالي السري والخاص بالمستخدم الحالي أولاً */}
                {user && userPosition && (parseFloat(userPosition.yes_shares || 0) > 0 || parseFloat(userPosition.no_shares || 0) > 0) && (
                  <div className="w-full bg-blue-950/10 border border-blue-900/40 rounded-xl p-4 flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-blue-400">مركزك الاستثماري الحالي في هذا السوق:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs mt-1">
                      <div className="flex flex-col">
                        <span className="text-slate-500 text-[10px]">نوع السهم</span>
                        <span className={`font-bold ${parseFloat(userPosition.yes_shares || 0) > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {parseFloat(userPosition.yes_shares || 0) > 0 ? "YES (نعم)" : "NO (لا)"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-500 text-[10px]">الأسهم المملوكة</span>
                        <span className="font-mono text-slate-200 font-bold">
                          {parseFloat(userPosition.yes_shares || 0) > 0 ? parseFloat(userPosition.yes_shares).toFixed(2) : parseFloat(userPosition.no_shares).toFixed(2)} سهم
                        </span>
                      </div>
                      <div className="flex flex-col col-span-2 sm:col-span-1">
                        <span className="text-slate-500 text-[10px]">القيمة الاستردادية النهائية</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          ${parseFloat(userPosition.yes_shares || 0) > 0 ? parseFloat(userPosition.yes_shares).toFixed(2) : parseFloat(userPosition.no_shares).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. لوحة الصدارة العامة للأرباح والخسائر (PNL Leaderboard) عمودين متوازيين */}
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  
                  {/* عمود نعم (Oui) */}
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400 border-b border-slate-900 pb-2 px-1">
                      <span>Oui</span>
                      <span>PNL</span>
                    </div>
                    {positionsLeaderboard.yes.length === 0 ? (
                      <div className="text-[11px] text-slate-600 py-4 text-center">لا توجد مراكز نشطة</div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {positionsLeaderboard.yes.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center px-1 text-xs hover:bg-slate-900/20 py-1 rounded-lg transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden flex-shrink-0">
                                {item.profiles?.avatar_url && <img src={item.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-slate-300 font-medium">{item.profiles?.display_name || "مستخدم مجهول"}</span>
                                <span className="text-[10px] text-slate-500 font-mono">moy. {(item.avgEntry * 100).toFixed(0)}¢</span>
                              </div>
                            </div>
                            <span className="font-mono font-bold text-emerald-400">
                              ${item.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* عمود لا (Non) */}
                  <div className="flex flex-col gap-3 border-t md:border-t-0 md:border-r border-slate-900 pt-4 md:pt-0 md:pr-6">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400 border-b border-slate-900 pb-2 px-1">
                      <span>Non</span>
                      <span>PNL</span>
                    </div>
                    {positionsLeaderboard.no.length === 0 ? (
                      <div className="text-[11px] text-slate-600 py-4 text-center">لا توجد مراكز نشطة</div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {positionsLeaderboard.no.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center px-1 text-xs hover:bg-slate-900/20 py-1 rounded-lg transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden flex-shrink-0">
                                {item.profiles?.avatar_url && <img src={item.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-slate-300 font-medium">{item.profiles?.display_name || "مستخدم مجهول"}</span>
                                <span className="text-[10px] text-slate-500 font-mono">moy. {(item.avgEntry * 100).toFixed(0)}¢</span>
                              </div>
                            </div>
                            <span className="font-mono font-bold text-emerald-400">
                              ${item.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* 🏆 تبويب كبار الملاك (Top Holders) */}
            {/* 🏆 تبويب كبار الملاك المتطابق تماماً مع Polymarket (عمودين منفصلين) */}
            {activeCommentsTab === "owners" && (
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6" dir="rtl">
                
                {/* العمود الأيمن: ملاك نعم (YES Holders) */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400 border-b border-slate-900 pb-2 px-1">
                    <span>ملاك نعم (YES holders)</span>
                    <span>SHARES</span>
                  </div>
                  
                  {topHolders.yes?.length === 0 ? (
                    <div className="text-[11px] text-slate-600 py-4 text-center">لا يوجد ملاك حالياً</div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {topHolders.yes?.map((holder, idx) => (
                        <div key={idx} className="flex justify-between items-center px-1 text-xs hover:bg-slate-900/30 py-1 rounded-lg transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden flex-shrink-0">
                              {holder.profiles?.avatar_url && <img src={holder.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />}
                            </div>
                            <span className="text-slate-300 font-medium">{holder.profiles?.display_name || "مستخدم مجهول"}</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-400">
                            {parseFloat(holder.yes_shares).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* العمود الأيسر: ملاك لا (NO Holders) */}
                <div className="flex flex-col gap-3 border-t md:border-t-0 md:border-r border-slate-900 pt-4 md:pt-0 md:pr-6">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400 border-b border-slate-900 pb-2 px-1">
                    <span>ملاك لا (NO holders)</span>
                    <span>SHARES</span>
                  </div>
                  
                  {topHolders.no?.length === 0 ? (
                    <div className="text-[11px] text-slate-600 py-4 text-center">لا يوجد ملاك حالياً</div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {topHolders.no?.map((holder, idx) => (
                        <div key={idx} className="flex justify-between items-center px-1 text-xs hover:bg-slate-900/30 py-1 rounded-lg transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden flex-shrink-0">
                              {holder.profiles?.avatar_url && <img src={holder.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />}
                            </div>
                            <span className="text-slate-300 font-medium">{holder.profiles?.display_name || "مستخدم مجهول"}</span>
                          </div>
                          <span className="font-mono font-bold text-rose-400">
                            {parseFloat(holder.no_shares).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 w-full">
          <TradingSlip market={market} currentOption={currentOption} onOptionChange={setCurrentOption} user={user} onRequiredAuth={triggerAuthModal} />
        </div>
      </main>

      <Footer />
      <HowItWorksModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialView={modalView} />
    </div>
  );
}

export default MarketDetailPage;