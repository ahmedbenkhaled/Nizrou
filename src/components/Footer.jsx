import { useEffect, useState } from "react";

function Footer() {
  // جلب السنة الحالية برمجياً لضمان تحديث الحقوق تلقائياً في الـ RAM
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-slate-950 border-t border-slate-900 mt-auto pt-16 pb-12 font-cairo" dir="rtl">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-12">
        
        {/* القسم العلوي: الشعار والوصف العام */}
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2 text-white">
            <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L22 7.5v11L12 22 2 16.5v-11Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v10.5M2 7.5l10 5.5 10-5.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 14.5V9.5l6 3.5 6-3.5v5" />
            </svg>
            <span className="text-xl font-bold font-cairo">نيزرو</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">أكبر منصة توقعات وأسواق معلوماتية في المنطقة العربية.</p>
        </div>

        {/* القسم الأوسط: شبكة الروابط المقسمة (Grid) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 text-right">
          
          {/* العمود الأول: أسواق رائجة 1 */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-200 tracking-wider">أسواق العلوم والتقنية</h3>
            <ul className="list-none p-0 m-0 flex flex-col gap-2.5 text-xs font-light text-slate-300">
              <li><a href="#" className="hover:text-blue-500 transition-colors no-underline">رحلة المريخ المأهولة</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors no-underline">نموذج OpenAI القادم</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors no-underline">دمج الذكاء الاصطناعي</a></li>
            </ul>
          </div>

          {/* العمود الثاني: أسواق رائجة 2 */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-200 tracking-wider">السياسة والجيوسياسة</h3>
            <ul className="list-none p-0 m-0 flex flex-col gap-2.5 text-xs font-light text-slate-300">
              <li><a href="#" className="hover:text-blue-500 transition-colors no-underline">الانتخابات العالمية</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors no-underline">قرارات الفيدرالي القادمة</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors no-underline">اتفاقيات الطاقة والمناخ</a></li>
            </ul>
          </div>

          {/* العمود الثالث: أسواق رائجة 3 */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-200 tracking-wider">المال والعملات الرقمية</h3>
            <ul className="list-none p-0 m-0 flex flex-col gap-2.5 text-xs font-light text-slate-300">
              <li><a href="#" className="hover:text-blue-500 transition-colors no-underline">قيمة البيتكوين الحرجية</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors no-underline">صناديق الاستثمار المرنة</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors no-underline">أسواق الذهب العالمية</a></li>
            </ul>
          </div>

          {/* العمود الرابع: الدعم والشبكات */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-200 tracking-wider">الدعم والمجتمع</h3>
            <ul className="list-none p-0 m-0 flex flex-col gap-2.5 text-xs font-light text-slate-300">
              <li><a href="#" className="hover:text-blue-500 transition-colors no-underline">مركز المساعدة</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors no-underline">تويتر (X)</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors no-underline">ديسكورد</a></li>
            </ul>
          </div>

          {/* العمود الخامس: نيزرو المؤسسة */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-200 tracking-wider">نيزرو</h3>
            <ul className="list-none p-0 m-0 flex flex-col gap-2.5 text-xs font-light text-slate-300">
              <li><a href="#" className="hover:text-blue-500 transition-colors no-underline">شروط الخدمة</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors no-underline">سياسة الخصوصية</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors no-underline">فرص العمل</a></li>
            </ul>
          </div>

        </div>

        {/* الشريط السفلي الخاتم: الحقوق القانونية والتحذيرات التداولية */}
        <div className="border-t border-slate-900/60 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-right">
          <div className="text-xs text-slate-500 font-mono font-medium">
            جميع الحقوق محفوظة لمنصة نيزرو © {currentYear}
          </div>
          <div className="flex flex-row items-center gap-4 text-xs font-semibold text-slate-400">
            <a href="#" className="hover:text-white transition-colors no-underline">نزاهة السوق</a>
            <span className="text-slate-800">·</span>
            <a href="#" className="hover:text-white transition-colors no-underline">التوثيق البرمجي (API)</a>
            <span className="text-slate-800">·</span>
            <a href="#" className="hover:text-white transition-colors no-underline">اتصل بنا</a>
          </div>
        </div>

        {/* إخلاء المسؤولية القانوني أسوة بـ Polymarket */}
        <p className="text-[10px] leading-relaxed text-slate-600 text-justify font-medium max-w-7xl">
          تنويه قانوني: نيزرو هي منصة معلوماتية مخصصة للأسواق التوقعية. التداولات والأسهم الموضحة تمثل احتمالات مبنية على بيانات عامة ولا تشكل نصائح مالية أو استثمارية قطعية. المنصة تعمل بكفاءة توافقية وعلمية مطلقة لحماية خصوصية المستخدمين وبياناتهم.
        </p>

      </div>
    </footer>
  );
}

export default Footer;