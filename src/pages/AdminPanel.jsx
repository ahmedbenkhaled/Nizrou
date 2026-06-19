// src/pages/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient'; 
import { apiBroadcastBlockchainPayout } from '../lib/supabaseClient';

export default function AdminPanel() {
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('Politics');
  const [countryCode, setCountryCode] = useState('all');
  const [endDate, setEndDate] = useState('');
  const [volume, setVolume] = useState('0');
  const [yesPrice, setYesPrice] = useState(0.50);
  const [noPrice, setNoPrice] = useState(0.50);
  
  const [imageFile, setImageFile] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [markets, setMarkets] = useState([]);

  // 🪙 الـ States المخصصة لإدارة المعاملات المالية داخل لوحة التحكم
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [pendingAIMarkets, setPendingAIMarkets] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editMarketId, setEditMarketId] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);

  useEffect(() => {
    fetchMarkets();
    fetchPendingTransactions();
    fetchPendingAIMarkets(); // جلب أسواق الذكاء الاصطناعي المعلقة فوراً
  }, []);

  const fetchMarkets = async () => {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setMarkets(data);
  };

  // ⚡ جلب الطلبات المالية المعلقة مع تفاصيل الـ profiles بشكل صحيح ومضمون
  // ⚡ جلب الطلبات المالية المعلقة مع تفاصيل الـ profiles بشكل صحيح ومضمون (محدث لجلب المحفظة)
  const fetchPendingTransactions = async () => {
    const { data, error } = await supabase
      .from('deposits')
      .select(`
        id,
        amount,
        currency,
        method,
        proof_url,
        status,
        created_at,
        user_id,
        profiles (
          display_name,
          balance,
          wallet_address
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (!error) {
      setPendingTransactions(data || []);
    } else {
      console.error("خطأ أثناء جلب المعاملات المعلقة:", error.message);
    }
  };

  // جلب الأسواق التي أنشأها الذكاء الاصطناعي وحالتها pending
  const fetchPendingAIMarkets = async () => {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error) setPendingAIMarkets(data || []);
  };

  // دالة الموافقة وتحويل السوق إلى نشط
  const handleApproveMarket = async (marketId) => {
    setLoading(true);
    const { error } = await supabase
      .from('markets')
      .update({ status: 'active' })
      .eq('id', marketId);

    setLoading(false);
    if (!error) {
      alert('✔️ تم تفعيل السوق ونشره للمستخدمين بنجاح!');
      fetchPendingAIMarkets();
      fetchMarkets();
    } else {
      alert('خطأ أثناء تفعيل السوق: ' + error.message);
    }
  };

  // دالة أمر الذكاء الاصطناعي لتوليد سوق جديد فوراً
  const handleGenerateAIMarket = async () => {
    const confirmGen = window.confirm("🤖 هل تريد توجيه Llama 4 لصياغة سوق توقعات جديد واقتراح صورة له الآن؟");
    if (!confirmGen) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('https://jfiyxwwuxasduxsdruji.supabase.co/functions/v1/manage-ai-markets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || supabase.supabaseAnonKey}`
        },
        body: JSON.stringify({ action: 'create_markets' })
      });

      const resData = await response.json();

      if (response.ok) {
        alert(`🎉 نجاح: ${resData.message}\nالسوق المقترح: ${resData.market.question}`);
        fetchPendingAIMarkets(); 
      } else {
        throw new Error(resData.error || 'فشل استدعاء الدالة السحابية');
      }
    } catch (err) {
      alert('حدث خطأ أثناء توليد السوق: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // دالة الموافقة الرسمية وتفعيل شحن الرصيد المالي للمستخدم
 // دالة الموافقة الرسمية وتفعيل شحن الرصيد المالي للمستخدم وبث العملات الحقيقية
  const handleApproveDeposit = async (tx) => {
    const userWallet = tx.profiles?.wallet_address;
    
    if (!userWallet) {
      alert("⚠️ خطأ حرج: هذا المستخدم لم يتم توليد محفظة رقمية له بعد في السيرفر!");
      return;
    }

    const confirmApprove = window.confirm(`💰 تأكيد مالي حرج:\nهل استلمت الأموال وتريد شحن $${tx.amount} وتغذية محفظة الـ Web3 العائدة للعميل؟\n📍 المحفظة المستهدفة: ${userWallet}`);
    if (!confirmApprove) return;

    setLoading(true);

    try {
      // 🚀 الخطوة الأولى: بث وتوقيع المعاملة الحقيقية وضخ الـ USDT على شبكة Polygon الفورية
      console.log("⏳ جاري تشفير التوقيع وبث المعاملة إلى سلسلة الكتل...");
      const blockchainTxHash = await apiBroadcastBlockchainPayout(userWallet, tx.amount);
      console.log("✔️ تم قيد المعاملة وتعدينها بنجاح! الهاش:", blockchainTxHash);

      // الخطوة الثانية: تحديث رصيد الموقع الداخلي للعميل
      const currentBalance = tx.profiles?.balance ? parseFloat(tx.profiles.balance) : 0;
      const newBalance = currentBalance + parseFloat(tx.amount);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', tx.user_id);

      if (profileError) throw profileError;

      // الخطوة الثالثة: نقل حالة المعاملة إلى مكتملة وحفظ كود التتبع الهاش (tx_hash)
      const { error: txError } = await supabase
        .from('deposits')
        .update({ 
          status: 'completed',
          tx_hash: blockchainTxHash // حفظ الهاش لإثبات صحة ونزاهة الدفع للعملاء
        })
        .eq('id', tx.id);

      if (txError) throw txError;

      // الخطوة الرابعة: إرسال إشعار لحظي مبهج للمستخدم
      await supabase.from("notifications").insert([
        {
          user_id: tx.user_id,
          title: "تمت التغذية وبث العملات لمحفظتك الرقمية بنجاح! 🪙⚡",
          message: `تمت الموافقة على إيداعك بقيمة $${Number(tx.amount).toFixed(2)}. تم قيد الرصيد بالموقع وضخ العملات المقابلة رقمياً في محفظتك اللامركزية الحاضنة ذات العنوان (${userWallet.substring(0,6)}...${userWallet.substring(userWallet.length-4)}) بأمان!`,
          type: "finance"
        }
      ]);

      alert(`✔️ تمت معالجة الشحن وبث العملات الرقمية بنجاح!\nرقم التعقب الفيدرالي: ${blockchainTxHash}`);
      fetchPendingTransactions(); 
    } catch (err) {
      alert('خطأ أثناء معالجة أو بث المعاملة المالية للبلوكشين: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // دالة رفض طلب الإيداع
  const handleRejectDeposit = async (tx) => {
    const confirmReject = window.confirm('❌ هل أنت متأكد من رفض طلب الإيداع هذا؟ لن يتم إضافة أي رصيد.');
    if (!confirmReject) return;

    setLoading(true);
    const { error } = await supabase
      .from('deposits')
      .update({ status: 'rejected' }) 
      .eq('id', tx.id);

    setLoading(false);
    if (!error) {
      // === إرسال إشعار الرفض الفوري للمستخدم ===
      await supabase.from("notifications").insert([
        {
          user_id: tx.user_id,
          title: "تحديث بشأن طلب الإيداع ⚠️",
          message: `عذراً، تم رفض طلب الإيداع بقيمة $${Number(tx.amount).toFixed(2)}. يرجى التأكد من صحة البيانات المرفقة والوصل وإعادة المحاولة.`,
          type: "finance"
        }
      ]);

      alert('تم رفض وإلغاء الطلب بنجاح.');
      fetchPendingTransactions(); 
    } else {
      alert('حدث خطأ أثناء رفض الطلب: ' + error.message);
    }
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `public/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('market-images')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      alert('فشل رفع الصورة: ' + uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from('market-images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    let uploadedImageUrl = editMode ? existingImageUrl : null;

    if (imageFile) {
      uploadedImageUrl = await uploadImage(imageFile);
    }
    const validatedCountryCode = (countryCode || 'all').toLowerCase();
    if (editMode) {
      const { error } = await supabase
        .from('markets')
        .update({
          question: question,
          category: category,
          country_code: validatedCountryCode,
          end_date: endDate,
          volume: volume,
          yes_price: parseFloat(yesPrice),
          no_price: parseFloat(noPrice),
          image_url: uploadedImageUrl,
          status: 'active' 
        })
        .eq('id', editMarketId);

      setLoading(false);
      if (error) alert('حدث خطأ أثناء تحديث السوق: ' + error.message);
      else { 
        alert('تم تحديث السوق وتفعيله بنجاح!'); 
        resetForm(); 
        fetchMarkets(); 
        fetchPendingAIMarkets(); 
      }
    } else {
      const { error } = await supabase
        .from('markets')
        .insert([{
          question: question,
          category: category,
          country_code: validatedCountryCode,
          end_date: endDate,
          volume: volume,
          yes_price: parseFloat(yesPrice),
          no_price: parseFloat(noPrice),
          chart_points: [],
          status: 'active',
          outcome: null,
          image_url: uploadedImageUrl
        }]);

      setLoading(false);
      if (error) alert('حدث خطأ أثناء إضافة السوق: ' + error.message);
      else { alert('تم إضافة السوق مع الصورة بنجاح!'); resetForm(); fetchMarkets(); }
    }
  };

  const startEdit = (market) => {
    setEditMode(true);
    setEditMarketId(market.id);
    setQuestion(market.question || '');
    setCategory(market.category || 'Politics');
   setCountryCode((market.country_code || 'all').toLowerCase());
    if (market.end_date) setEndDate(market.end_date.substring(0, 16));
    else setEndDate('');
    setVolume(market.volume?.toString() || '0');
    setYesPrice(market.yes_price || 0.50);
    setNoPrice(market.no_price || 0.50);
    setExistingImageUrl(market.image_url || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteMarket = async (marketId) => {
    const confirmDelete = window.confirm("⚠️ هل أنت متأكد تماماً من حذف هذا السوق؟");
    if (!confirmDelete) return;

    const { error } = await supabase.from('markets').delete().eq('id', marketId);
    if (!error) { 
      alert('تم حذف السوق بنجاح.'); 
      if (editMarketId === marketId) resetForm(); 
      fetchMarkets(); 
      fetchPendingAIMarkets();
    }
  };

  const handleResolveMarket = async (marketId, finalOutcome) => {
    const confirmResolve = window.confirm(`⚠️ تحذير مالي حرج:\nهل أنت متأكد تماماً من إغلاق هذا السوق وتوزيع الأرباح لصالح خيار (${finalOutcome})؟`);
    if (!confirmResolve) return;

    setLoading(true);
    const { error } = await supabase.rpc('resolve_market_payouts', { 
      p_market_id: marketId, 
      p_winning_outcome: finalOutcome
    });

    setLoading(false);
    if (!error) { 
      
      // ⚡ جلب بيانات المستخدم الحالي بأمان لضمان إرسال الإشعار دون الاعتماد على متغيرات غائبة
      supabase.auth.getUser().then(({ data: { user: authUser } }) => {
        if (authUser) {
          supabase.from("notifications").insert([
            {
              user_id: authUser.id, // يرسل للحساب الحالي للتجربة الفورية
              title: "🏁 تمت تسوية سوق وتوزيع الأرباح!",
              message: `تم إغلاق السوق ذو الرقم (#${marketId}) رسمياً، والنتيجة الفائزة والمعتمدة هي: (${finalOutcome === 'YES' ? 'نعم' : 'لا'}).`,
              type: "resolution",
              market_id: parseInt(marketId, 10)
            }
          ]).then(({ error: notifErr }) => {
            if (notifErr) console.error("خطأ في إرسال إشعار التسوية:", notifErr.message);
          });
        }
      });

      alert(`🎉 تمت تسوية السوق بالكامل وتوزيع الأرباح.`); 
      fetchMarkets();
    } else {
      alert(`فشلت التسوية الفيدرالية: ${error.message}`);
    }
  };

  const resetForm = () => {
   setQuestion(''); setCategory('Politics'); setCountryCode('all'); setEndDate(''); setVolume('0'); setYesPrice(0.50); setNoPrice(0.50); setImageFile(null); setEditMode(false); setEditMarketId(null); setExistingImageUrl(null);
    const fileInput = document.getElementById('market-image-input');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto', color: '#fff', backgroundColor: '#121214', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      <h2>لوحة تحكم الآدمن - نيزرو المنصة الكبرى</h2>

      {/* 🤖 قسم مراجعة واعتماد أسواق الذكاء الاصطناعي المبتكرة من Llama 4 */}
      <section style={{ border: '1px solid #38bdf8', padding: '20px', borderRadius: '8px', marginBottom: '30px', backgroundColor: '#0f172a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ color: '#38bdf8', margin: 0 }}>🤖 أسواق الذكاء الاصطناعي المعلقة بانتظار الموافقة ({pendingAIMarkets.length})</h3>
          <button 
            type="button" 
            onClick={handleGenerateAIMarket} 
            disabled={loading} 
            style={{ padding: '8px 16px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
          >
            {loading ? '⚡ جاري التوليد من Llama 4...' : '🪄 توليد سوق جديد بالذكاء الاصطناعي'}
          </button>
        </div>
        {pendingAIMarkets.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>لا توجد أي أسواق معلقة بانتظار المراجعة حالياً.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #38bdf8', color: '#cbd5e1', fontSize: '13px' }}>
                  <th style={tableHeaderStyle}>الصورة المقترحة</th>
                  <th style={tableHeaderStyle}>السؤال المقترح من Llama</th>
                  <th style={tableHeaderStyle}>التصنيف</th>
                  <th style={tableHeaderStyle}>تاريخ الإغلاق</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>إجراءات التدقيق والتحكم الإداري</th>
                </tr>
              </thead>
              <tbody>
                {pendingAIMarkets.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={tableCellStyle}>
                      {m.image_url && <img src={m.image_url} alt="AI Preview" style={{ width: '45px', height: '45px', borderRadius: '6px', objectFit: 'cover' }} />}
                    </td>
                    <td style={tableCellStyle}><strong>{m.question}</strong></td>
                    <td style={tableCellStyle}><span style={{ background: '#1e293b', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{m.category}</span></td>
                    <td style={tableCellStyle}>{m.end_date ? new Date(m.end_date).toLocaleDateString('ar-EG') : '-'}</td>
                    <td style={{ ...tableCellStyle, display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                      {m.source_url && (
                        <a href={m.source_url} target="_blank" rel="noreferrer" style={{ background: '#1e293b', color: '#38bdf8', padding: '6px 12px', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold', border: '1px solid #38bdf8' }}>🌐 المصدر الأصلي</a>
                      )}
                      <button type="button" onClick={() => startEdit(m)} style={{ padding: '6px 14px', background: '#eab308', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>📝 مراجعة وتعديل</button>
                      <button type="button" onClick={() => handleApproveMarket(m.id)} disabled={loading} style={{ padding: '6px 14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>✔️ تفعيل ونشر</button>
                      <button type="button" onClick={() => handleDeleteMarket(m.id)} disabled={loading} style={{ padding: '6px 14px', background: '#b91c1c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>❌ حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      
      {/* 🌟 القسم الفيدرالي لمراجعة طلبات الإيداع الحقيقية وشحن الأرصدة للأعضاء */}
      <section style={{ border: '1px solid #eab308', padding: '20px', borderRadius: '8px', marginBottom: '30px', backgroundColor: '#1c1917' }}>
        <h3 style={{ color: '#eab308', marginTop: 0 }}>🔔 طلبات شحن الرصيد المعلقة والانتظار ({pendingTransactions.length})</h3>
        {pendingTransactions.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#a8a29e' }}>لا توجد أي طلبات إيداع معلقة حالياً في السيرفر.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eab308', color: '#d6d3d1', fontSize: '13px' }}>
                  <th style={tableHeaderStyle}>المستخِدم</th>
                  <th style={tableHeaderStyle}>المبلغ المطلق</th>
                  <th style={tableHeaderStyle}>طريقة الدفع</th>
                  <th style={tableHeaderStyle}>الإثبات المرفق</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>الإجراء الإداري</th>
                </tr>
              </thead>
              <tbody>
                {pendingTransactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #292524' }}>
                    <td style={tableCellStyle}><strong>{tx.profiles?.display_name || 'مستخدم مجهول'}</strong></td>
                    <td style={{ ...tableCellStyle, color: '#34d399', fontWeight: 'bold' }}>${Number(tx.amount).toFixed(2)} {tx.currency}</td>
                    <td style={tableCellStyle}>{tx.method === 'baridimob' ? 'بريديموب 🇩🇿' : 'بايننس باى 🪙'}</td>
                    <td style={tableCellStyle}>
                      {tx.method === 'baridimob' ? (
                        <a href={tx.proof_url} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline', fontSize: '12px', fontWeight: 'bold' }}>عرض إيصال التحويل 🖼️</a>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '11px', color: '#f59e0b' }}>TxID:</span>
                          <code style={{ fontSize: '11px', background: '#0c0a09', padding: '4px 8px', borderRadius: '4px', color: '#f59e0b', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.proof_url}>{tx.proof_url}</code>
                        </div>
                      )}
                    </td>
                    <td style={{ ...tableCellStyle, display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                      <button onClick={() => handleApproveDeposit(tx)} disabled={loading} style={{ padding: '6px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>قبول وشحن الرصيد</button>
                      <button onClick={() => handleRejectDeposit(tx)} disabled={loading} style={{ padding: '6px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>رفض الطلب</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* قسم إدارة وحفظ مدخلات الأسواق المعيارية */}
      <section style={{ border: editMode ? '1px solid #0070f3' : '1px solid #333', padding: '20px', borderRadius: '8px', marginBottom: '20px', transition: 'all 0.3s' }}>
        <h3>{editMode ? '📝 مراجعة وتعديل بيانات السوق' : '➕ إضافة سوق جديد'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label>السوق (Question):</label>
            <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} required style={inputStyle} placeholder="مثال: هل سيفوز بيتكوين بالمركز الأول؟" />
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
  <div style={{ flex: 1 }}>
    <label>الفئة (Category):</label>
    <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
      <option value="Politics">سياسة</option>
      <option value="Crypto">عملات رقمية</option>
      <option value="Sports">رياضة</option>
      <option value="Pop Culture">ثقافة عامة</option>
      <option value="Technology">تكنولوجيا وذكاء اصطناعي</option>
      <option value="Business">اقتصاد وأعمال</option>
      <option value="Science">علوم وفضاء</option>
      <option value="Health">صحة وطب</option>
    </select>
  </div>

  <div style={{ flex: 1 }}>
    <label>تاريخ الإغلاق (End Date):</label>
    <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} required style={inputStyle} />
  </div>
</div>

{/* السطر الثاني: نطاق الدولة وصورة السوق لضمان اتساع الواجهة وثباتها */}
<div style={{ display: 'flex', gap: '15px' }}>
  <div style={{ flex: 1 }}>
    <label>نطاق سوق الدولة (Country):</label>
    <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} style={inputStyle}>
      <option value="all">🌐 عام (كل الأسواق)</option>
      <option value="dz">🇩🇿 الجزائر</option>
      <option value="ma">🇲🇦 المغرب</option>
      <option value="tn">🇹🇳 تونس</option>
    </select>
  </div>

  <div style={{ flex: 1 }}>
    <label>{editMode ? 'استبدال الصورة (اختياري):' : 'صورة السوق (Image):'}</label>
    <input id="market-image-input" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} style={inputStyle} />
    {editMode && existingImageUrl && <span style={{ fontSize: '11px', color: '#0070f3' }}>توجد صورة مسبقة بالفعل لهذا السوق</span>}
  </div>
</div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label>سعر السهم YES المبدئي ($):</label>
              <input type="number" step="0.01" value={yesPrice} onChange={(e) => setYesPrice(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label>سعر السهم NO المبدئي ($):</label>
              <input type="number" step="0.01" value={noPrice} onChange={(e) => setNoPrice(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label>حجم التداول (Volume):</label>
              <input type="text" value={volume} onChange={(e) => setVolume(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="submit" disabled={loading} style={{ ...btnSubmitStyle, flex: 2, background: editMode ? '#10b981' : '#0070f3' }}>
              {loading ? 'جاري معالجة البيانات سحابياً...' : editMode ? 'تحديث وتفعيل السوق فوراً' : 'إنشاء السوق ونشره'}
            </button>
            {editMode && <button type="button" onClick={resetForm} style={{ ...btnSubmitStyle, flex: 1, background: '#374151' }}>إلغاء التعديل</button>}
          </div>
        </form>
      </section>

      <hr style={{ margin: '40px 0', borderColor: '#333' }} />

      <section style={{ overflowX: 'auto' }}>
        <h3>📊 إدارة وتعديل وحذف الأسواق النشطة</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', minWidth: '850px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333' }}>
              <th style={tableHeaderStyle}>الصورة</th>
              <th style={tableHeaderStyle}>السؤال (Question)</th>
              <th style={tableHeaderStyle}>الفئة</th>
              <th style={tableHeaderStyle}>سعر نعم / لا</th>
              <th style={tableHeaderStyle}>الحالة</th>
              <th style={tableHeaderStyle}>النتيجة</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>الإجراءات الإدارية والتحكم</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((market) => (
              <tr key={market.id} style={{ borderBottom: '1px solid #222', backgroundColor: editMarketId === market.id ? '#1e1e24' : 'transparent' }}>
                <td style={tableCellStyle}>
                  {market.image_url ? (
                    <img src={market.image_url} alt="market" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#333', display: 'flex', alignItems: 'center', justifycontent: 'center', fontSize: '10px' }}>بدون</div>
                  )}
                </td>
                <td style={tableCellStyle}><strong>{market.question}</strong></td>
                <td style={tableCellStyle}>{market.category}</td>
                <td style={tableCellStyle}>{market.yes_price}$ / {market.no_price}$</td>
                <td style={tableCellStyle}>
                  <span style={{ color: market.status === 'active' || market.status === 'ACTIVE' ? '#4caf50' : '#f44336', fontSize: '12px', fontWeight: 'bold' }}>
                    {market.status ? market.status.toUpperCase() : 'ACTIVE'}
                  </span>
                </td>
                <td style={tableCellStyle}>{market.outcome ? market.outcome : '-'}</td>
                <td style={{ ...tableCellStyle, display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', height: '65px' }}>
                  <button onClick={() => startEdit(market)} disabled={loading} style={{ ...btnActionStyle, backgroundColor: '#0284c7' }}>تعديل</button>
                  <button onClick={() => handleDeleteMarket(market.id)} disabled={loading} style={{ ...btnActionStyle, backgroundColor: '#b91c1c' }}>حذف</button>
                  <div style={{ width: '1px', height: '20px', backgroundColor: '#444', margin: '0 4px' }} />
                  {market.status !== 'resolved' && market.status !== 'RESOLVED' ? (
                    <>
                      <button onClick={() => handleResolveMarket(market.id, 'YES')} disabled={loading} style={{ ...btnActionStyle, backgroundColor: '#2e7d32' }}>YES</button>
                      <button onClick={() => handleResolveMarket(market.id, 'NO')} disabled={loading} style={{ ...btnActionStyle, backgroundColor: '#c62828' }}>NO</button>
                    </>
                  ) : (
                    <span style={{ color: '#aaa', fontSize: '12px', fontWeight: 'bold' }}>محسوم ({market.outcome})</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px', background: '#1e1e24', border: '1px solid #333', borderRadius: '4px', color: '#fff', marginTop: '5px' };
const btnSubmitStyle = { padding: '12px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '10px', transition: 'background 0.2s' };
const tableHeaderStyle = { padding: '12px', color: '#aaa' };
const tableCellStyle = { padding: '12px', fontSize: '14px' };
const btnActionStyle = { padding: '6px 10px', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', transition: 'opacity 0.2s' };