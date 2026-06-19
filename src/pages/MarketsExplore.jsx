// src/pages/MarketsExplore.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import HowItWorksModal from "../components/HowItWorksModal";
import { formatDateToArabic, formatCategoryName, formatMarketVolume } from "../utils/formatters";

export default function MarketsExplore({ detectedCountry, setDetectedCountry }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // الفلاتر المستخرجة من الـ URL لإبقاء الحالة متزامنة عند التوجيه من البحث
  const currentCategory = searchParams.get("category") || "all";
  const currentSort = searchParams.get("sort") || "trending";
  const currentStatus = searchParams.get("status") || "active";
  const searchQuery = searchParams.get("q") || "";

  // الحالات المحلية للواجهة
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list"); // list أو grid كما في بوليماركت

  // حالات الـ Modals الخاصة بجلسة المستخدم الشبيهة بالصفحة الرئيسية
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState("instructions");

  // خيارات الترتيب والفرز المترجمة باحترافية
  const sortOptions = [
    { id: "trending", name: "الأسواق الرائجة", icon: "🔥" },
    { id: "volume", name: "أعلى حجم تداول", icon: "📊" },
    { id: "newest", name: "أحدث الأسواق", icon: "✨" },
    { id: "ending", name: "تنتهي قريباً", icon: "⏳" },
    { id: "competitive", name: "تنافسي حاد (٥٠/٥٠)", icon: "🎯" }
  ];

  // خيارات فئة حالة السوق
  const statusOptions = [
    { id: "all", name: "الكل" },
    { id: "active", name: "نشط" },
    { id: "resolved", name: "تمت تسويتها" }
  ];

  // خيارات الموضوعات والتصنيفات المدعومة في نظامك
  const categories = [
    { id: "all", name: "كل الفئات", icon: "🌐" },
    { id: "Politics", name: "سياسة", icon: "🏛️" },
    { id: "Crypto", name: "عملات رقمية", icon: "📈" },
    { id: "Sports", name: "رياضة", icon: "⚽" },
    { id: "Pop Culture", name: "ثقافة عامة", icon: "🎬" },
    { id: "Technology", name: "تكنولوجيا وذكاء اصطناعي", icon: "💻" },
    { id: "Business", name: "اقتصاد وأعمال", icon: "💼" },
    { id: "Science", name: "علوم وفضاء", icon: "🚀" }
  ];

  // دالة تحديث الفلاتر في الـ URL
  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === "all" && key !== "status") {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setSearchParams({});
  };

  // جلب الأسواق من Supabase بناء على الفلاتر المحددة
  useEffect(() => {
    const fetchFilteredMarkets = async () => {
      setLoading(true);
      try {
        let query = supabase.from("markets").select("*");

        // 1. فلترة حسب التصنيف
        if (currentCategory !== "all") {
          query = query.eq("category", currentCategory);
        }

        // 2. فلترة حسب حالة السوق
        if (currentStatus !== "all") {
          query = query.eq("status", currentStatus);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data) {
          // تطبيع البيانات المجلوبة ومواءمة الصيغتين
          let formatted = data.map((m) => ({
            id: m.id,
            question: m.question || m.title || "توقع غير مسمى",
            category: m.category || "عام",
            volume: m.volume ?? 0,
            endDate: m.end_date || "2026-12-31",
            yesPrice: m.yes_price ?? 0.5,
            noPrice: m.no_price ?? 0.5,
            ticker: m.ticker || `NZ-${m.id}`,
            image_url: m.image_url || null,
            status: m.status || "active",
            country_code: m.country_code || "all"
          }));

          // 🗺️ منطق الفرز والفلترة الجغرافية المتوافق والمؤمن تماماً
          if (detectedCountry === "all") {
            // إظهار الأسواق العامة فقط (التي تكون قيمتها all أو فارغة)
            formatted = formatted.filter(m => !m.country_code || m.country_code.toLowerCase() === "all");
          } else {
            // بلد المستخدم أولاً، ثم العام، ثم باقي الدول
            formatted.sort((a, b) => {
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

          // 3. تطبيق فلترة البحث النصي (Client-Side لمرونة التحديث اللحظي)
          if (searchQuery.trim() !== "") {
            formatted = formatted.filter((m) =>
              m.question.toLowerCase().includes(searchQuery.toLowerCase())
            );
          }

          // 4. تطبيق منطق الفرز المالي (Sorting)
          if (currentSort === "newest") {
            formatted.sort((a, b) => b.id - a.id);
          } else if (currentSort === "volume") {
            formatted.sort((a, b) => b.volume - a.volume);
          } else if (currentSort === "ending") {
            formatted.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
          } else if (currentSort === "competitive") {
            // فرز الأسواق الأقرب لنسبة 50% (أي القيمة المطلقة لفرق السعر أصغر ما يمكن)
            formatted.sort(
              (a, b) =>
                Math.abs(a.yesPrice - 0.5) - Math.abs(b.yesPrice - 0.5)
            );
          } else {
            // الافتراضي: الرائجة (الترتيب الأعلى حجم وتفاعل)
            formatted.sort((a, b) => b.volume - a.volume);
          }

          setMarkets(formatted);
        }
      } catch (err) {
        console.error("خطأ أثناء تصفية وجلب الأسواق التفاعلية:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredMarkets();
  }, [currentCategory, currentSort, currentStatus, searchQuery, detectedCountry]);

  const handleProtectedAction = (marketId, option = "YES") => {
    if (!user) {
      setModalView("login");
      setIsModalOpen(true);
    } else {
      navigate(`/market/${marketId}`, { state: { initialOption: option } });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Navbar
      detectedCountry={detectedCountry}
      setDetectedCountry={setDetectedCountry}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        modalView={modalView}
        setModalView={setModalView}
      />

      {/* الهيكل الأساسي للصفحة المنسقة من اليمين لليسار */}
      <main className="w-full max-w-7xl mx-auto px-6 py-8 flex-1 flex flex-col lg:flex-row gap-8" dir="rtl">
        
        {/* العمود الأيمن: شريط الفلاتر الجانبي الثابت الشبيه بـ Polymarket */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-6 font-cairo">
          <div className="flex justify-between items-center pb-4 border-b border-slate-900">
            <h3 className="text-sm font-bold text-slate-200">تصفية متقدمة</h3>
            {(currentCategory !== "all" || currentSort !== "trending" || currentStatus !== "active" || searchQuery !== "") && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-blue-500 hover:text-blue-400 cursor-pointer font-light"
              >
                إعادة تعيين الكل
              </button>
            )}
          </div>

          {/* الفئة الأكبر: الترتيب والفرز */}
          <div>
            <span className="text-[11px] text-slate-500 font-bold block mb-2">ترتيب الأسواق حسب</span>
            <div className="flex flex-col gap-1">
              {sortOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => updateFilter("sort", opt.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-right cursor-pointer transition-all ${
                    currentSort === opt.id
                      ? "bg-slate-900 text-white border border-slate-800"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent"
                  }`}
                >
                  <span className="text-sm">{opt.icon}</span>
                  <span>{opt.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* الفئة الثانية: حالة السوق المراهن عليه */}
          <div>
            <span className="text-[11px] text-slate-500 font-bold block mb-2">حالة التداول</span>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900/60 border border-slate-900 rounded-xl">
              {statusOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => updateFilter("status", opt.id)}
                  className={`py-1.5 text-center text-xs font-medium rounded-lg cursor-pointer transition-all ${
                    currentStatus === opt.id
                      ? "bg-slate-800 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          </div>

          {/* الفئة الثالثة: تصنيفات ومواضيع نيزرو الذكية */}
          <div>
            <span className="text-[11px] text-slate-500 font-bold block mb-2">الفئات والموضوعات</span>
            <div className="flex flex-col gap-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => updateFilter("category", cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                    currentCategory === cat.id
                      ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm bg-slate-950 p-1 rounded-lg border border-slate-900">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* العمود الأيسر: محتوى عرض قائمة الأسواق المفلترة ومحرك التبديل النظيف */}
        <section className="flex-1 flex flex-col gap-4 font-cairo">
          
          {/* شريط الإحصائيات العلوية وأزرار تبديل نمط الواجهة */}
          <div className="flex justify-between items-center bg-slate-900/20 border border-slate-900 p-3 rounded-2xl">
            <div className="text-xs text-slate-400">
              تم العثور على <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">{markets.length}</span> سوق متاح للتداول
            </div>
            
            {/* أزرار التبديل لنمط العرض الأفقي الشبيه ببوليماركت أو الشبكي الفردي */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-900" dir="ltr">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                  viewMode === "grid" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                }`}
                title="عرض شبكي"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                  viewMode === "list" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                }`}
                title="عرض قائمة أفقي"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* قسم معالجة التحميل والحالات الفارغة بقوة */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500">جاري تصفية وتحديث أسواق نيزرو...</p>
            </div>
          ) : markets.length === 0 ? (
            <div className="bg-slate-900/10 border border-slate-900/60 rounded-2xl py-20 text-center flex flex-col items-center justify-center gap-2">
              <span className="text-3xl">🔍</span>
              <h4 className="text-sm font-bold text-slate-300 mt-2">لا توجد أسواق تطابق هذا الخيار</h4>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">لم نجد أي أسواق نشطة حالياً تحت هذا التصنيف أو تطابق حقل البحث النصي.</p>
            </div>
          ) : viewMode === "grid" ? (
            /* نمط العرض الشبكي (Grid View) */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {markets.map((m) => {
                const yesPct = (m.yesPrice * 100).toFixed(0);
                const noPct = (m.noPrice * 100).toFixed(0);
                return (
                  <div key={m.id} className="bg-slate-900/40 border border-slate-900 hover:border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-52 transition-all group">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start w-full text-[10px]">
                        <span className="bg-slate-950 px-2 py-0.5 rounded-md text-slate-400 border border-slate-900">{formatCategoryName(m.category)}</span>
                        <span className="text-slate-500">{formatDateToArabic(m.endDate)}</span>
                      </div>
                      <div className="flex items-start gap-2.5 w-full mt-1">
                        <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-900 flex-shrink-0 overflow-hidden flex items-center justify-center text-[9px] text-slate-500 font-mono">
                          {m.image_url ? <img src={m.image_url} alt="market" className="w-full h-full object-cover" /> : m.ticker}
                        </div>
                        <h4 onClick={() => handleProtectedAction(m.id, "YES")} className="text-xs font-bold text-slate-200 leading-relaxed line-clamp-2 hover:underline cursor-pointer flex-1">
                          {m.question}
                        </h4>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-auto">
                      <div className="grid grid-cols-2 gap-2" dir="ltr">
                        <button onClick={() => handleProtectedAction(m.id, "NO")} className="flex justify-between items-center px-3 py-1.5 bg-red-950/30 hover:bg-red-950/50 border border-red-900/30 text-red-400 rounded-xl text-xs font-semibold cursor-pointer transition-all">
                          <span className="text-slate-400 font-mono">{noPct}%</span><span>لا</span>
                        </button>
                        <button onClick={() => handleProtectedAction(m.id, "YES")} className="flex justify-between items-center px-3 py-1.5 bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-900/30 text-emerald-400 rounded-xl text-xs font-semibold cursor-pointer transition-all">
                          <span className="text-slate-400 font-mono">{yesPct}%</span><span>نعم</span>
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500 border-t border-slate-900/50 pt-1.5">
                        حجم التداول: <span className="text-slate-400 font-mono">{formatMarketVolume(m.volume)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* نمط العرض الأفقي الاحترافي الشبيه بـ Polymarket (List View) */
            <div className="flex flex-col gap-2">
              {/* ترويسة الجدول التوضيحية المخفية في الشاشات الصغيرة */}
              <div className="hidden md:flex items-center px-4 py-2 text-[11px] text-slate-500 font-bold border-b border-slate-900/80" dir="rtl">
                <div className="flex-1 text-right">السوق والحدث التوقعي</div>
                <div className="w-32 text-center">حجم التداول</div>
                <div className="w-48 text-center">خيارات التداول الفورية</div>
              </div>

              {markets.map((m) => {
                const yesPct = (m.yesPrice * 100).toFixed(0);
                const noPct = (m.noPrice * 100).toFixed(0);
                return (
                  <div
                    key={m.id}
                    className="bg-slate-900/30 hover:bg-slate-900/60 border border-slate-900 hover:border-slate-800 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all group"
                  >
                    {/* الجانب الأيمن: الصورة + العنوان الممتد والفئة */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center text-[9px] font-mono text-slate-500">
                        {m.image_url ? <img src={m.image_url} alt="market" className="w-full h-full object-cover" /> : m.ticker}
                      </div>
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <h4
                          onClick={() => handleProtectedAction(m.id, "YES")}
                          className="text-xs font-bold text-slate-100 leading-relaxed truncate group-hover:text-white hover:underline cursor-pointer"
                        >
                          {m.question}
                        </h4>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                          <span className="text-blue-400">{formatCategoryName(m.category)}</span>
                          <span>•</span>
                          <span>ينتهي: {formatDateToArabic(m.endDate)}</span>
                        </div>
                      </div>
                    </div>

                    {/* المنتصف: حجم التداول المالي */}
                    <div className="flex items-center md:justify-center gap-1.5 md:w-32 text-xs text-slate-400">
                      <span className="md:hidden text-[10px] text-slate-500">الحجم:</span>
                      <span className="font-mono font-medium text-slate-300">{formatMarketVolume(m.volume)}</span>
                    </div>

                    {/* الجانب الأيسر: الأزرار المدمجة المباشرة للتداول بنسق أفقي هندسي */}
                    <div className="w-full md:w-48 flex items-center gap-2" dir="ltr">
                      <button
                        onClick={() => handleProtectedAction(m.id, "NO")}
                        className="flex-1 flex justify-between items-center px-4 py-2 bg-red-950/20 hover:bg-red-950/40 border border-red-900/20 text-red-400 rounded-xl text-xs font-bold cursor-pointer transition-all"
                      >
                        <span className="text-slate-400 font-mono">{noPct}%</span>
                        <span>لا</span>
                      </button>
                      <button
                        onClick={() => handleProtectedAction(m.id, "YES")}
                        className="flex-1 flex justify-between items-center px-4 py-2 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/20 text-emerald-400 rounded-xl text-xs font-bold cursor-pointer transition-all"
                      >
                        <span className="text-slate-400 font-mono">{yesPct}%</span>
                        <span>نعم</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />

      <HowItWorksModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalView("instructions");
        }}
        initialView={modalView}
      />
    </div>
  );
}