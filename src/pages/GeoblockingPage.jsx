// src/pages/GeoblockingPage.jsx
import React from 'react';

function GeoblockingPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-cairo px-6" dir="rtl">
      <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 p-8 rounded-2xl text-center shadow-xl backdrop-blur-sm">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h1 className="text-xl font-bold text-slate-100 mb-3">الخدمة غير متوفرة في بلدك</h1>
        
        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          عذراً، بموجب القوانين والتشريعات المحلية، تم حظر الوصول إلى منصة التوقعات من موقعك الجغرافي الحالي أو بسبب تفعيل أدوات تخطي الحجب (VPN/Proxy).
        </p>

        <div className="text-xs text-slate-500 border-t border-slate-800/60 pt-4">
          امتثالاً للمتطلبات التنظيمية والمحاسبية لشبكة Base الرقمية.
        </div>
      </div>
    </div>
  );
}

export default GeoblockingPage;