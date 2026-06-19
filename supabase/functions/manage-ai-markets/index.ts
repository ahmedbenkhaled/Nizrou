import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ethers } from "npm:ethers@6.11.1"

const POLYGON_RPC_URL = Deno.env.get("POLYGON_RPC_URL") || "https://polygon-amoy-bor-rpc.publicnode.com";
const USDC_CONTRACT_ADDRESS = "0x8b0180f2101c8260d49339abfee87927412494b4";
const MIN_DEPOSIT_USD = 10.0;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, userId, amountUSD, walletAddress } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 🌟 تصحيح الخطأ الإملائي هنا بإضافة حرف Y لـ POLYGON
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);

    if (action === "verify_crypto_deposit") {
      if (!walletAddress || !userId || !amountUSD) {
        return new Response(JSON.stringify({ success: false, error: "بيانات الطلب غير مكتملة" }), { status: 400, headers: corsHeaders });
      }

      if (parseFloat(amountUSD) < MIN_DEPOSIT_USD) {
        return new Response(JSON.stringify({ success: false, error: "الحد الأدنى للايداع هو 10 دولار" }), { status: 400, headers: corsHeaders });
      }

      const latestBlock = await provider.getBlockNumber();
      
      // 🌟 تصحيح الفلتر: نقوم بعمل التنسيق للـ Checksum بشكل آمن لمنع انهيار البيئة بسبب حالة الأحرف
      const checksumAddress = ethers.getAddress(walletAddress);
      const filter = {
        address: USDC_CONTRACT_ADDRESS,
        topics: [
          ethers.id("Transfer(address,address,uint256)"),
          null,
          ethers.zeroPadValue(checksumAddress, 32)
        ]
      };

      const logs = await provider.getLogs({
        ...filter,
        fromBlock: latestBlock - 5000,
        toBlock: latestBlock
      });

      if (logs.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "لم نجد أي حوالة رقمية مطابقة وصلت لمحفظتك الشخصية حتى الآن ضمن البلوكات الأخيرة." }), { status: 400, headers: corsHeaders });
      }

      const expectedUnits = ethers.parseUnits(parseFloat(amountUSD).toFixed(6), 6);
      let detectedTxHash = "";
      let isVerified = false;

      const ERC20_ABI = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
      const iface = new ethers.Interface(ERC20_ABI);

      for (const log of logs) {
        try {
          const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
          if (parsed && parsed.args.value >= expectedUnits) {
            detectedTxHash = log.transactionHash;
            isVerified = true;
            break;
          }
        } catch (_) {
          continue;
        }
      }

      if (!isVerified) {
        return new Response(JSON.stringify({ success: false, error: "المبلغ الموجود على الشبكة غير مطابق لطلب الشحن" }), { status: 400, headers: corsHeaders });
      }

      const { data: existingTx } = await supabaseAdmin.from("deposits").select("id").eq("tx_hash", detectedTxHash).maybeSingle();
      if (existingTx) {
        return new Response(JSON.stringify({ success: false, error: "هذه المعاملة تم احتسابها وشحنها مسبقاً في النظام" }), { status: 400, headers: corsHeaders });
      }

      // 🌟 مطابقة تامة مع أعمدة جدول قاعدة البيانات المرسل منك
      const { error: insertError } = await supabaseAdmin.from("deposits").insert([
        {
          user_id: userId,
          amount: parseFloat(amountUSD),
          currency: "USDC",
          method: "binance",
          status: "success",
          tx_hash: detectedTxHash
        }
      ]);

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ success: true, message: "تم التحقق وشحن الحساب آلياً" }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "الإجراء المطلوب غير مدعوم" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    console.error("Critical Function Error:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
  }
});