// src/components/MoreDropdown.jsx
function MoreDropdown() {
  return (
    <div className="absolute left-0 top-full mt-2 w-48 bg-slate-950 border border-slate-800 rounded-2xl p-2 shadow-2xl text-right font-cairo z-50 animate-fadeIn pointer-events-auto" dir="rtl">
      
      {/* 📈 النشاط (Activity) */}
      <button className="w-full flex items-center gap-2.5 text-right text-sm text-slate-400 hover:bg-slate-900/80 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group">
        {/* الأيقونة أولاً لتقع على اليمين عربياً */}
        <svg className="w-4 h-4 stroke-current fill-none group-hover:text-white transition-colors duration-200 shrink-0" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307L21.75 7.5M21.75 7.5H16.5m5.25 0v5.25" />
        </svg>
        <span className="font-semibold group-hover:text-white transition-colors duration-200">النشاط</span>
      </button>

      {/* 🏆 جدول الترتيب (Leaderboard) */}
      <button className="w-full flex items-center gap-2.5 text-right text-sm text-slate-400 hover:bg-slate-900/80 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group">
        <svg className="w-4 h-4 stroke-current fill-none group-hover:text-white transition-colors duration-200 shrink-0" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013-3h.375a2.25 2.25 0 002.25-2.25v-1.5a2.25 2.25 0 00-2.25-2.25H21m-13.5 9a3 3 0 00-3-3h-.375a2.25 2.25 0 01-2.25-2.25v-1.5a2.25 2.25 0 012.25-2.25H3m13.5 9V16.5m-9 2.25V16.5m0 0V7.5m0 0l3-3 3 3m-3-3v12" />
        </svg>
        <span className="font-semibold group-hover:text-white transition-colors duration-200">جدول الترتيب</span>
      </button>

      {/* 📊 اللوحات الإرشادية (Dashboards) */}
      <button className="w-full flex items-center gap-2.5 text-right text-sm text-slate-400 hover:bg-slate-900/80 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group">
        <svg className="w-4 h-4 stroke-current fill-none group-hover:text-white transition-colors duration-200 shrink-0" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        <span className="font-semibold group-hover:text-white transition-colors duration-200">اللوحات الإرشادية</span>
      </button>

      {/* 🎁 المكافآت (Rewards) */}
      <button className="w-full flex items-center gap-2.5 text-right text-sm text-slate-400 hover:bg-slate-900/80 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group">
        <svg className="w-4 h-4 stroke-current fill-none group-hover:text-white transition-colors duration-200 shrink-0" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h17.25c.621 0 1.125-.504 1.125-1.125V8.25c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v2.25c0 .621.504 1.125 1.125 1.125z" />
        </svg>
        <span className="font-semibold group-hover:text-white transition-colors duration-200">المكافآت</span>
      </button>

    </div>
  );
}

export default MoreDropdown;