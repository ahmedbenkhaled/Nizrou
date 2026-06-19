// src/components/Navbar.jsx
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import { createPortal } from "react-dom";
import HowItWorksModal from "./HowItWorksModal";
import SearchBar from "./SearchBar";
import DropdownMenu from "./DropdownMenu";
import MoreDropdown from "./MoreDropdown";
import { useAuth } from "../context/AuthContext";
import SettingsModal from "./SettingsModal";
import DepositModal from "./DepositModal"; 

function Navbar({ detectedCountry, setDetectedCountry, isModalOpen, setIsModalOpen, modalView, setModalView }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); 
  const [isDepositOpen, setIsDepositOpen] = useState(false); 
  const [activeTab, setActiveTab] = useState("trending"); 
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  const { user, profile, logout, isLoading, refreshProfile } = useAuth(); 
  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);

  const [currentLang, setCurrentLang] = useState({
    code: "AR",
    name: "العربية",
    flag: "https://purecatamphetamine.github.io/country-flag-icons/3x2/SA.svg"
  });

  const WalletSkeleton = () => (
    <div className="flex flex-col gap-1.5 pl-4 animate-pulse shrink-0">
      <div className="h-2.5 w-10 bg-slate-800 rounded"></div>
      <div className="h-4 w-16 bg-slate-800 rounded"></div>
    </div>
  );

  const DepositSkeleton = () => (
    <div className="w-16 h-9 bg-slate-800/80 rounded-xl animate-pulse shrink-0" />
  );

  const ProfileSkeleton = () => (
    <div className="flex items-center gap-1.5 animate-pulse shrink-0">
      <div className="w-9 h-9 rounded-full bg-slate-800/80" />
      <div className="w-2.5 h-2.5 bg-slate-800/60 rounded-full" />
    </div>
  );

  const languages = [
    { code: "AR", name: "العربية", flag: "https://purecatamphetamine.github.io/country-flag-icons/3x2/SA.svg" },
    { code: "EN", name: "English", flag: "https://purecatamphetamine.github.io/country-flag-icons/3x2/US.svg" },
    { code: "FR", name: "Français", flag: "https://purecatamphetamine.github.io/country-flag-icons/3x2/FR.svg" }
  ];
  
  const timeoutId = useRef(null);
  const moreTimeoutId = useRef(null);
  const countryTimeoutId = useRef(null);
  const moreButtonRef = useRef(null);
  
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0 });

  const getSecureCountryCode = useCallback(() => {
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;

      if (timeZone) {
        if (timeZone.includes("Algiers") || timeZone.includes("Casablanca") || timeZone.includes("Tunis") || timeZone.includes("Cairo")) {
          if (timeZone.includes("Algiers")) return "dz";
          if (timeZone.includes("Casablanca")) return "ma";
          if (timeZone.includes("Tunis")) return "tn";
          if (timeZone.includes("Cairo")) return "eg";
        }
        if (timeZone.includes("Riyadh")) return "sa";
        if (timeZone.includes("Dubai")) return "ae";
      }

      if (locale && locale.includes("-")) {
        const geoCode = locale.split("-")[1].toLowerCase();
        if (geoCode === "us" && timeZone && !timeZone.includes("America")) {
          return "dz"; 
        }
        return geoCode;
      }
      
      return "dz";
    } catch (e) {
      return "dz";
    }
  }, []);

  const handleMouseEnter = () => {
    if (timeoutId.current) clearTimeout(timeoutId.current);
    setIsDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutId.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 400);
  };

  const handleCountryEnter = () => {
    if (countryTimeoutId.current) clearTimeout(countryTimeoutId.current);
    setIsCountryMenuOpen(true);
  };

  const handleCountryLeave = () => {
    countryTimeoutId.current = setTimeout(() => {
      setIsCountryMenuOpen(false);
    }, 300); // تأخير بـ 300ms قبل الاختفاء لنعومة الحركة
  };


  const updateCoords = useCallback(() => {
    if (moreButtonRef.current) {
      const rect = moreButtonRef.current.getBoundingClientRect();
      setDropdownCoords({
        top: rect.bottom, 
        left: rect.left   
      });
    }
  }, []);

  const handleMoreEnter = () => {
    if (moreTimeoutId.current) clearTimeout(moreTimeoutId.current);
    updateCoords();
    setIsMoreOpen(true);
  };

  const handleMoreLeave = () => {
    moreTimeoutId.current = setTimeout(() => {
      setIsMoreOpen(false);
    }, 400);
  };

  const handleLogout = async () => {
    setIsDropdownOpen(false); 
    await logout();           
  };

  useEffect(() => {
    // التحقق أولاً مما إذا كان المستخدم قد اختار دولة يدوياً مسبقاً
    const savedCountry = localStorage.getItem("selected_country");
    if (typeof setDetectedCountry === 'function') {
      if (savedCountry) {
        setDetectedCountry(savedCountry);
      } else {
        setDetectedCountry(getSecureCountryCode());
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const res = await fetch('https://ipapi.co/json/');
const data = await res.json();
if (data && data.country_code) {
  if (!localStorage.getItem("selected_country") && typeof setDetectedCountry === 'function') {
    setDetectedCountry(data.country_code.toLowerCase());
  }
}
          } catch (err) {
            console.warn("تأمين الموقع مستمر عبر كاشف التوقيت الهجين.");
          }
        },
        () => {
          console.log("تم رفض الصلاحية الجغرافية، الاستمرار عبر وضع فحص التناقض الزمني الآمن.");
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, [getSecureCountryCode]);

  useEffect(() => {
    return () => {
      if (timeoutId.current) clearTimeout(timeoutId.current);
      if (moreTimeoutId.current) clearTimeout(moreTimeoutId.current);
      if (countryTimeoutId.current) clearTimeout(countryTimeoutId.current);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setIsDropdownOpen(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    // 1. جلب الإشعارات الحالية من قاعدة البيانات
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) setNotifications(data);
    };

    fetchNotifications();

    // 2. فتح قناة الاتصال اللحظي للبث الفوري (Realtime Channel)
    // 2. فتح قناة الاتصال اللحظي مع فحص الإغلاق المنهجي لمنع تسريب الذاكرة
    const channelName = `user-notifications-${user.id}`;
    const notifChannel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      if (notifChannel) {
        supabase.removeChannel(notifChannel);
      }
    };
  }, [user?.id]);

  // حساب عدد الإشعارات غير المقروءة لتشغيل النقطة الحمراء
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  // دالة تحويل الإشعارات إلى "تم القراءة" عند فتح القائمة
  const markAllAsRead = async () => {
    if (unreadCount === 0 || !user?.id) return;
    
    // تحديث الحالة محلياً فوراً لتجربة مستخدم سريعة
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  };

  return (
    <nav className="fixed top-0 left-0 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md pt-6 pb-4 flex flex-col justify-start z-50">
      <div className="max-w-7xl mx-auto px-6 flex flex-row justify-between items-center w-full"> 
        <div className={`flex items-center flex-1 gap-6 transition-all duration-300 ${user ? "max-w-3xl" : "max-w-4xl"}`}>
          <a href="/" title="نيزرو" className="flex items-center gap-2 cursor-pointer group no-underline shrink-0">
            <svg className="h-8 w-8 text-white transition-transform hover:rotate-12 duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L22 7.5v11L12 22 2 16.5v-11Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v10.5M2 7.5l10 5.5 10-5.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 14.5V9.5l6 3.5 6-3.5v5" />
            </svg>
            <span className="text-2xl font-bold text-white font-cairo">نيزرو</span>
          </a>

          <SearchBar />
          
          {!isLoading && !user && (
            <div className="hidden lg:flex items-center shrink-0 gap-6 mr-6">
              <a 
                onClick={() => { setModalView("instructions"); setIsModalOpen(true); }}
                className="flex items-center gap-1.5 text-sm font-cairo font-semibold text-blue-500 hover:text-blue-400 active:scale-95 transform transition-all duration-150 no-underline whitespace-nowrap cursor-pointer group"
              >
                <svg className="h-4 w-4 text-blue-500 fill-blue-500 group-hover:text-blue-400 group-hover:fill-blue-400 transition-colors shrink-0" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path className="stroke-slate-950" strokeWidth="2" strokeLinecap="round" d="M12 16v-4" />
                  <circle className="fill-slate-950" cx="12" cy="8" r="1" />
                </svg>
                <span>كيف يعمل؟</span>
              </a>

              <div 
                className="relative font-cairo py-2" 
                onMouseEnter={handleCountryEnter} 
                onMouseLeave={handleCountryLeave}
              >
                <button className="flex items-center cursor-pointer active:scale-95 transition-transform">
                  {(!detectedCountry || detectedCountry === "all") ? (
                    <div className="w-6.50 h-6 flex items-center justify-center bg-transparent border-none">
                      <svg className="w-5.5 h-5.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                      </svg>
                    </div>
                  ) : (
                    <img 
                      src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${detectedCountry.toUpperCase()}.svg`}
                      alt="بلد المستخدم الموثق"
                      className="w-6.50 h-6 object-cover rounded-md border border-slate-900 shadow-sm select-none"
                    />
                  )}
                </button>

                {isCountryMenuOpen && (
                  <div className="absolute left-0 top-full mt-1 w-36 bg-slate-950 border border-slate-800 rounded-xl p-1.5 shadow-2xl z-[9999] flex flex-col gap-1 text-right animate-fadeIn" dir="rtl">
               <button onClick={() => { setDetectedCountry("all"); localStorage.setItem("selected_country", "all"); setIsCountryMenuOpen(false); }} className="flex items-center justify-start gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/40 transition-colors text-right">
                      <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                      </svg>
                      <span>عام</span>
                    </button>
                    <div className="border-b border-slate-800/60 my-0.5" />
                    <button onClick={() => { setDetectedCountry("dz"); localStorage.setItem("selected_country", "dz"); setIsCountryMenuOpen(false); }} className="flex items-center justify-start gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors text-right">
                      <img src="https://purecatamphetamine.github.io/country-flag-icons/3x2/DZ.svg" className="w-4.5 h-3 object-cover rounded-sm shrink-0" />
                      <span>الجزائر</span>
                    </button>
                    <button onClick={() => { setDetectedCountry("ma"); localStorage.setItem("selected_country", "ma"); setIsCountryMenuOpen(false); }} className="flex items-center justify-start gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors text-right">
                      <img src="https://purecatamphetamine.github.io/country-flag-icons/3x2/MA.svg" className="w-4.5 h-3 object-cover rounded-sm shrink-0" />
                      <span>المغرب</span>
                    </button>
                    <button onClick={() => { setDetectedCountry("tn"); localStorage.setItem("selected_country", "tn"); setIsCountryMenuOpen(false); }} className="flex items-center justify-start gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors text-right">
                      <img src="https://purecatamphetamine.github.io/country-flag-icons/3x2/TN.svg" className="w-4.5 h-3 object-cover rounded-sm shrink-0" />
                      <span>تونس</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {isLoading && !user ? (
            <div className="flex items-center gap-4 font-cairo" dir="rtl">
              {/* 1. هيكل المحفظة */}
              <WalletSkeleton />
              
              {/* 2. هيكل زر الإيداع */}
              <DepositSkeleton />

              <span className="text-slate-800/40 font-light text-base px-0.5 shrink-0">|</span>

              {/* 3. هيكل الألفاتار والقائمة المنسدلة */}
              <ProfileSkeleton />
            </div>
            ) : !user ? (
            <>
              <button onClick={() => { setModalView("login"); setIsModalOpen(true); }} className="text-sm font-cairo font-semibold text-blue-500 hover:bg-slate-900/60 active:scale-95 px-4 py-2 rounded-xl transform transition-all duration-150 cursor-pointer">
                تسجيل الدخول
              </button>
              <button onClick={() => { setModalView("signup"); setIsModalOpen(true); }} className="text-sm font-cairo font-semibold text-white bg-blue-500 hover:bg-blue-400 active:scale-95 px-5 py-2.5 rounded-xl transform transition-all duration-150 shadow-sm cursor-pointer">
                إنشاء حساب
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4 font-cairo select-none" dir="rtl">
              
              <div 
                className="relative font-cairo shrink-0 ml-2 py-2" 
                onMouseEnter={handleCountryEnter} 
                onMouseLeave={handleCountryLeave}
              >
                <button className="flex items-center cursor-pointer active:scale-95 transition-transform">
                  {(!detectedCountry || detectedCountry === "all") ? (
                    <div className="w-6.50 h-6 flex items-center justify-center bg-transparent border-none">
                      <svg className="w-5.5 h-5.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                      </svg>
                    </div>
                  ) : (
                    <img 
                      src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${detectedCountry.toUpperCase()}.svg`}
                      alt="بلد المستخدم الموثق"
                      className="w-6.50 h-6 object-cover rounded-md border border-slate-900 shadow-sm select-none"
                    />
                  )}
                </button>

                {isCountryMenuOpen && (
                  <div className="absolute left-0 top-full mt-1 w-36 bg-slate-950 border border-slate-800 rounded-xl p-1.5 shadow-2xl z-[9999] flex flex-col gap-1 text-right animate-fadeIn" dir="rtl">
                    <button onClick={() => { setDetectedCountry("all"); localStorage.setItem("selected_country", "all"); setIsCountryMenuOpen(false); }} className="flex items-center justify-start gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/40 transition-colors text-right">
                      <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                      </svg>
                      <span>عام</span>
                    </button>
                    <div className="border-b border-slate-800/60 my-0.5" />
                    <button onClick={() => { setDetectedCountry("dz"); localStorage.setItem("selected_country", "dz"); setIsCountryMenuOpen(false); }} className="flex items-center justify-start gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors text-right">
                      <img src="https://purecatamphetamine.github.io/country-flag-icons/3x2/DZ.svg" className="w-4.5 h-3 object-cover rounded-sm shrink-0" />
                      <span>الجزائر</span>
                    </button>
                    <button onClick={() => { setDetectedCountry("ma"); localStorage.setItem("selected_country", "ma"); setIsCountryMenuOpen(false); }} className="flex items-center justify-start gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors text-right">
                      <img src="https://purecatamphetamine.github.io/country-flag-icons/3x2/MA.svg" className="w-4.5 h-3 object-cover rounded-sm shrink-0" />
                      <span>المغرب</span>
                    </button>
                    <button onClick={() => { setDetectedCountry("tn"); localStorage.setItem("selected_country", "tn"); setIsCountryMenuOpen(false); }} className="flex items-center justify-start gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors text-right">
                      <img src="https://purecatamphetamine.github.io/country-flag-icons/3x2/TN.svg" className="w-4.5 h-3 object-cover rounded-sm shrink-0" />
                      <span>تونس</span>
                    </button>
                  </div>
                )}
              </div>

              {isLoading && !user ? (
                <WalletSkeleton />
              ) : (
                <div className="flex flex-col text-right pl-1 shrink-0">
                  <span className="text-xs text-slate-400 font-medium mb-0.5">المحفظة</span>
                  <span className="text-base font-bold text-emerald-400 font-mono leading-tight">
                    {`$${Number(profile?.balance ?? 0).toFixed(2)}`}
                  </span>
                </div>
              )}

              {/* ⚡ تصحيح حاسم: تشغيل الـ State الخاص بالإيداع المباشر لفتح المودال بشكل صحيح */}
              <button 
                onClick={() => {
                  setModalView("deposit"); 
                  setIsDepositOpen(true); 
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all cursor-pointer"
              >
                إيداع
              </button>

              <button className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12V8H4v4M3 4h18v4H3zm2 8h14v8H5zm5 0v8m4-8v8M12 4c1-1.333 3-2 4-1 1.333 1.333 0 3-.5 3.5H8.5C8 6 6.667 4.333 8 3c1-1 3-.333 4 1z" />
                </svg>
              </button>

              {/* 🔔 الجرس الذكي والقائمة المنسدلة للإشعارات الحية */}
              <div className="relative shrink-0">
                <button 
                  onClick={() => {
                    setIsNotifOpen(!isNotifOpen);
                    if (!isNotifOpen) markAllAsRead();
                  }}
                  className={`transition-colors cursor-pointer p-1.5 rounded-xl hover:bg-slate-900 relative ${isNotifOpen ? "text-white bg-slate-900" : "text-slate-400 hover:text-white"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  
                  {/* النقطة الحمراء التنبيهية لعدد الإشعارات غير المقروءة */}
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                  )}
                </button>

                {/* نافذة عرض قائمة الإشعارات المنسدلة */}
                {isNotifOpen && (
                  <>
                    {/* 🟢 طبقة فيزيائية عازلة ممتدة على كامل أبعاد الشاشة والموقع لكسر تموضع الـ Navbar */}
                    <div className="fixed top-0 left-0 w-screen h-screen z-[9998] bg-transparent" onClick={() => setIsNotifOpen(false)} />
                    
                    {/* 🟢 حاوية الإشعارات المرتفعة فوق الطبقة العازلة الشاملة */}
                    <div className="absolute left-0 mt-2 w-80 bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-2xl z-[9999] flex flex-col gap-3 text-right max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 overflow-x-hidden animate-fadeIn" dir="rtl">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                        <span className="text-xs font-bold text-white">التنبيهات والإشعارات</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-400">الحية</span>
                      </div>

                      {notifications.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-500">
                          لا توجد إشعارات جديدة حالياً.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {notifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              className={`p-2.5 rounded-xl border transition-all text-right flex flex-col gap-1 ${!notif.is_read ? "bg-slate-900/40 border-slate-850/60" : "bg-transparent border-transparent"}`}
                            >
                              <div className="flex items-center gap-1.5 text-xs font-bold">
                                <span className="text-slate-500 text-[10px] bg-slate-900/60 px-1.5 py-0.5 rounded-md flex items-center gap-1 font-semibold">
                                  {notif.type === 'finance' ? '💰 مالية' : notif.type === 'order' ? '📊 صفقة' : '🏁 تسوية'}
                                </span>
                                <span className={!notif.is_read ? "text-blue-400" : "text-slate-300"}>
                                  {notif.title}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                {notif.message}
                              </p>
                              <span className="text-[9px] text-slate-600 font-mono mt-0.5">
                                {new Date(notif.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <span className="text-slate-800 font-light text-base px-0.5 shrink-0">|</span>

              <div 
                className="relative flex items-center gap-1.5 cursor-pointer group shrink-0 py-2"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <img 
                  className="w-9 h-9 rounded-full object-cover border border-slate-800 shadow-sm transition-transform group-hover:scale-105"
                  src={profile?.avatar_url || "https://ui-avatars.com/api/?name=User"}
                  alt="profile"
                />
                <span className="text-[10px] text-slate-500 group-hover:text-slate-300 transition-transform duration-200 group-hover:rotate-180">
                  ▼
                </span>

                {isDropdownOpen && (
                  <div 
                    className="absolute left-0 top-full mt-1"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <DropdownMenu 
                      currentLang={currentLang} 
                      setCurrentLang={setCurrentLang} 
                      languages={languages}
                      profile={profile}
                      logout={handleLogout} 
                      onOpenSettings={() => {
                        setIsSettingsOpen(true);
                        setIsDropdownOpen(false); 
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {!isLoading && !user && (
  <div 
    className="relative shrink-0 flex items-center z-50" 
    onMouseEnter={handleMouseEnter} 
    onMouseLeave={handleMouseLeave}
  >
    <button className="flex flex-col gap-1 p-2.5 rounded-xl hover:bg-slate-900/60 active:scale-90 transform transition-all duration-150 cursor-pointer group">
      <span className="w-5 h-0.5 bg-white rounded-full transition-colors"></span>
      <span className="w-5 h-0.5 bg-white rounded-full transition-colors"></span>
      <span className="w-5 h-0.5 bg-white rounded-full transition-colors"></span>
    </button>
    
    {/* تم تجريد هذه الحاوية من الحدود والخلفية لتصبح شفافة تماماً ولا تشوه المكون الداخلي */}
    {isDropdownOpen && (
      <div className="absolute top-full left-0 mt-1 z-50 clear-both">
        <DropdownMenu 
          currentLang={currentLang} 
          setCurrentLang={setCurrentLang} 
          languages={languages}
        />
      </div>
    )}
  </div>
)}
        </div>
      </div>  

      <div className="w-full mt-4 pt-4" dir="rtl">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-5 overflow-x-auto whitespace-nowrap scrollbar-none text-sm font-cairo">
          <button onClick={() => setActiveTab("trending")} className={`flex items-center gap-1.5 transition-colors duration-200 cursor-pointer ${activeTab === "trending" ? "text-white font-bold" : "text-slate-400 hover:text-slate-300"}`}>
            <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307L21.75 7.5M21.75 7.5H16.5m5.25 0v5.25" /></svg>
            <span>رائج</span>
          </button>

          <button onClick={() => setActiveTab("breaking")} className={`transition-colors duration-200 cursor-pointer ${activeTab === "breaking" ? "text-white font-bold" : "text-slate-400 hover:text-slate-300"}`}>عاجل</button>
          <button onClick={() => setActiveTab("new")} className={`transition-colors duration-200 cursor-pointer ${activeTab === "new" ? "text-white font-bold" : "text-slate-400 hover:text-slate-300"}`}>الجديد</button>
          <span className="text-slate-800 select-none font-light px-0.5">|</span>
          <button onClick={() => setActiveTab("politics")} className={`transition-colors duration-200 cursor-pointer ${activeTab === "politics" ? "text-white font-bold" : "text-slate-400 hover:text-slate-300"}`}>السياسة</button>
          <button onClick={() => setActiveTab("sports")} className={`transition-colors duration-200 cursor-pointer ${activeTab === "sports" ? "text-white font-bold" : "text-slate-400 hover:text-slate-300"}`}>الرياضة</button>
          <button onClick={() => setActiveTab("crypto")} className={`transition-colors duration-200 cursor-pointer ${activeTab === "crypto" ? "text-white font-bold" : "text-slate-400 hover:text-slate-300"}`}>العملات الرقمية</button>
          <button onClick={() => setActiveTab("esports")} className={`transition-colors duration-200 cursor-pointer ${activeTab === "esports" ? "text-white font-bold" : "text-slate-400 hover:text-slate-300"}`}>الألعاب الإلكترونية</button>
          <button onClick={() => setActiveTab("middle-east")} className={`transition-colors duration-200 cursor-pointer ${activeTab === "middle-east" ? "text-white font-bold" : "text-slate-400 hover:text-slate-300"}`}>الشرق الأوسط</button>
          <button onClick={() => setActiveTab("finance")} className={`transition-colors duration-200 cursor-pointer ${activeTab === "finance" ? "text-white font-bold" : "text-slate-400 hover:text-slate-300"}`}>المال والأعمال</button>
          <button onClick={() => setActiveTab("geopolitics")} className={`transition-colors duration-200 cursor-pointer ${activeTab === "geopolitics" ? "text-white font-bold" : "text-slate-400 hover:text-slate-300"}`}>الجيوسياسة</button>
          <button onClick={() => setActiveTab("tech")} className={`transition-colors duration-200 cursor-pointer ${activeTab === "tech" ? "text-white font-bold" : "text-slate-400 hover:text-slate-300"}`}>التقنية</button>
          <button onClick={() => setActiveTab("culture")} className={`transition-colors duration-200 cursor-pointer ${activeTab === "culture" ? "text-white font-bold" : "text-slate-400 hover:text-slate-300"}`}>الثقافة</button>
          <button onClick={() => setActiveTab("economy")} className={`transition-colors duration-200 cursor-pointer ${activeTab === "economy" ? "text-white font-bold" : "text-slate-400 hover:text-slate-300"}`}>الاقتصاد</button>
          <button onClick={() => setActiveTab("weather")} className={`transition-colors duration-200 cursor-pointer ${activeTab === "weather" ? "text-white font-bold" : "text-slate-400 hover:text-slate-300"}`}>الطقس والمناخ</button>
          <button onClick={() => setActiveTab("elections")} className={`transition-colors duration-200 cursor-pointer ${activeTab === "elections" ? "text-white font-bold" : "text-slate-400 hover:text-slate-300"}`}>الانتخابات</button>

          <div 
            ref={moreButtonRef}
            id="more-menu-container"
            className="flex items-center cursor-pointer shrink-0"
            onMouseEnter={handleMoreEnter}
            onMouseLeave={handleMoreLeave}
          >
            <button className="flex items-center gap-1 text-slate-400 hover:text-slate-300 transition-colors cursor-pointer font-medium">
              <span>المزيد</span>
              <span className={`text-[10px] text-slate-500 transition-transform duration-200 ${isMoreOpen ? "rotate-180" : ""}`}>▼</span>
            </button>
          </div>
        </div>
      </div>

      {isMoreOpen && createPortal(
        <div 
          className="fixed z-[9999] animate-fadeIn"
          style={{
            top: `${dropdownCoords.top}px`,
            left: `${dropdownCoords.left}px`
          }}
          onMouseEnter={handleMoreEnter}
          onMouseLeave={handleMoreLeave}
        >
          <MoreDropdown />
        </div>,
        document.body
      )}
      
      {isSettingsOpen && createPortal(
  <SettingsModal 
    isOpen={isSettingsOpen} 
    onClose={() => setIsSettingsOpen(false)} 
    profile={profile}
    refreshProfile={refreshProfile} 
  />,
  document.body
)}

      {isDepositOpen && createPortal(
  <DepositModal
    isOpen={isDepositOpen}
    onClose={() => { setIsDepositOpen(false); refreshProfile(); }}
    profile={profile}
    refreshProfile={refreshProfile}
    detectedCountry={detectedCountry} // 👈 التعديل هنا: تمرير البلد الحالي للمودال
  />,
  document.body
)}
    </nav>
  );
}

export default Navbar;