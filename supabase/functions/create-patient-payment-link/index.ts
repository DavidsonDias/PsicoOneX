import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (s: string, d?: any) => console.log(`[CREATE-PATIENT-PAYMENT-LINK] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const { data: userData } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    log("User", { id: user.id });

    const { transactionId } = await req.json();
    if (!transactionId) throw new Error("transactionId is required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: tx, error: txErr } = await admin
      .from("financial_transactions")
      .select("id, amount, description, status, psychologist_id, patient_id, stripe_payment_link, due_date")
      .eq("id", transactionId)
      .single();
    if (txErr || !tx) throw new Error("Transaction not found");
    if (tx.psychologist_id !== user.id) throw new Error("Forbidden");
    if (tx.status === "paid") throw new Error("Transaction already paid");

    if (tx.stripe_payment_link) {
      log("Reusing existing link");
      return new Response(JSON.stringify({ url: tx.stripe_payment_link, reused: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: patient } = await admin
      .from("patients")
      .select("full_name, email")
      .eq("id", tx.patient_id)
      .single();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    const product = await stripe.products.create({
      name: tx.description || `Sessão — ${patient?.full_name || "Paciente"}`,
      metadata: {
        psychologist_id: tx.psychologist_id,
        patient_id: tx.patient_id || "",
        transaction_id: tx.id,
      },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(Number(tx.amount) * 100),
      currency: "brl",
    });

    const link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: {
        psychologist_id: tx.psychologist_id,
        patient_id: tx.patient_id || "",
        transaction_id: tx.id,
      },
      payment_intent_data: {
        metadata: { transaction_id: tx.id, psychologist_id: tx.psychologist_id },
      },
      after_completion: {
        type: "hosted_confirmation",
        hosted_confirmation: { custom_message: "Pagamento recebido! Obrigado." },
      },
    });

    log("Payment link created", { id: link.id, url: link.url });

    await admin
      .from("financial_transactions")
      .update({
        stripe_payment_link: link.url,
        stripe_payment_link_id: link.id,
        payment_link_sent_at: new Date().toISOString(),
      })
      .eq("id", tx.id);

    return new Response(JSON.stringify({ url: link.url, reused: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
