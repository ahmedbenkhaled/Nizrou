// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,   
    autoRefreshToken: true, 
  }
});

// 🌐 إعدادات البنية التحتية لشبكة Polygon (Web3 Configurations)
const POLYGON_RPC_URL = "https://polygon-amoy-bor-rpc.publicnode.com"; // رابط الـ RPC العام والمجاني للشبكة الحقيقية
const ADMIN_WALLET_ADDRESS = "0x2CF7d1808B1cA1768FD584C43df38B5Cd28eC6ab"; // عنوان محفظة المنصة المركزية

// 🪙 عقد عملة USDC/USDT التجريبية المعتمدة على شبكة Amoy Testnet التي تم شحنها
const USDT_CONTRACT_ADDRESS = "0x41e94eb019c0762f9bfcf9fb1e58725bfb0f7775";

// واجهة العقد (ABI) القياسية والمطلوبة لعملية تحويل الأموال والتحقق
const ERC20_ABI = [
  "function transfer(address to, uint256 value) returns (bool)",
  "function decimals() view returns (uint8)"
];

/**
 * ⚡ دالة بث المعاملات الفيدرالية الحقيقية على البلوكشين (Blockchain Payout Engine)
 * يتم استدعاؤها من السيرفر أو لوحة التحكم عند موافقة الإدارة على الإيداع الكلاسيكي للعميل
 */
export const apiBroadcastBlockchainPayout = async (toAddress, amountUSD) => {
  try {
    // ⚙️ استيراد مكتبة ethers بالكامل لتفادي أخطاء حزم الاستدعاء الديناميكي
    const ethers = await import("ethers");
    
    // 1. الاتصال بالعقدة وجلب المفتاح السري المكتوم بأمان من ملف البيئة
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
    const adminPrivateKey = import.meta.env.VITE_ADMIN_PRIVATE_KEY; 
    
    if (!adminPrivateKey) {
      throw new Error("تنبيه حرج: لم يتم العثور على المفتاح السري VITE_ADMIN_PRIVATE_KEY في ملف الـ .env");
    }
    
    // 2. إعداد محفظة الآدمن الموقعة وربطها بعقد العملة المستقرة
    const adminWallet = new ethers.Wallet(adminPrivateKey, provider);
    const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, ERC20_ABI, adminWallet);
    
    // 3. تأمين القيمة وتحويلها برمجياً إلى صيغة الوحدات الرقمية الصارمة (6 أصفار)
    const cleanAmount = parseFloat(amountUSD).toFixed(6); // ثبات الـ Decimals
    const parsedAmount = ethers.parseUnits(cleanAmount, 6);
    
    console.log(`⏳ جاري التوقيع والبث الإداري: إرسال ${cleanAmount} إلى ${toAddress}...`);
    
    // 4. بث المعاملة وتوقيعها على سلسلة الكتلة فوراً
    const txResponse = await usdtContract.transfer(toAddress, parsedAmount);
    
    // الانتظار حتى يتم تأكيد المعاملة وتعدينها داخل البلوكشين بنجاح
    const receipt = await txResponse.wait();
    return receipt.hash; // إرجاع الـ Tx Hash الفريد لتسجيله وتتبعه
  } catch (error) {
    console.error("فشل بث المعاملة إلى شبكة Polygon:", error.message);
    throw error;
  }
};

/**
 * ⚡ دالة التحقق الآلي من البلوكشين وتحديث الرصيد فوراً دون أدمن
 */
export const apiVerifyAndProcessCryptoDeposit = async (userId, txHash, amountUSD) => {
  try {
    const ethers = await import("ethers");
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
    
    // جلب تفاصيل المعاملة وإيصالها من البلوكشين
    const tx = await provider.getTransaction(txHash);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!tx || !receipt || receipt.status !== 1) {
      throw new Error("المعاملة غير موجودة أو فشلت على الشبكة");
    }

    // 1. التحقق من أن المعاملة تمت عبر عقد USDT الصحيح المعتمد في المنصة
    if (tx.to.toLowerCase() !== USDT_CONTRACT_ADDRESS.toLowerCase()) {
      throw new Error("عقد العملة المحول غير مطابق لعملة المنصة المعتمدة");
    }

    // 2. تفكيك بيانات المعاملة (Decode Input Data) لمعرفة المحفظة المستقبلة والمبلغ الحقيقي
    const iface = new ethers.Interface(ERC20_ABI);
    const decodedRow = iface.parseTransaction({ data: tx.data, value: tx.value });
    
    if (!decodedRow || decodedRow.name !== "transfer") {
      throw new Error("نوع معاملة البلوكشين غير صالح");
    }

    const recipientAddress = decodedRow.args[0]; // المحفظة التي استلمت الأموال داخل العقد
    const transferAmount = decodedRow.args[1];   // المبلغ بالوحدات الصغرى (Hex/Wei)

    // 3. التحقق الصارم من وصول الأموال لمحفظة الأدمن وتطابق المبلغ المدخل مع البلوكشين
    if (recipientAddress.toLowerCase() !== ADMIN_WALLET_ADDRESS.toLowerCase()) {
      throw new Error("وجهة المعاملة غير متطابقة مع محفظة المنصة المركزية");
    }

    const expectedUnits = ethers.parseUnits(parseFloat(amountUSD).toFixed(6), 6);
    if (transferAmount < expectedUnits) {
      throw new Error("المبلغ الفعلي على شبكة البلوكشين أقل من المبلغ المدخل في الطلب");
    }

    // تسجيل المعاملة كـ success وتمرير الـ tx_hash (الـ Trigger في قاعدة البيانات سيقوم بزيادة الرصيد فوراً)
    const { error: txError } = await supabase.from("deposits").insert([
      {
        user_id: userId,
        amount: parseFloat(amountUSD),
        currency: "USDT",
        method: "binance",
        status: "success",
        tx_hash: txHash
      }
    ]);

    if (txError) throw txError;

    // جلب بيانات الملف الشخصي المحدثة فوراً بعد قيام الـ Trigger بزيادة الرصيد
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();

    return { success: true, newBalance: updatedProfile?.balance };
  } catch (error) {
    console.error("خطأ التحقق التلقائي:", error.message);
    throw error;
  }
};

// [POST] إرسال رمز التحقق (OTP)
export const apiSendOTP = async (email) => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true, 
    }
  });
  if (error) throw error;
};

// [POST] التحقق من الرمز
export const apiVerifyOTP = async (email, token) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) throw error;
  return data;
};

// [POST] تسجيل الدخول عبر جوجل
export const apiLoginWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin, 
    }
  });
  if (error) throw error;
  return data;
};

// [POST] تسجيل الخروج
export const apiLogout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// [GET] جلب بيانات المستخدم المدمجة مع الرصيد والملف الشخصي الآمن من الباكيند
export const apiGetCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  const { data: profile, error: pError } = await supabase
    .from('profiles')
    .select('*') 
    .eq('id', user.id)
    .single();
    
  if (pError) {
    console.warn("فشل في جلب بيانات الملف الشخصي:", pError.message);
    return user;
  }
    
  return { ...user, profile: profile || { display_name: "مستخدم", balance: 0, role: "user" } };
};