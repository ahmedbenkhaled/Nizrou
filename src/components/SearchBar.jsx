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

  // ...
  return (
    <div className="hidden md:flex items-center flex-1 min-w-[300px] w-full h-full relative self-center">
      {/* ... أيقونة البحث والـ input ... */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="ابحث عن الأسواق"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 300)} // 👈 تم تعديل التوقيت هنا إلى 300
        className="..."
      />

      {!isFocused && (
        <div className="...">/</div>
      )}

      {/* 👈 تم استبدال السطر القديم بهذا السطر المطور وتمرير الـ Props */}
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