// src/components/SearchDropdown.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function SearchDropdown({ searchQuery, clearSearch }) {
  const navigate = useNavigate();
  const [liveMarkets, setLiveMarkets] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // مصفوفة الحالات مع الفرز المطابق للنظام الخلفي
  const browseItems = [
    { name: "جديد", id: "newest", icon: <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.954-3.055c1.196-.408 1.996-1.54 1.996-2.806V8.45c0-1.266-.8-2.398-1.996-2.806L9 2.586l.813 5.096A4 4 0 0113 11v1a4 4 0 01-3.187 3.904z" /></svg> },
    { name: "رائج", id: "trending", icon: <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> },
    { name: "سيولة عالية", id: "volume", icon: <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg> },
    { name: "ينتهي قريباً", id: "ending", icon: <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m4-2a8 8 0 11-16 0 8 8 0 0116 0z" /></svg> },
    { name: "تنافسي", id: "competitive", icon: <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg> }
  ];

  // ربط الفئات الحقيقية بمسميات الـ Database
  const topics = [
    { name: "سياسة", dbId: "Politics", image: "/images/politics.png" },
    { name: "عملات رقمية", dbId: "Crypto", image: "/images/crypto.png" },
    { name: "رياضة", dbId: "Sports", image: "/images/sports.png" },
    { name: "ثقافة شعبية", dbId: "Pop Culture", image: "/images/pop-culture.png" },
    { name: "تكنولوجيا وذكاء اصطناعي", dbId: "Technology", image: "/images/tech.png" },
    { name: "اقتصاد وأعمال", dbId: "Business", image: "/images/business.png" },
  ];

  useEffect(() => {
    const fetchSearchMarkets = async () => {
      if (!searchQuery || searchQuery.trim() === "") {
        setLiveMarkets([]);
        return;
      }
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from("markets")
          .select("id, question, image_url, yes_price")
          .ilike("question", `%${searchQuery}%`)
          .order("volume", { ascending: false })
          .limit(5);

        if (!error && data) setLiveMarkets(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    };

    const delayDebounce = setTimeout(() => { fetchSearchMarkets(); }, 150);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);
  
  const handleBrowseClick = (sortId) => {
    if (clearSearch) clearSearch();
    navigate(`/explore?sort=${sortId}`);
  };

  const handleTopicClick = (catId) => {
    if (clearSearch) clearSearch();
    navigate(`/explore?category=${catId}`);
  };

  const handleMarketClick = (id) => {
    if (clearSearch) clearSearch();
    navigate(`/market/${id}`);
  };

  const handleExploreMore = () => {
    if (clearSearch) clearSearch();
    navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="absolute top-[38px] right-0 -mt-[1px] w-full bg-slate-950 border border-slate-900 rounded-b-2xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-200 text-right">
      
      {/* التعديل الجوهري: إذا كان المستخدم يكتب في خانة البحث، نعرض نتائج قاعدة البيانات */}
      {searchQuery && searchQuery.trim() !== "" ? (
        <div>
          <span className="text-[10px] text-slate-500 font-bold tracking-wider block mb-3 font-cairo">نتائج الأسواق</span>
          
          {isSearching ? (
            <div className="text-center py-4 text-xs text-slate-500 font-cairo">جاري فحص الأسواق اللحظية...</div>
          ) : liveMarkets.length > 0 ? (
            <div className="flex flex-col gap-1">
              {liveMarkets.map((market) => (
                <div
                  key={market.id}
                  onClick={() => handleMarketClick(market.id)}
                  className="flex items-center justify-between p-2 hover:bg-slate-900/60 rounded-xl transition-all duration-150 cursor-pointer group border border-transparent hover:border-slate-900"
                >
                  {/* اليسار: نسبة الـ YES مثل بولي ماركت */}
                  <div className="bg-blue-950/40 border border-blue-900/40 group-hover:bg-blue-600 group-hover:border-blue-500 text-blue-400 group-hover:text-white px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all shrink-0">
                    {market.yes_price ? `${Math.round(market.yes_price * 100)}%` : "0%"} نعم
                  </div>

                  {/* اليمين: الصورة وعنوان السوق */}
                  <div className="flex items-center gap-3 justify-start overflow-hidden w-full pl-2 flex-row-reverse">
                    <div className="h-7 w-7 rounded-md overflow-hidden bg-slate-900 border border-slate-800 shrink-0 flex items-center justify-center">
                      <img
                        src={market.image_url || "/images/politics.png"}
                        alt="market"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = "/images/politics.png"; }}
                      />
                    </div>
                    <span className="text-xs text-slate-300 group-hover:text-white font-cairo font-normal truncate max-w-full text-right block line-clamp-1 direction-rtl">
                      {market.question}
                    </span>
                  </div>
                </div>
              ))}

              {/* زر استكشاف المزيد أسفل الـ 5 نتائج */}
              <div 
                onClick={handleExploreMore}
                className="mt-2 pt-2 border-t border-slate-900 flex items-center justify-center text-xs text-blue-400 hover:text-blue-300 font-cairo font-medium cursor-pointer transition-colors"
              >
                استكشاف المزيد عن "{searchQuery}" ←
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-slate-500 font-cairo">لا توجد أسواق تطابق هذا البحث حالياً.</div>
          )}
        </div>
      ) : (
        /* الوضع الافتراضي الثابت في حال عدم وجود نص بحث */
        <>
          {/* القسم الأول: أزرار التصفح السريع */}
          <div className="mb-5">
            <span className="text-[10px] text-slate-500 font-bold tracking-wider block mb-2 font-cairo">تصفح حسب الفرز</span>
            <div className="flex flex-wrap gap-2 justify-start w-full">
              {browseItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleBrowseClick(item.id)}
                  className="bg-slate-950 border border-slate-800 hover:bg-slate-900 hover:border-slate-700 text-slate-300 text-xs font-cairo px-3 py-1.5 rounded-xl transition-colors duration-150 cursor-pointer flex items-center gap-2 flex-row-reverse whitespace-nowrap"
                >
                  <span>{item.name}</span>
                  <span className="text-white">{item.icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* القسم الثاني: شبكة المواضيع الحقيقية */}
          <div>
            <span className="text-[10px] text-slate-500 font-bold tracking-wider block mb-2 font-cairo">الموضوعات</span>
            <div className="grid grid-cols-2 gap-2">
              {topics.map((topic, index) => (
                <div
                  key={index}
                  onClick={() => handleTopicClick(topic.dbId)}
                  className="flex items-center justify-between p-2 bg-slate-950/40 border border-slate-800 hover:bg-slate-900 hover:border-slate-700 rounded-xl transition-all duration-300 cursor-pointer group hover:scale-[1.01]"
                >
                  <span className="text-xs text-slate-300 font-cairo group-hover:text-white transition-colors pr-1">
                    {topic.name}
                  </span>
                  <div className="h-9 w-9 rounded-lg overflow-hidden border border-slate-900 bg-slate-950 flex items-center justify-center shrink-0">
                    <img 
                      src={topic.image} 
                      alt={topic.name}
                      className="w-full h-full object-cover object-center max-w-full max-h-full aspect-square transition-transform duration-500 group-hover:scale-110 [image-rendering:auto]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  );
}

export default SearchDropdown;