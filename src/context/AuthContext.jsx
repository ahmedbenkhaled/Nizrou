// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { 
  supabase, 
  apiSendOTP,
  apiVerifyOTP,
  apiLoginWithGoogle, 
  apiLogout, 
  apiGetCurrentUser 
} from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // دالة تحديث بيانات المستخدم والملف المالي معاً
const refreshUserSession = async (currentWallet = null) => {    setIsLoading(true);
    try {
      const fullUserData = await apiGetCurrentUser();
      if (fullUserData) {
        setUser(fullUserData);
        let currentProfile = fullUserData.profile || null;
        const activeWallet = currentWallet || embeddedWallet;
        
        // إذا كان المستخدم مسجلاً وليس لديه محفظة رقمية حاضنة مسبقاً، ننشئها له فوراً
        // ربط محفظة Privy المدمجة الآمنة بملف المستخدم في سوبابيز تلقائياً
        if (currentProfile && !currentProfile.wallet_address && activeWallet) {
          try {
            const { data: updatedProfile, error: walletErr } = await supabase
              .from("profiles")
              .update({ 
wallet_address: activeWallet.address              })
              .eq("id", fullUserData.id)
              .select()
              .single();
              
            if (!walletErr && updatedProfile) {
              currentProfile = updatedProfile;
            }
          } catch (walletGenError) {
            console.error("فشل ربط محفظة Privy بقاعدة البيانات:", walletGenError);
          }
        }
        
        setProfile(currentProfile);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error("خطأ أثناء جلب الجلسة الحالية:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 1. التحقق من الجلسة فور تشغيل الموقع
    refreshUserSession();

    // 2. الاستماع لأي تغيرات تطرأ على الحساب (دخول، خروج) من السيرفر السحابي
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await refreshUserSession();
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 🟢 [ميزة التحديث اللحظي المالي لـ MVP]
  // الاستماع لجدول profiles فور توفر بيانات المستخدم
  useEffect(() => {
    if (!user || !user.id) return;

    // الاشتراك في القناة اللحظية لحساب المستخدم الحالي فقط
    const profileChannel = supabase
      .channel(`realtime-profile-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`, // فلترة آمنة لجلب تحديثات هذا الحساب فقط
        },
        (payload) => {
          console.log("⚡ تحديث مالي لحظي مكتشف من السيرفر:", payload.new);
          // تحديث الـ state للرصيد والبيانات فوراً دون عمل refresh للموقع
          setProfile(payload.new);
        }
      )
      .subscribe();

    // تنظيف الاشتراك عند خروج المستخدم أو تغيير المكون لمنع تسريب الذاكرة Memory Leak
    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user]);

  useEffect(() => {
  if (user && profile && !profile.wallet_address && embeddedWallet) {
    refreshUserSession(embeddedWallet);
  }
}, [embeddedWallet, user, profile]);
  // دالة مغلفة لإنشاء حساب جديد
  const sendOTP = async (email) => {
    return await apiSendOTP(email);
  };

  const verifyOTP = async (email, token) => {
    return await apiVerifyOTP(email, token);
  };

  // دالة مغلفة لتسجيل الدخول بجوجل
  const loginWithGoogle = async () => {
    return await apiLoginWithGoogle();
  };

  // دالة مغلفة لتسجيل الخروج
  const logout = async () => {
    await apiLogout();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      isLoading, 
      refreshProfile: refreshUserSession,
      sendOTP, 
      verifyOTP, 
      loginWithGoogle, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};