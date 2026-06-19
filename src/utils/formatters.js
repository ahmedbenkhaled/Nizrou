/* src/utils/formatters.js */

/**
 * 1. دالة معالجة التواريخ والمنطقة الزمنية (تأمين الحسابات وحل ثغرة Timezone Desync)
 * تقوم بتحويل صياغات التواريخ المختلفة القادمة من السيرفر أو Supabase 
 * إلى صياغة موحدة باللغة العربية مع fallback آمن في حال غياب البيانات.
 *
 * @param {string|Date} dateInput - التاريخ القادم من قاعدة البيانات
 * @returns {string} التاريخ منسقاً باللغة العربية
 */
export const formatDateToArabic = (dateInput) => {
  if (!dateInput) return "قريباً";

  try {
    const dateObj = new Date(dateInput);
    
    // التحقق من أن التاريخ صالح وليس كائناً مشوهاً (Invalid Date)
    if (isNaN(dateObj.getTime())) {
      // إذا كان النص ممرراً بصيغة عربية ثابتة أصلاً من الباكيند (مثل "31 ديسمبر 2026")
      return typeof dateInput === 'string' ? dateInput : "قريباً";
    }

    // تنسيق قياسي دقيق للمنطقة الزمنية لتفادي الفروق بين الدول
    return new Intl.DateTimeFormat("ar-EG", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC" // توحيد الحسابات على التوقيت العالمي القياسي
    }).format(dateObj);
  } catch (error) {
    console.error("خطأ أثناء تنسيق التاريخ:", error);
    return "قريباً";
  }
};

/**
 * 2. دالة تنظيف وتنسيق التصنيفات (حل ثغرة UI Clipping Risk)
 * تأخذ النص وتقوم باستبدال الروابط الفاصلة بمسافات مرنة ومحميّة من الكسر
 *
 * @param {string} category - اسم التصنيف القادم من السيرفر
 * @returns {string} النص منسقاً بعلامة نقطية نظيفة وعازلة بملء المسافات
 */
export const formatCategoryName = (category) => {
  if (!category || typeof category !== "string") return "تداول عام";
  
  // تنظيف النص من المسافات العشوائية وضمان استبدال حرف الواو أو النقاط بشكل جمالي مستقر
  const cleaned = category.trim();
  
  if (cleaned.includes(" و ")) {
    return cleaned.replace(/\s+و\s+/, " • ");
  }
  if (cleaned.includes(" • ")) {
    return cleaned;
  }
  
  // استبدال أي علامات ترقيم مكدسة أخرى لتأمين حاوية الـ UI
  return cleaned.replace(/[•\-\|]/g, " • ");
};

/**
 * 3. دالة صياغة وتأمين قيم العملات والأرقام (منع الـ NaN تماماً)
 *
 * @param {string|number} volume - حجم التداول القادم من قاعدة البيانات
 * @returns {string} القيمة المالية محمية ومصاغة برمز الدولار الافتراضي
 */
export const formatMarketVolume = (volume) => {
  if (volume === null || volume === undefined) return "$0";
  
  // إذا كان النص منسقاً مسبقاً بعلامة الدولار من السيرفر
  if (typeof volume === "string" && volume.startsWith("$")) {
    return volume;
  }
  
  const num = Number(volume);
  if (isNaN(num)) return typeof volume === "string" ? volume : "$0";
  
  // تحويل الرقم إلى صياغة مالية أمريكية منسقة بالآلاف وعلامات الفواصل المريحة للعين
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(num);
};