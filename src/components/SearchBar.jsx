// src/components/SearchBar.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchDropdown from "./SearchDropdown";

function SearchBar() {
  const [isFocused, setIsFocused] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleFocus = () => {
    setIsFocused(true);
    setIsDropdownVisible(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // تأخير بسيط لمنح حركة الخروج (Fade-out) وقتاً كافياً قبل التدمير النهائي من الـ DOM
    setTimeout(() => {
      setIsDropdownVisible(false);
    }, 200);
  };


  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim() !== "") {
        navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
      } else {
        navigate("/explore");
      }
    }
  };

  return (
    <div className="hidden md:flex items-center flex-1 min-w-[300px] w-full h-full relative self-center">
      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500 z-10">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="ابحث عن الأسواق"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 300)} // 👈 تم رفع المدة إلى 300ms هنا
        className="w-full bg-slate-900 focus:bg-slate-950 border border-transparent text-slate-200 placeholder-slate-500 text-sm rounded-xl focus:rounded-b-none py-2 pr-10 pl-4 outline-none focus:outline-none focus:border-slate-900 transition-all duration-200 font-cairo font-light placeholder:font-light text-right"
      />

      {!isFocused && (
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-xs text-slate-600 font-mono">
          /
        </div>
      )}

      {/* 👈 تم استبدال السطر القديم وتمرير الـ Props المطلوبة لمحرك البحث اللحظي */}
      {isFocused && (
        <SearchDropdown 
          searchQuery={query} 
          clearSearch={() => { setQuery(""); setIsFocused(false); }} 
        />
      )}
    </div>
  );
}

export default SearchBar;