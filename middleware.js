// middleware.js (في جذر المشروع - متوافق مع خوادم حافة Vercel ومشاريع Vite)

export async function middleware(request) {
  // 1. استخراج الدولة من الحافة الجغرافية لـ Vercel
  const country = request.headers.get('x-vercel-ip-country') || 'ALL';
  
  // 2. استخراج عنوان الـ IP والمسار الحالي لغرض التوجيه وفحص الـ VPN
  const userIp = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '';
  const url = new URL(request.url);

  // 🛡️ استثناء مسار صفحة التقييد من الفحص لمنع حلقة إعادة التوجيه اللانهائية (Infinite Redirect Loop)
  if (url.pathname === '/restricted') {
    return new Response(null, { headers: { 'x-middleware-next': '1' } });
  }

  // 3. جلب القائمة السوداء وإعدادات الـ VPN ديناميكياً من Supabase API المباشر
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?select=blocked_countries,vpn_blocking_enabled&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    const data = await res.json();
    
    if (data && data[0]) {
      const { blocked_countries, vpn_blocking_enabled } = data[0];

      // 🔒 أولاً: الفحص الجغرافي الصارم للدول المحظورة
      if (blocked_countries && blocked_countries.includes(country.toUpperCase())) {
        return new Response(null, {
          status: 307,
          headers: { 'Location': `${url.origin}/restricted` }
        });
      }

      // 🛡️ ثانياً: فحص الـ VPN والوكيل (Proxy) إذا كان الخيار مفعلاً في قاعدة بياناتك
      if (vpn_blocking_enabled && userIp && userIp !== '127.0.0.1') {
        try {
          const vpnCheckRes = await fetch(`https://ipapi.co/${userIp}/json/`);
          if (vpnCheckRes.ok) {
            const vpnData = await vpnCheckRes.json();
            
            // التحقق من مؤشرات الأمان لـ VPN أو Proxy أو Tor
            if (vpnData.security && (vpnData.security.vpn || vpnData.security.proxy || vpnData.security.tor)) {
              return new Response(null, {
                status: 307,
                headers: { 'Location': `${url.origin}/restricted` }
              });
            }
          }
        } catch (vpnError) {
          console.error("VPN Verification Bypass Safety-net:", vpnError);
        }
      }
    }
  } catch (error) {
    console.error("Edge Geoblocking Middleware Error:", error);
  }

  // 🟢 تمرير الطلب النقي إلى واجهة الـ React (SPA) عند اجتياز الفحوصات الأمنية
  return new Response(null, {
    headers: { 'x-middleware-next': '1' }
  });
}

// تشغيل الـ Middleware على جميع المسارات الحساسة متضمناً مسار التقييد الجديد
export const config = {
  matcher: ['/', '/explore', '/market/:id*', '/admin', '/restricted'],
};