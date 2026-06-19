import { useState, useRef, useEffect, useCallback } from "react";
import Cropper from "react-easy-crop"; 
import { supabase } from "../lib/supabaseClient";

export default function SettingsModal({ isOpen, onClose, profile, refreshProfile }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // الخيارات الأساسية
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [is2Fa, setIs2Fa] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);

  // 📐 الـ States الخاصة بعملية القص
  const [imageSrc, setImageSrc] = useState(null); 
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const fileInputRef = useRef(null);

  // 🔄 مزامنة البيانات عند الفتح وتحديث الـ States
  useEffect(() => {
    if (isOpen && profile) {
      setDisplayName(profile.display_name || "");
      setAvatarUrl(profile.avatar_url || "");
      setBio(profile.bio || "");
      setTwitterHandle(profile.twitter_handle || "");
      setIs2Fa(profile.is_2fa_enabled || false);
      setNotifyEmail(profile.notify_trades_email || false);
    }
  }, [isOpen, profile]);

  // 🎯 تم وضع الـ useCallback هنا لضمان ثبات ترتيب الـ Hooks في React
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 🛡️ [القاعدة الذهبية للـ Hooks]: شرط الـ return null يوضع هنا "بعد" الإعلان عن جميع الـ Hooks!
  if (!isOpen) return null;

  // 1️⃣ التقاط الملف وتحويله لرابط مؤقت لعرضه داخل صندوق القص
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageSrc(reader.result); 
    });
    reader.readAsDataURL(file);
  };

  // 2️⃣ قص الصورة وتنعيم الجودة برمجياً عبر الـ Canvas لمنع البكسلة
  const generateCroppedAndSmoothedImage = async (imageSrc, pixelCrop) => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = imageSrc;
      image.crossOrigin = "anonymous"; 
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = 400;
        canvas.height = 400;

        // ✨ تفعيل تنعيم الصورة لضمان جودة عالية جداً ونعومة في التفاصيل
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          400,
          400
        );

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("فشل اقتصاص الصورة"));
            return;
          }
          resolve(blob);
        }, "image/jpeg", 0.95); 
      };
      image.onerror = (error) => reject(error);
    });
  };

  // 3️⃣ رفع الصورة المقتصة والناعمة لـ Supabase
  const handleUploadCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsUploading(true);

    try {
      const croppedBlob = await generateCroppedAndSmoothedImage(imageSrc, croppedAreaPixels);
      const fileName = `${profile.id}-${Math.random()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, croppedBlob, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setAvatarUrl(data.publicUrl);
      setImageSrc(null); 
    } catch (error) {
      console.error("خطأ معالجة ورفع الصورة:", error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // حفظ التعديلات الكلية للـ Profile
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          avatar_url: avatarUrl,
          bio: bio,
          twitter_handle: twitterHandle,
          is_2fa_enabled: is2Fa,
          notify_trades_email: notifyEmail,
        })
        .eq("id", profile.id);

      if (error) throw error;
      await refreshProfile(); 
      onClose();
    } catch (err) {
      console.error("خطأ الحفظ:", err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 font-cairo" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl h-[480px] flex flex-col md:flex-row overflow-hidden shadow-2xl animate-fadeIn relative">
        
        {/* 🎇 صندوق واجهة القص والتحكم بالـ Zoom */}
        {imageSrc && (
          <div className="absolute inset-0 bg-slate-950 z-[10000] flex flex-col p-4 animate-fadeIn">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-white">تعديل الأبعاد</h3>
              <button onClick={() => setImageSrc(null)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="relative flex-1 bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round" 
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="mt-4 px-2">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Zoom</span>
              </div>
              <input 
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-800/60">
              <button 
                onClick={() => setImageSrc(null)} 
                className="text-slate-400 hover:text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button 
                onClick={handleUploadCroppedImage}
                disabled={isUploading}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-2 rounded-xl transition-colors min-w-[90px] flex items-center justify-center"
              >
                {isUploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "تطبيق"}
              </button>
            </div>
          </div>
        )}

        {/* قائمة التبويبات الثلاثية */}
        <div className="w-full md:w-44 bg-slate-950/50 border-l border-slate-800 p-4 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible shrink-0">
          <button onClick={() => setActiveTab("profile")} className={`w-full text-right px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${activeTab === "profile" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`}>👤 الحساب الشخصي</button>
          <button onClick={() => setActiveTab("security")} className={`w-full text-right px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${activeTab === "security" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`}>🔒 إعدادات الأمان</button>
          <button onClick={() => setActiveTab("notifications")} className={`w-full text-right px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${activeTab === "notifications" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`}>🔔 التنبيهات</button>
        </div>

        {/* مساحة العرض الوجيزة */}
        <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            {activeTab === "profile" && (
              <div className="flex flex-col gap-4 animate-fadeIn">
                <div className="flex items-center gap-4 bg-slate-950/30 p-3 rounded-xl border border-slate-800/40">
                  <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                  <div onClick={() => !isUploading && fileInputRef.current.click()} className="relative w-14 h-14 rounded-full overflow-hidden border border-slate-700 bg-slate-900 cursor-pointer group shrink-0">
                    <img className="w-full h-full object-cover" src={avatarUrl || "https://ui-avatars.com/api/?name=User"} alt="avatar" />
                    <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs">تعديل</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">الصورة الشخصية</h4>
                    <p className="text-[11px] text-slate-400">اضغط لتحديث صورتك الرمزية فوراُ.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">اسم المستخدم</label>
                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="الاسم" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">حساب X (تويتر)</label>
                    <div className="relative flex items-center">
                      <span className="absolute right-3 text-xs font-mono text-slate-500">@</span>
                      <input type="text" value={twitterHandle} onChange={(e) => setTwitterHandle(e.target.value.replace("@",""))} className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-7 pl-3 py-2 text-sm text-white font-mono text-left focus:outline-none focus:border-blue-500" placeholder="username" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400">النبذة التعريفية (البايو)</label>
                  <textarea maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} rows="2" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none" placeholder="اكتب نبذة قصيرة عنك..." />
                </div>
              </div>
            )}

            {/* إعدادات الأمان (مُصلح فيها مسار رسم الـ SVG والترس تماماً) */}
            {activeTab === "security" && (
              <div className="flex flex-col gap-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-white">إعدادات حماية المحفظة</h3>
                <div className="flex items-center justify-between bg-slate-950/40 p-3.5 border border-slate-800/60 rounded-xl">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-white">توثيق الحساب (2FA)</span>
                    <span className="text-[11px] text-slate-400">طلب رمز تأكيد إضافي عند سحب الأرباح والصفقات الكبيرة.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={is2Fa} onChange={() => setIs2Fa(!is2Fa)} className="sr-only peer" />
                    <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-checked:after:-translate-x-3.5 after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="flex flex-col gap-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-white">إشعارات المنصة</h3>
                <div className="flex items-center justify-between py-2.5 border-b border-slate-800/60">
                  <span className="text-xs text-slate-200">إرسال نتائج التوقعات النهائية فوراً عبر الإيميل</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={notifyEmail} onChange={() => setNotifyEmail(!notifyEmail)} className="sr-only peer" />
                    <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-checked:after:-translate-x-3.5 after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-800/60 shrink-0">
            <button onClick={onClose} className="text-slate-400 hover:text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer">إلغاء</button>
            <button onClick={handleSaveSettings} disabled={isSaving || isUploading} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-40 cursor-pointer">
              {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}