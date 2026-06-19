// src/components/ScrollingComments.jsx
import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";

function ScrollingComments({ marketId }) {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (marketId == null) return;

    let isMounted = true;
    let commentsChannel = null;

    const fetchComments = async () => {
      try {
        // ⚡ سحق خطأ 400: الاستعلام عن الأعمدة الأساسية والمضمونة فقط في قاعدة البيانات
        const marketIdNumber = Number(marketId);
        const { data, error } = await supabase
          .from("comments")
          .select("id, text, created_at, market_id") 
          .eq("market_id", marketIdNumber)
          .order("created_at", { ascending: false })
          .limit(10);

        if (!error && data && isMounted) {
          setComments(data);
        }
      } catch (err) {
        console.error("خطأ في جلب التعليقات الابتدائي:", err);
      }
    };

    fetchComments();

    // ⚡ سحق خطأ Subscribe: إنشاء معرّف فريد ومستقل تماماً لكل كارت (حتى المستنسخة) لمنع تداخل القنوات
    const uniqueInstanceId = Math.random().toString(36).substring(2, 9);
    const channelName = `comments-rt-${marketId}-${uniqueInstanceId}`;
    
    try {
      commentsChannel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "comments",
            filter: `market_id=eq.${marketId}`,
          },
          (payload) => {
            if (isMounted && payload.new) {
              setComments((prev) => {
                const updated = [payload.new, ...prev];
                return updated.slice(0, 10);
              });
            }
          }
        );

      // دالة الاشتراك لا تستدعى إلا بعد إتمام تهيئة الـ .on() بالكامل
      commentsChannel.subscribe();

    } catch (realtimeError) {
      console.error("فشل ربط البث اللحظي للتعليقات بشكل آمن:", realtimeError);
    }

    return () => {
      isMounted = false;
      if (commentsChannel) {
        supabase.removeChannel(commentsChannel);
      }
    };
  }, [marketId]);

  // تكرار التعليقات برمجياً من أجل حركة Marquee دائرية خالية من القفزات
  const duplicatedComments = useMemo(() => {
    if (comments.length === 0) return [];
    if (comments.length <= 2) {
      return [...comments, ...comments, ...comments, ...comments];
    }
    return [...comments, ...comments];
  }, [comments]);

  if (comments.length === 0) {
    return (
      <div className="w-full h-full flex-1 bg-slate-950/40 border border-slate-900/60 rounded-xl flex items-center justify-center text-xs text-slate-500 font-cairo select-none">
        لا توجد نقاشات حية حول هذا التوقع حالياً.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex-1 flex bg-slate-950/40 border border-slate-900/60 rounded-xl overflow-hidden relative p-3 mask-gradient-safari" dir="rtl">
      <div className="flex flex-col gap-2 animate-marquee-vertical hover:pause-marquee will-change-transform">
        {duplicatedComments.map((comment, index) => (
          <div 
            key={`comment-node-${comment.id}-${marketId}-${index}`} 
            className="flex items-center gap-2 text-right text-xs text-slate-300 pb-0.5 truncate select-none"
          >
            <span className="font-bold text-blue-400 shrink-0 font-cairo">
              متداول محترف:
            </span>
            <span className="truncate text-slate-400 font-cairo">
              {comment.text || comment.content || "توقع جديد في منصة نيزرو"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ScrollingComments;