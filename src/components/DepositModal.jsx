// src/components/DepositModal.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { QRCodeSVG } from "qrcode.react"; 
import { useWallets } from "@privy-io/react-auth"; 

function DepositModal({ isOpen, onClose, detectedCountry }) { // 👈 استلام البلد هنا
  const { user } = useAuth();
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const userWalletAddress = embeddedWallet ? embeddedWallet.address : (user?.profile?.wallet_address || "");
  
  // تحديد الطريقة المحلية الافتراضية بناءً على البلد، أو التحويل لبايننس كخيار آمن
  
  // تحديد الطريقة المحلية الافتراضية بناءً على البلد، أو التحويل لبايننس كخيار آمن
  const getInitialMethod = () => {
    if (detectedCountry === "dz") return "baridimob";
    if (detectedCountry === "ma") return "cih_bank"; // طريقة المغرب الافتراضية
    if (detectedCountry === "tn") return "sobflous";  // طريقة تونس الافتراضية
    return "binance"; // عام أو دولي
  };

  const [method, setMethod] = useState(getInitialMethod); // baridimob أو binance
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return setError("يجب تسجيل الدخول أولاً");
    if (!amount || parseFloat(amount) <= 0) return setError("يرجى إدخال مبلغ صحيح");
    
    // شرط رفع الملف مقتصر فقط على الطرق المحلية الكلاسيكية، وليس بايننس
    // شرط رفع الملف مقتصر فقط على الطرق المحلية الكلاسيكية، وليس بايننس
    if (method !== "binance" && !file) {
      return setError("يرجى رفع صورة وصل تحويل الأموال كإثبات");
    }

    try {
      setUploading(true);
      setError("");

      // معالجة الإيداع الرقمي التلقائي عبر الـ Edge Function
      // معالجة الإيداع الرقمي التلقائي عبر الـ Edge Function
      if (method === "binance") {
        if (!amount || parseFloat(amount) < 10) return setError("الحد الأدنى للإيداع الرقمي هو 10 دولار");
        
        // 1. خطوة استباقية ذكية: التحقق من قاعدة البيانات أولاً قبل استدعاء الدالة لتفادي التكرار والتضارب
        const { data: checkData } = await supabase
          .from("deposits")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("method", "binance")
          .eq("amount", parseFloat(amount))
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // إذا كانت المعاملة مسجلة وناجحة بالفعل نتيجة التحديث اللحظي السابق
        if (checkData && checkData.status === "success") {
          setSuccess(true);
          setAmount("");
          return;
        }

        // 2. استدعاء الدالة في حال لم تكن مسجلة بعد
        const { data, error: funcError } = await supabase.functions.invoke("manage-ai-markets", {
          body: {
            action: "verify_crypto_deposit",
            userId: user.id,
            walletAddress: userWalletAddress, // تم إرسال العنوان الخام بدون toLowerCase
            amountUSD: parseFloat(amount).toFixed(6)
          }
        });

        // إذا حدث خطأ في الشبكة ولكن الـ Realtime التقط التحديث، نعتبر العملية ناجحة
        if (funcError || (data && !data.success)) {
          // فحص أخير سريع للتأكد من أن السيرفر لم يقم بالإدخال خلف الكواليس
          const { data: doubleCheck } = await supabase
            .from("deposits")
            .select("id")
            .eq("user_id", user.id)
            .eq("amount", parseFloat(amount))
            .maybeSingle();

          if (doubleCheck) {
            setSuccess(true);
            setAmount("");
            return;
          }

          throw new Error(data?.error || funcError?.message || "لم نجد معاملة مطابقة على الشبكة بعد، تأكد من التحويل وانتظر دقيقة ثم أعد المحاولة.");
        }

        setSuccess(true);
        setAmount("");
        return;
      }
      setError("");

      // 1. رفع الصورة إلى Supabase Storage (في باكت يسمى deposits)

      // 1. رفع الصورة إلى Supabase Storage (في باكت يسمى deposits)
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("deposits")
        .upload(filePath, file);

      if (uploadError) throw new Error("فشل في رفع صورة الوصل، تأكد من إعدادات Storage");

      // جلب رابط الصورة العام
      const { data: { publicUrl } } = supabase.storage
        .from("deposits")
        .getPublicUrl(filePath);

      // 2. إدخال سجل الإيداع في جدول transactions بناءً على أعمدة قاعدة بياناتك
let currentCurrency = "USDT";
      if (method === "baridimob") currentCurrency = "DZD";
      else if (method === "cih_bank" || method === "wafacash") currentCurrency = "MAD";
      else if (method === "sobflous") currentCurrency = "TND";

      // 2. إدخال سجل الإيداع في جدول transactions بناءً على أعمدة قاعدة بياناتك
      const { error: txError } = await supabase.from("deposits").insert([        {
          user_id: user.id,
          amount: parseFloat(amount),
          currency: currentCurrency, // 👈 استخدام المتغير الديناميكي هنا
          method: method,
          proof_url: publicUrl,
          status: "pending"
        },
      ]);

      if (txError) throw txError;

      setSuccess(true);
      setAmount("");
      setFile(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "حدث خطأ أثناء إرسال الطلب");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" dir="rtl">
      {/* ⚡ التعديل الهيكلي: الحاوية الرئيسية أصبحت تدعم الخلفية الفاتحة والنصوص الداكنة افتراضياً، وتتحول لـ Slate 900 في المظهر الداكن */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-slate-900 dark:text-white relative shadow-2xl font-cairo transition-colors duration-200">
        
        {/* زر الإغلاق الديناميكي */}
        <button 
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
        >
          ✕
        </button>

        <h3 className="text-xl font-bold mb-4 text-center flex items-center justify-center gap-2 text-slate-900 dark:text-white">
          <span>💰</span> شحن الرصيد بأمان
        </h3>

        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="text-4xl text-emerald-500">🎉</div>
            <p className="text-emerald-600 dark:text-emerald-400 font-bold">
              {method === "binance" ? "تم الشحن الآلي بنجاح!" : "تم إرسال طلب الشحن بنجاح!"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {method === "binance" 
                ? "تم التحقق من المعاملة عبر البلوكشين وإضافة الرصيد إلى حسابك فوراً." 
                : "طلبك الآن قيد المراجعة من قبل الإدارة، سيتم تحديث رصيدك فور الموافقة."}
            </p>
            <button 
              type="button"
              onClick={() => { setSuccess(false); onClose(); }}
              className="w-full mt-4 py-2.5 bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-all font-bold text-sm text-slate-800 dark:text-white"
            >
              إغلاق النافذة
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* اختيار وسيلة الشحن */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">اختر وسيلة الإيداع:</label>
              <div className="grid grid-cols-2 gap-3">
                {/* 1. زر بايننس الثابت */}
                <button
                  type="button"
                  onClick={() => setMethod("binance")}
                  className={`py-3 px-4 rounded-xl border text-sm font-bold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                    method === "binance" 
                      ? "border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" 
                      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <img src="/images/binance.png" alt="Binance" className="w-9 h-9 object-contain" />
                  <span>بايننس (Binance Pay)</span>
                </button>

                {/* 2. الأزرار المحلية تظهر ديناميكياً وحصرياً حسب كود الدولة */}
                {detectedCountry === "dz" && (
                  <button
                    type="button"
                    onClick={() => setMethod("baridimob")}
                    className={`py-3 px-4 rounded-xl border text-sm font-bold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                      method === "baridimob" 
                        ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <img src="/images/baridimob.png" alt="Baridimob" className="w-9 h-9 object-contain" />
                    <span>بريدي موب (Baridimob)</span>
                  </button>
                )}

                {detectedCountry === "ma" && (
                  <button
                    type="button"
                    onClick={() => setMethod("cih_bank")}
                    className={`py-3 px-4 rounded-xl border text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      method === "cih_bank" 
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>🏦</span> بنك CIH / المغرب
                  </button>
                )}

                {detectedCountry === "tn" && (
                  <button
                    type="button"
                    onClick={() => setMethod("sobflous")}
                    className={`py-3 px-4 rounded-xl border text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      method === "sobflous" 
                        ? "border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400" 
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>💳</span> صُوب فلوس (Sobflous)
                  </button>
                )}
              </div>
            </div>

            {/* صندوق عرض تفاصيل الحسابات والمعلومات */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-850 rounded-xl text-xs space-y-1 text-slate-700 dark:text-slate-300">
              {method === "binance" && (
                <div className="space-y-4 flex flex-col items-center text-center p-2">
                  {/* صندوق الـ QR يحافظ على خلفية بيضاء لسهولة مسحه ضوئياً */}
                  <div className="p-3 bg-white rounded-xl shadow-xl flex items-center justify-center border border-slate-100">
                    {userWalletAddress ? (
                      <QRCodeSVG value={userWalletAddress} size={160} level="H" />
                    ) : (
                      <p className="text-slate-900 text-xs font-bold py-4">جاري تجهيز الـ QR Code...</p>
                    )}
                  </div>
                  
                  <div className="w-full space-y-2">
                    <p className="text-xs font-bold text-yellow-600 dark:text-yellow-500">📥 محفظتك الرقمية الشخصية استقبال الإيداع (USDT - Polygon):</p>
                    <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs font-mono select-all break-all text-center tracking-wider text-emerald-600 dark:text-emerald-400">
                      {userWalletAddress || "لم يتم إنشاؤها بعد، يرجى إعادة تسجيل الدخول"}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      💡 يمكنك نسخ العنوان أو مسح الـ QR من أي تطبيق مالي. الحد الأدنى للإيداع هو 10$. سيقوم النظام بالتحقق التلقائي فور بث المعاملة.
                    </p>
                  </div>
                </div>
              )}

              {method === "baridimob" && (
                <>
                  <p className="font-bold text-amber-600 dark:text-amber-400 mb-1">معلومات حساب بريدي موب للجزائر:</p>
                  <p>الإسم: AHMED BENKHALED</p>
                  <p className="font-mono select-all bg-white dark:bg-slate-900 border border-slate-200 dark:border-transparent p-1.5 rounded mt-1 text-center text-sm tracking-wider text-slate-900 dark:text-white">RIP: 00799999000123456789</p>
                </>
              )}

              {method === "cih_bank" && (
                <>
                  <p className="font-bold text-amber-600 dark:text-amber-400 mb-1">معلومات الحساب البنكي للمغرب (CIH):</p>
                  <p>الإسم: MOHAMED ALAMI</p>
                  <p className="font-mono select-all bg-white dark:bg-slate-900 border border-slate-200 dark:border-transparent p-1.5 rounded mt-1 text-center text-sm tracking-wider text-slate-900 dark:text-white">RIB: 230123456789012345678901</p>
                </>
              )}

              {method === "sobflous" && (
                <>
                  <p className="font-bold text-amber-600 dark:text-amber-400 mb-1">معلومات الدفع لتونس (Sobflous):</p>
                  <p>رقم المحفظة أو المعرّف:</p>
                  <p className="font-mono select-all bg-white dark:bg-slate-900 border border-slate-200 dark:border-transparent p-1.5 rounded mt-1 text-center text-sm text-slate-900 dark:text-white">ID: 5543219</p>
                </>
              )}
            </div>

            {/* إدخال المبلغ */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                المبلغ المراد شحنه ({method === "binance" ? "بالدولار USDT" : method === "baridimob" ? "بالدينار الجزائري" : method === "cih_bank" ? "بالدرهم المغربي" : "بالدينار التونسي"}):
              </label>
              <input
                type="number"
                required
                placeholder={method === "baridimob" ? "مثال: 5000" : "مثال: 50"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-center font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
              />
            </div>

            {/* رفع صورة الوصل للطرق المحلية */}
            {method !== "binance" && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">إرفاق صورة إثبات التحويل (الوصل):</label>
                <input
                  type="file"
                  accept="image/*"
                  required={method !== "binance"}
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-200 dark:file:bg-slate-800 file:text-slate-800 dark:file:text-white hover:file:bg-slate-300 dark:hover:file:bg-slate-700 file:cursor-pointer bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl"
                />
              </div>
            )}

            {error && <p className="text-xs text-red-500 dark:text-red-400 bg-red-500/10 p-2 rounded-lg text-center font-semibold">{error}</p>}

            {/* زر الإرسال الديناميكي المتناسق */}
            <button
              type="submit"
              disabled={uploading || (method === "binance" && !userWalletAddress)}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all cursor-pointer shadow-lg ${
                method === "binance"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/10"
              }`}
            >
              {uploading 
                ? "🔄 جاري فحص شبكة البلوكشين وتأكيد المعاملة..." 
                : method === "binance" 
                  ? "✅ لقد قمت بالتحويل، تحقق من رصيدي الآن" 
                  : "📤 إرسال طلب الشحن للإدارة"
              }
            </button>

          </form>
        )}
      </div>
    </div>
  );
}

export default DepositModal;