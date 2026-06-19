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
  // 1. الاستماع لجدول profiles فور توفر بيانات المستخدم بشكل مستقر
  useEffect(() => {
    if (!user?.id) return;

    const channelId = `realtime-profile-${user.id}`;
    const profileChannel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log("⚡ تحديث مالي لحظي مكتشف من السيرفر:", payload.new);
          setProfile(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`🔗 تم الاشتراك بنجاح في القناة اللحظية للمستخدم: ${user.id}`);
        }
      });

    return () => {
      if (profileChannel) {
        console.log(`🔌 إغلاق القناة لمنع تسريب الذاكرة: ${channelId}`);
        supabase.removeChannel(profileChannel);
      }
    };
  }, [user?.id]); // الاعتماد على الـ id فقط يمنع إعادة الاشتراك اللانهائي عند تغير الكائن نفسه

  // 2. ربط محفظة Privy المدمجة الآمنة بملف المستخدم عند الجاهزية فقط وبدون تكرار
  useEffect(() => {
    const hasWallet = profile && profile.wallet_address;
    const walletAddressReady = embeddedWallet && embeddedWallet.address;

    if (user && walletAddressReady && !hasWallet && !isLoading) {
      console.log("🚀 اكتشاف محفظة مدمجة جديدة، بدء الربط بقاعدة البيانات...");
      refreshUserSession(embeddedWallet);
    }
  }, [user, embeddedWallet?.address, profile?.wallet_address, isLoading]);
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