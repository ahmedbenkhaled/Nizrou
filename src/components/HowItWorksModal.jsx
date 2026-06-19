// src/components/HowItWorksModal.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

function HowItWorksModal({ isOpen, onClose, initialView = "instructions" }) {
  const [step, setStep] = useState(1);
  const [view, setView] = useState("instructions");

  const { sendOTP, verifyOTP, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  
  // ⚡ التعديل الجوهري: فصل حالات التحميل إلى مؤشرات مستقلة فرعياً
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  
  const [error, setError] = useState("");

  // حفظ تفضيلات العرض دون الكتابة القسرية فوق خيارات المستخدم
  useEffect(() => {
    if (isOpen) {
      if (initialView === "login" || initialView === "signup") {
        setView("auth");
      } else {
        setView("instructions");
      }
    }
  }, [isOpen, initialView]);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      setView("auth");
    }
  };

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    setError("");
    try {
      await loginWithGoogle();
      handleCloseAll();
    } catch (err) {
      setError("حدث خطأ أثناء الاتصال بجوجل. حاول مجدداً.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("صيغة البريد الإلكتروني غير صحيحة.");
      return;
    }
    setIsEmailLoading(true);
    setError("");
    try {
      await sendOTP(email.trim());
      setOtpSent(true);
    } catch (err) {
      setError("حدث خطأ أثناء إرسال الرمز. حاول مجدداً.");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError("الرجاء إدخل الرمز المكون من 6 أرقام.");
      return;
    }
    setIsEmailLoading(true);
    setError("");
    try {
      await verifyOTP(email.trim(), otpCode);
      handleCloseAll();
    } catch (err) {
      setError("الرمز غير صحيح أو انتهت صلاحيته. حاول مجدداً.");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleCloseAll = () => {
    onClose();
    setTimeout(() => {
      setStep(1);
      setOtpSent(false);
      setOtpCode("");
      setEmail("");
      setError("");
    }, 300);
  };

  if (!isOpen) return null;

  // فحص ما إذا كانت هناك أي عملية معلقة لتعطيل العناصر بالكامل لمنع التداخل الزمني
  const isAnyActionRunning = isGoogleLoading || isEmailLoading;

  return (
    <div 
      onClick={handleCloseAll}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 text-white border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center transition-all duration-300 transform scale-100"
      >
        {view === "instructions" ? (
          <>
            {step === 1 && (
              <div className="w-full flex flex-col items-center">
                <div className="relative w-[calc(100%+3rem)] -mx-6 -mt-6 h-64 mb-6 overflow-hidden rounded-t-3xl">
                  <img src="/images/step1.png" alt="استكشف الأسواق" className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 to-transparent" />
                </div>
                <h3 className="text-xl font-bold font-cairo mb-3">1. استكشف نيزرو</h3>
                <p className="text-xs text-slate-400 font-cairo leading-relaxed mb-6 px-2">
                  اشترِ حصصاً في أسواق "نعم" أو "لا" بناءً على توقعاتك. تتغير الاحتمالات فورياً عندما يتداول مستخدمون آخرون.
                </p>
              </div>
            )}

            {step === 2 && (
              <div className="w-full flex flex-col items-center">
                <div className="relative w-[calc(100%+3rem)] -mx-6 -mt-6 h-64 mb-6 overflow-hidden rounded-t-3xl">
                  <img src="/images/step2.png" alt="تداول الحصص" className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 to-transparent" />
                </div>
                <h3 className="text-xl font-bold font-cairo mb-3">2. ابدأ التداول</h3>
                <p className="text-xs text-slate-400 font-cairo leading-relaxed mb-6 px-2">
                  اشحن حسابك بواسطة العملات الرقمية أو بطاقات الدفع لتصبح جاهزاً للتداول الفوري واقتناص الفرص السعرية المتاحة.
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="w-full flex flex-col items-center">
                <div className="relative w-[calc(100%+3rem)] -mx-6 -mt-6 h-64 mb-6 overflow-hidden rounded-t-3xl">
                  <img src="/images/step3.png" alt="احصد الأرباح" className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 to-transparent" />
                </div>
                <h3 className="text-xl font-bold font-cairo mb-3">3. سحب الأرباح</h3>
                <p className="text-xs text-slate-400 font-cairo leading-relaxed mb-6 px-2">
                  يمكنك بيع حصصك في أي وقت، أو الانتظار لتصفية الحصص الرابحة تلقائياً بقيمة 1.00$ كاملة لكل سهم صحيح عند الإغلاق.
                </p>
              </div>
            )}

            <button
              onClick={handleNext}
              className="w-full bg-blue-500 hover:bg-blue-400 text-white font-cairo font-semibold py-3 rounded-xl transition-all text-xs"
            >
              {step === 3 ? "ابدأ الآن" : "التالي"}
            </button>
          </>
        ) : (
          <div className="w-full flex flex-col items-center font-cairo animate-fadeIn">
            <h2 className="text-lg font-bold text-white mb-4">
              {otpSent ? "أدخل رمز التحقق" : "الدخول إلى نيزرو"}
            </h2>

            {error && (
              <div className="w-full text-center text-xs text-red-500 bg-red-500/10 border border-red-500/20 py-2 px-3 rounded-xl mb-4">
                {error}
              </div>
            )}

            {!otpSent ? (
              <>
                {/* زر جوجل التفاعلي مع حالته المنفصلة وحمايته عند تفعيل أي حدث آخر */}
                <button
                  onClick={handleGoogleAuth}
                  disabled={isAnyActionRunning}
                  className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-xs mb-4 cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 512 512">
                    <path d="M2330 5110 c-494 -48 -950 -230 -1350 -538 -195 -150 -448 -432 -594 -662 -63 -99 -186 -351 -230 -471 -49 -134 -102 -340 -128 -499 -31 -195 -31 -565 0 -760 45 -276 116 -498 237 -745 132 -269 269 -460 489 -681 221 -220 412 -357 681 -489 247 -121 469 -192 745 -237 195 -31 565 -31 760 0 276 45 498 116 745 237 269 132 460 269 681 489 220 221 357 412 489 681 88 179 132 296 180 476 66 253 77 351 82 767 l5 372 -1281 0 -1281 0 0 -490 0 -490 754 0 754 0 -29 -77 c-64 -166 -174 -346 -291 -478 -146 -164 -301 -282 -493 -375 -232 -113 -383 -149 -645 -157 -159 -5 -202 -2 -309 16 -667 114 -1187 632 -1301 1295 -27 160 -27 372 0 532 114 663 634 1181 1301 1295 161 27 430 23 579 -9 199 -43 399 -128 559 -235 46 -32 85 -57 87 -57 1 0 114 145 250 323 137 177 270 350 296 384 l48 61 -82 60 c-325 234 -718 389 -1133 448 -123 17 -460 26 -575 14z"/>
                  </svg>
                  {isGoogleLoading ? "جاري الاتصال بجوجل..." : "المتابعة مع جوجل"}
                </button>

                <div className="w-full flex items-center mb-4 select-none">
                  <div className="flex-grow border-t border-slate-800"></div>
                  <span className="px-3 text-[10px] text-slate-500">أو</span>
                  <div className="flex-grow border-t border-slate-800"></div>
                </div>

                <form onSubmit={handleSendOTP} className="w-full flex flex-col gap-2" dir="rtl">
                  <div className="w-full border border-slate-800 rounded-xl p-1 bg-slate-950/40 focus-within:border-slate-700">
                    <input
                      type="email"
                      required
                      disabled={isAnyActionRunning}
                      placeholder="البريد الإلكتروني"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent text-white px-3 py-1.5 text-xs focus:outline-none placeholder-slate-600 text-right disabled:opacity-50"
                    />
                  </div>
                  {/* زر الإيميل التفاعلي مع حالته المنفصلة السلسة */}
                  <button
                    type="submit"
                    disabled={isAnyActionRunning}
                    className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    {isEmailLoading ? "جاري إرسال الرمز..." : "إرسال رمز التحقق"}
                  </button>
                </form>
              </>
            ) : (
              <form onSubmit={handleVerifyOTP} className="w-full flex flex-col gap-2" dir="rtl">
                <p className="text-xs text-slate-400 text-center mb-1">
                  تم إرسال رمز التحقق إلى <span className="text-slate-200 font-mono">{email}</span>
                </p>
                <div className="w-full border border-slate-800 rounded-xl p-1 bg-slate-950/40 focus-within:border-slate-700">
                  <input
                    type="text"
                    required
                    disabled={isEmailLoading}
                    placeholder="أدخل الرمز (6 أرقام)"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full bg-transparent text-white px-3 py-1.5 text-xs focus:outline-none text-center font-mono tracking-widest disabled:opacity-50"
                    maxLength={6}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isEmailLoading}
                  className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  {isEmailLoading ? "جاري التحقق..." : "تأكيد الدخول"}
                </button>
                <button
                  type="button"
                  disabled={isEmailLoading}
                  onClick={() => { setOtpSent(false); setOtpCode(""); setError(""); }}
                  className="text-[10px] text-slate-500 hover:text-slate-400 text-center mt-1 cursor-pointer disabled:opacity-30"
                >
                  تغيير البريد الإلكتروني
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default HowItWorksModal;