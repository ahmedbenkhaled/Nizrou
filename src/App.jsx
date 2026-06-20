// src/App.jsx
import { useState, useEffect, useRef } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import MarketDetailPage from "./pages/MarketDetailPage";
import AdminPanel from "./pages/AdminPanel";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext"; 
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import SidebarNews from "./components/SidebarNews";
import HeroCarousel from "./components/HeroCarousel";
import HowItWorksModal from "./components/HowItWorksModal";
import MarketsGrid from "./components/MarketsGrid";
import { supabase } from "./lib/supabaseClient";
import ProtectedRoute from "./components/ProtectedRoute"
import MarketsExplore from "./pages/MarketsExplore";
import GeoblockingPage from "./pages/GeoblockingPage";
import PortfolioPage from "./pages/PortfolioPage";

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || "cmqij856i00nr0cl4yno595r4";

function HomePage({
  detectedCountry,
  setDetectedCountry,
  marketsData,
  selectedOption,
  currentPrice,
  currentIndex,
  isModalOpen,
  setIsModalOpen,
  modalView,
  setModalView,
  navigate,
  loading,
  onIndexChange,
  progress 
}) {
  const { user } = useAuth(); 
  const totalRealMarkets = marketsData.length;

  const handleProtectedAction = (actionType, marketId, option = "YES") => {
    if (!user) {
      setModalView("login");
      setIsModalOpen(true);
    } else {
      if (actionType === "TRADE") {
        navigate(`/market/${marketId}`, { state: { initialOption: option } });
      } else {
        alert(`✨ تم تعديل حالة هذا السوق [رقم: ${marketId}] في قائمتك المفضلة بنجاح!`);
      }
    }
  };

  const handlePrev = () => {
    if (totalRealMarkets <= 1) return;
    onIndexChange((currentIndex - 1 + totalRealMarkets) % totalRealMarkets);
  };

  const handleNext = () => {
    if (totalRealMarkets <= 1) return;
    onIndexChange((currentIndex + 1) % totalRealMarkets);
  };

  return (
    <>
      <Navbar detectedCountry={detectedCountry} setDetectedCountry={setDetectedCountry} isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} modalView={modalView} setModalView={setModalView} />

      <main className="w-full max-w-7xl mx-auto px-6 pt-4 pb-4 flex flex-col gap-4 lg:h-auto min-h-screen" dir="rtl">
        
        {/* شبكة العرض العلوية الرئيسية */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch w-full">
          
          {/* العمود الأول والثاني: الكاروسيل + شريط التحكم السفلي مدمجين معاً */}
         {/* العمود الأول والثاني: الكاروسيل + شريط التحكم السفلي */}
<div className="lg:col-span-2 w-full min-w-0 flex flex-col justify-between gap-4">
  
  {/* حاوية الكاروسيل الفردية */}
  <div className="w-full overflow-hidden flex flex-col h-[480px] min-h-0">
    <HeroCarousel
      marketsData={marketsData}
      currentIndex={currentIndex}
      selectedOption={selectedOption}
      currentPrice={currentPrice}
      onAuthOpen={() => { setModalView("login"); setIsModalOpen(true); }}
      onActionTrigger={(marketId, option) => handleProtectedAction("TRADE", marketId, option)}
      loading={loading}
      onIndexChange={onIndexChange}
      user={user}
    />
  </div>

  {/* ⚡ شريط التحكم (السلايدر والأزرار) محاذي تماماً لزر استكشاف الكل في العمود المجاور */}
  <div className="flex flex-row-reverse justify-between items-center w-full px-2 h-[42px] shrink-0">
    
    {/* أزرار التنقل في الجانب الأيسر */}
    <div className="flex items-center gap-2" dir="ltr">
      <button
        onClick={handlePrev}
        className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white transition-all active:scale-95 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={handleNext}
        className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white transition-all active:scale-95 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5 l7 7-7 7" />
        </svg>
      </button>
    </div>

    {/* السلايدر التفاعلي النقطي */}
    {totalRealMarkets > 1 && (
      <div className="flex items-center gap-2" dir="ltr">
        {Array.from({ length: totalRealMarkets }).map((_, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div 
              key={`slider-dot-${idx}`} 
              onClick={() => onIndexChange(idx)}
              className={`h-1.5 rounded-full overflow-hidden cursor-pointer relative transition-all duration-300 ease-in-out ${
                isActive ? "w-10 bg-slate-800" : "w-1.5 bg-slate-700/60 hover:bg-slate-600"
              }`}
            >
              {isActive && (
                <div 
                  className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>

</div>

          {/* العمود الثالث: حاوية الشريط الجانبي للأخبار */}
          {/* العمود الثالث: حاوية الشريط الجانبي للأخبار المدمجة مع خلفية الموقع وبدون حدود */}
{/* العمود الثالث: حاوية الشريط الجانبي للأخبار المدمجة مع خلفية الموقع وبدون حدود */}
<div className="lg:col-span-1 w-full flex flex-col justify-between gap-4">
  
  {/* حاوية الأخبار بدون خلفية أو حدود */}
  <div className="w-full bg-transparent pt-6 px-4 flex flex-col justify-between flex-1">
    <SidebarNews />
  </div>

  {/* ⚡ التعديل الحاسم: جعل الحاوية والزر بنفس الارتفاع الدقيق [h-[42px]] ومحاذاتها عمودياً كلياً */}
  {/* ⚡ التعديل الحاسم: جعل الحاوية والزر بنفس الارتفاع الدقيق [h-[42px]] ومحاذاتها عمودياً كلياً */}
  <div className="w-full px-2 h-[42px] flex items-center shrink-0">
    <button 
      onClick={() => navigate("/explore")} // 👈 أضفنا هذا الحدث للتوجيه
      className="w-full py-2 rounded-xl border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900/60 active:scale-[0.98] transition-all cursor-pointer text-center h-9 flex items-center justify-center"
    >
      استكشاف الكل
    </button>
  </div>

</div>
        </div>

        {/* قسم شبكة الأسواق السفلية */}
        <div className="w-full mt-6">
          <MarketsGrid 
            detectedCountry={detectedCountry}
            onActionTrigger={(marketId, option) => handleProtectedAction("TRADE", marketId, option)} 
            onSaveFavorite={(marketId) => handleProtectedAction("FAVORITE", marketId)} 
          />
        </div>
      </main>

      <Footer />
      
      <HowItWorksModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setModalView("instructions"); }} 
        initialView={modalView} 
      />
    </>
  );
}

export function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [detectedCountry, setDetectedCountry] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState("instructions");
  const [selectedOption, setSelectedOption] = useState("YES");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [marketsData, setMarketsData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef(null);

 useEffect(() => {
    const checkGeoblocking = async () => {
      try {
        // 1. تحديد المنطقة الزمنية وتحويلها لرمز الدولة بالصيغة الكبيرة المتوافقة مع قاعدة بياناتك
        // 1. تحديد المنطقة الزمنية وتحويلها لأحرف صغيرة لضمان دقة الرصد البرمجي الآمن
const timeZone = (Intl.DateTimeFormat().resolvedOptions().timeZone || "").toLowerCase();
let countryCode = "ALL";

if (timeZone.includes("algiers") || timeZone.includes("algeria") || timeZone.includes("dz")) {
  countryCode = "DZ";
} else if (timeZone.includes("casablanca") || timeZone.includes("morocco") || timeZone.includes("ma")) {
  countryCode = "MA";
} else if (timeZone.includes("tunis") || timeZone.includes("tunisia") || timeZone.includes("tn")) {
  countryCode = "TN";
} else if (timeZone.includes("america") || timeZone.includes("us")) {
  countryCode = "US";
}

setDetectedCountry(countryCode.toLowerCase());

        // 2. جلب إعدادات الحظر مباشرة من جدول app_settings في سوبابيس
        const { data, error } = await supabase
          .from("app_settings")
          .select("blocked_countries, vpn_blocking_enabled")
          .eq("id", 1) // السطر الأول الذي يحتوي على البيانات في لقطة الشاشة
          .single();

        if (error) throw error;

        if (data) {
          const { blocked_countries, vpn_blocking_enabled } = data;

          // 3. إذا كان الحظر مفعلاً، وكانت دولة المستخدم الحالية مدرجة ضمن قائمة المحظورين، يتم توجيهه قسراً
          if (vpn_blocking_enabled && blocked_countries?.includes(countryCode)) {
            if (location.pathname !== "/restricted") {
              navigate("/restricted");
            }
          }
        }
      } catch (e) {
        console.error("خطأ في التحقق من الحظر الجغرافي:", e);
        // في حال حدوث خطأ في الاتصال، نترك المستخدم يتصفح كإجراء احتياطي آمن
      }
    };

    checkGeoblocking();
  }, [location.pathname, navigate]);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('markets')
          .select('*')
          .order("id", { ascending: true });

        if (error) throw error;

        if (data) {
          const formattedData = data.map(m => ({
            id: m.id,
            question: m.question || m.title || "توقع غير مسمى", 
            category: m.category || "عام",
            volume: m.volume ?? 0,
            endDate: m.end_date || m.endDate || "2026-12-31", 
            yesPrice: m.yes_price ?? m.yesPrice ?? 0.5,
            noPrice: m.no_price ?? m.noPrice ?? 0.5,
            ticker: m.ticker || `NZ-${m.id}`,
            chartPoints: m.chart_points || [],
            image_url: m.image_url || null
          }));
          setMarketsData(formattedData);
        }
      } catch (error) {
        console.error("خطأ في جلب الأسواق:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();

    const appMarketsChannel = supabase
      .channel("app-markets-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "markets" }, () => {
        fetchMarkets(); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(appMarketsChannel);
    };
  }, []);

  useEffect(() => {
    if (marketsData.length <= 1 || loading) return;

    setProgress(0);
    const intervalTime = 100; 
    const totalDuration = 10000; 
    const step = (intervalTime / totalDuration) * 100;

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setSelectedOption("YES");
          setCurrentIndex((oldIdx) => (oldIdx + 1) % marketsData.length);
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [marketsData, currentIndex, loading]);

  const handleIndexChange = (idx) => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setProgress(0);
    setCurrentIndex(idx);
  };

  const currentMarket = marketsData[currentIndex];
  const currentPrice = currentMarket 
    ? (selectedOption === "YES" ? currentMarket.yesPrice : currentMarket.noPrice) 
    : 0;

  return (
  <Routes>
    <Route 
      path="/" 
      element = {
        <HomePage 
          detectedCountry={detectedCountry}
          setDetectedCountry={setDetectedCountry}
          marketsData={marketsData}
          selectedOption={selectedOption}
            currentPrice={currentPrice}
            currentIndex={currentIndex}
            onIndexChange={handleIndexChange} 
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen} 
            modalView={modalView}
            setModalView={setModalView}
            navigate={navigate}
            loading={loading}
            progress={progress}
          />
        } 
      />
      
      {/* 🌟 هذا هو المسار الجديد لصفحة التصفية المتقدمة التي أضفناها */}
     <Route path="/explore" element={<MarketsExplore detectedCountry={detectedCountry} setDetectedCountry={setDetectedCountry} />} />

      <Route path="/portfolio" element={<PortfolioPage />} />
      <Route 
        path="/market/:id" 
        element={
          <MarketDetailPage 
            isModalOpen={isModalOpen} 
            setIsModalOpen={setIsModalOpen} 
            modalView={modalView} 
            setModalView={setModalView} 
          />
        } 
      />
      <Route 
  path="/admin" 
  element={
    <ProtectedRoute requireAdmin={true}>
      <AdminPanel />
    </ProtectedRoute>
  } 
/>
<Route path="/restricted" element={<GeoblockingPage />} />
    </Routes>
  );
}

// ننشئ مكون مغلف وسيط لاستهلاك الـ Context بشكل سليم
function AppStylesWrapper() {
  const { theme } = useAuth();
  return (
    <div className={`min-h-screen flex flex-col pt-[145px] transition-colors duration-200 ${
      theme === "dark" ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
    }`}>
      <AppContent />
    </div>
  );
}

function App() {
  // سنقوم بجعل Privy يقرأ المظهر المخزن محلياً لحظياً عند الإقلاع
  const savedTheme = localStorage.getItem("theme") || "dark";

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: savedTheme === "dark" ? "dark" : "light", // 👈 يتناسق كلياً مع اختيارك
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
      }}
    >
      <AuthProvider>
        <Router>
          <AppStylesWrapper /> {/* 👈 استبدال الـ div الثابت بالمكون الديناميكي الذكي */}
        </Router>
      </AuthProvider>
    </PrivyProvider>
  );
}

export default App;