import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext"; // 👈 أضف هذا الـ import في الأعلى إن لم يكن موجوداً

function DropdownMenu({ currentLang, setCurrentLang, languages, profile, logout, onOpenSettings }) {
  const { theme, setTheme } = useAuth(); // 👈 استهلاك الحالة المركزية هنا
  const [isLangOpen, setIsLangOpen] = useState(false);
  
  const isDarkMode = theme === "dark"; // تحويلها لمتغير منطقي معتمد على الـ Context
  const navigate = useNavigate();

  // 🔄 الـ States الخاصة بالتدوير التلقائي السريع وصعود الأنميشن
  const [rotatingLangIdx, setRotatingLangIdx] = useState(0);
  const [isSliding, setIsSliding] = useState(false);

  const isUserLoggedIn = !!profile;
  const displayName = profile?.display_name || "مستخدم جديد";

  // ⏱️ ميكانيكية تدوير اللغات تلقائياً كل ثانيتين (2000ms) عند إغلاق الماوس
  useEffect(() => {
    const currentIdx = languages.findIndex(l => l.code === currentLang.code);
    if (currentIdx !== -1 && !isLangOpen) {
      setRotatingLangIdx(currentIdx);
    }

    const interval = setInterval(() => {
      if (!isLangOpen) {
        setIsSliding(true); // تشغيل حركة الصعود للأعلى

        setTimeout(() => {
          setRotatingLangIdx((prevIdx) => (prevIdx + 1) % languages.length);
          setIsSliding(false); // إعادة التموضع لاستقبال اللغة التالية
        }, 300); // سرعة حركة الصعود والاختفاء الداخلي
      }
    }, 2000); // تدوير منتظم وثابت كل ثانيتين

    return () => clearInterval(interval);
  }, [languages, isLangOpen, currentLang]);

  const handleLogoutAction = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("فشل تسجيل الخروج:", error);
    }
  };

  const displayedRotatedLang = languages[rotatingLangIdx] || currentLang;

  return (
    <div className="absolute left-0 mt-1 w-60 bg-slate-950 border border-slate-800 rounded-2xl p-2 shadow-2xl text-right font-cairo z-50 animate-fadeIn pointer-events-auto relative">
      
      {/* 👤 الجزء العلوي (صورة الحساب والترس للاعدادات) */}
      {isUserLoggedIn && (
        <>
          <div className="w-full flex flex-row-reverse items-center justify-between px-3 py-2 mb-1">
            <div className="flex flex-row-reverse items-center gap-2">
              <img 
                className="w-7 h-7 rounded-full object-cover border border-slate-800 bg-slate-900"
                src={profile?.avatar_url || "https://ui-avatars.com/api/?name=User"}
                alt="avatar"
              />
              <div className="flex flex-col text-right">
                <span className="text-xs text-slate-300 font-bold truncate max-w-[120px]">
                  {displayName}
                </span>
                {/* عرض المحفظة الرقمية التلقائية للمستخدم في الـ Navbar */}
                {profile?.wallet_address && (
                  <span 
                    onClick={() => {
                      navigator.clipboard.writeText(profile.wallet_address);
                      alert("📋 تم نسخ عنوان محفظتك الرقمية اللامركزية بنجاح!");
                    }}
                    className="text-[10px] text-emerald-400 font-mono cursor-pointer hover:text-emerald-300 transition-colors mt-0.5 select-all"
                    title={profile.wallet_address}
                  >
                    {profile.wallet_address.substring(0, 6)}...{profile.wallet_address.substring(profile.wallet_address.length - 4)} 📋
                  </span>
                )}
              </div>
            </div>
            <button 
              onClick={onOpenSettings}
              className="text-slate-500 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-900/60"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37 alert-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          <hr className="border-slate-800/80 mb-1.5 mx-2" />
        </>
      )}

      {/* القائمة الأساسية المباشرة */}
      <button className="w-full flex flex-row-reverse items-center gap-2.5 text-sm text-slate-300 hover:bg-slate-900/80 px-4 py-2 rounded-xl transition-colors cursor-pointer group">
       <svg className="w-4 h-4 shrink-0" viewBox="0 0 120 120" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path fill="#FFC54D" d="M101,35.3l-0.2-1.7h-10c0.5-3.4,0.8-6.9,1-10.5c0.1-1.9-1.4-3.5-3.1-3.5H31.4c-1.8,0-3.2,1.6-3.1,3.5c0.1,3.6,0.5,7.1,1,10.5h-10L19,35.3c-0.1,0.4-1.2,10.6,5.4,19.8c4.3,6,11,10.1,19.7,12.2c2.8,2.8,5.9,4.9,9.2,6.2c-0.4,4.1-0.9,8.1-1.4,11.8h-3.2c-5,0-9,4-9,9v6.2h40.6v-6.2c0-5-4-9-9-9h-3.1c-0.6-3.8-1.1-7.7-1.5-11.8c3.3-1.2,6.4-3.3,9.2-6.2c8.7-2.1,15.4-6.2,19.7-12.2C102.2,45.9,101,35.7,101,35.3z M27.3,52.6c-4.2-5.8-4.7-12.1-4.7-15.1h7.3c1.9,9.5,5.3,17.9,9.6,24.2C34.3,59.7,30.2,56.6,27.3,52.6z M92.7,52.6c-2.9,4-7,7.1-12.2,9.1c4.4-6.4,7.7-14.7,9.6-24.2h7.3C97.4,40.5,96.8,46.8,92.7,52.6z"/>
        </svg>
        <span className="font-semibold group-hover:text-white">جدول الترتيب</span>
      </button>

      <button className="w-full flex flex-row-reverse items-center gap-2.5 text-sm text-slate-300 hover:bg-slate-900/80 px-4 py-2 rounded-xl transition-colors cursor-pointer group mt-0.5">
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 504.124 504.124" xmlns="http://www.w3.org/2000/svg">
          <circle fill="#0EE565" cx="252.062" cy="252.062" r="252.062"/>
          <path fill="#00C67F" d="M73.83,73.823c98.43-98.43,258.032-98.43,356.462,0c98.438,98.438,98.446,258.032,0,356.478"/>
          <path fill="#363D3B" d="M274.361,216.915c-30.594-12.249-36.714-18.125-36.714-23.631c0-10.413,13.414-11.973,21.425-11.973c20.669,0,34.273,6.357,43.292,10.555l2.19,1.032c3.868,1.772,8.287,1.757,12.13,0.016c3.836-1.772,6.751-5.104,7.948-9.169l10.248-34.895c1.977-6.766-2.922-13.982-9.224-17.156c-13.627-6.798-30.271-11.099-46.025-12.997V96.989c0-8.058-3.017-14.281-11.075-14.281h-31.09c-8.058,0-12.973,6.223-12.973,14.281v25.6c-39.385,10.973-61.857,39.755-61.857,75.997c0,48.183,39.802,68.907,74.776,81.566c31.752,11.587,31.555,20.37,31.555,24.6c0,11.335-13.903,15.368-25.718,15.368c-17.069,0-35.99-5.341-51.791-14.659c-3.899-2.292-8.657-2.678-12.839-0.985c-4.183,1.678-7.389,5.183-8.625,9.523l-10.24,35.643c-1.749,6.105,2.599,12.642,7.869,16.156c13.485,8.995,33.241,15.549,56.871,18.07v23.261c0,8.066,4.75,14.289,12.8,14.289h28.995c8.05,0,13.344-6.223,13.344-14.281v-27.341c39.385-10.831,64.709-40.873,64.709-79.202C344.34,249.872,307.05,229.18,274.361,216.915z"/>
          <path fill="#1D2321" d="M274.361,216.915c-30.594-12.249-36.714-18.125-36.714-23.631c0-10.413,13.414-11.973,21.425-11.973c20.669,0,34.273,6.357,43.292,10.555l2.19,1.032c3.868,1.772,8.287,1.757,12.13,0.016c3.836-1.772,6.751-5.104,7.948-9.169l10.248-34.895c1.977-6.766-2.922-13.982-9.224-17.156c-13.627-6.798-30.271-11.099-46.025-12.997V96.989c0-8.058-3.017-14.281-11.075-14.281h-31.09c-8.058,0-12.973,6.223-12.973,14.281v25.6c-31.508,7.656-46.285,23.993-55.619,45.466l168.109,168.527c5.404-10.744,8.168-22.867,8.168-35.99C345.151,249.872,307.05,229.18,274.361,216.915z"/>
          <circle fill="#00C67F" cx="102.4" cy="252.07" r="21"/>
          <circle fill="#0EE565" cx="401.723" cy="252.07" r="21"/>
        </svg>
        <span className="font-semibold group-hover:text-white">الجوائز والمكافآت</span>
      </button>

      {/* المظهر الداكن */}
      {/* المظهر الداكن */}
      <div className="w-full flex flex-row-reverse items-center justify-between text-sm dark:text-slate-300 text-slate-700 dark:hover:bg-slate-900/80 hover:bg-slate-200/60 px-4 py-2 rounded-xl transition-colors mt-0.5">
        <div className="flex flex-row-reverse items-center gap-2.5">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <circle fill="#3862CC" cx="256" cy="256" r="256"/>
            <path fill="#2A4998" d="M512,256c0,141.385-114.615,256-256,256V0C397.385,0,512,114.615,512,256z"/>
          </svg>
          <span className="font-semibold">المظهر الداكن</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input 
            type="checkbox" 
            checked={isDarkMode} 
            onChange={() => setTheme(isDarkMode ? "light" : "dark")} // 👈 يقوم بتحديث سياق الموقع فوراً
            className="sr-only peer" 
          />
          <div className="w-8 h-4 bg-slate-300 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-3.5 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <hr className="border-slate-800 my-1.5 mx-2" />

      {/* روابط المساعدة والدعم المبسطة فقط */}
      <a href="/help" className="block text-xs text-slate-400 hover:text-white hover:bg-slate-900/80 px-4 py-2 rounded-xl transition-colors no-underline">
         مركز الدعم والمساعدة
      </a>
      <a href="/terms" className="block text-xs text-slate-400 hover:text-white hover:bg-slate-900/80 px-4 py-2 rounded-xl transition-colors no-underline mt-0.5">
         شروط الاستخدام
      </a>

      <hr className="border-slate-800 my-1.5 mx-2" />

      {/* 🌐 خيار اختيار اللغة بالتأثير الدوار الصاعد المعدل */}
      <div 
        className="w-full rounded-xl relative"
        onMouseEnter={() => setIsLangOpen(true)}
        onMouseLeave={() => setIsLangOpen(false)}
      >
        <button className={`w-full flex flex-row-reverse items-center justify-between text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer group ${
          isLangOpen ? "bg-slate-900/80 text-white" : "text-slate-300 hover:bg-slate-900/80"
        }`}>
          
          {/* صندوق احتواء الحركة الرأسية المخفي */}
          <div className="overflow-hidden h-4 flex items-center relative flex-1 flex-row-reverse">
            <div className={`flex flex-row-reverse items-center gap-2 transition-all duration-300 ${
              isSliding && !isLangOpen 
                ? "-translate-y-5 opacity-0" 
                : "translate-y-0 opacity-100"
            }`}>
              <img 
                src={isLangOpen ? currentLang.flag : displayedRotatedLang.flag} 
                className="w-4 h-2.5 object-cover rounded-sm" 
                alt="flag" 
              />
              <span className="font-bold group-hover:text-white">
                {isLangOpen ? currentLang.name : displayedRotatedLang.name}
              </span>
            </div>
          </div>

          <span className="text-slate-600 group-hover:text-slate-400 transition-colors mr-2 shrink-0">
            {isLangOpen ? "▼" : "◀"}
          </span>
        </button>

        {/* 🎯 التعديل النهائي الصارم: استخدام left-full مع تغيير التموضع لتبدأ من الحافة اليمنى تماماً والدفع لليمين */}
        {isLangOpen && (
          <div className="absolute left-full top-0 ml-1.5 w-36 bg-slate-950 border border-slate-800 rounded-xl p-1 shadow-2xl text-right z-[999] animate-fadeIn">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setCurrentLang(lang);
                  setIsLangOpen(false);
                }}
                className={`w-full flex flex-row-reverse items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  currentLang.code === lang.code 
                    ? "bg-blue-600/20 text-blue-400" 
                    : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                }`}
              >
                <img src={lang.flag} className="w-4 h-2.5 object-cover rounded-sm" alt={lang.name} />
                <span className="font-semibold">{lang.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* زر تسجيل الخروج */}
      {isUserLoggedIn && (
        <button 
          onClick={handleLogoutAction}
          className="w-full flex flex-row-reverse items-center text-xs text-rose-500 font-bold hover:bg-rose-500/10 px-4 py-2 rounded-xl transition-colors cursor-pointer mt-0.5"
        >
           تسجيل الخروج
        </button>
      )}

    </div>
  );
}

export default DropdownMenu;