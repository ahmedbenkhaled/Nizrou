// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// 🟢 أضفنا خاصية requireAdmin كمعامل افتراضي قيمته false
function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, profile, isLoading } = useAuth();

  // 1. الانتظار حتى يتأكد الـ Supabase من وجود الجلسة
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-cairo">
        جاري تحميل البيانات المالية بأمان...
      </div>
    );
  }

  // 2. إذا لم يكن هناك مستخدم مسجل، قم بتوجيهه فوراً إلى الصفحة الرئيسية
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 3. 🔒 قفل الحماية الفيدرالي: إذا كانت اللوحة تتطلب مسؤولاً والمستخدم الحالي ليس كذلك
  if (requireAdmin && profile?.role !== "admin") {
    console.warn(`🛑 محاولة دخول غير مصرح بها للحساب: ${user.email}`);
    return <Navigate to="/" replace />;
  }

  // 4. إذا تجاوز كل الفحوصات الأمنية، اسمح له بالدخول
  return children;
}

export default ProtectedRoute;