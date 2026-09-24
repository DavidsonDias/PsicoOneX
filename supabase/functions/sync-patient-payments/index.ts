import { unvalidatedIntegrationResponse } from "../_shared/staging-isolation.ts";
// Polls Stripe for recent payments and marks matching financial_transactions as paid.
// Triggered from the frontend (refresh button) and can be scheduled via cron.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (s: string, d?: any) => console.log(`[SYNC-PATIENT-PAYMENTS] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

serve(async (req) => {
  const migrationPause = unvalidatedIntegrationResponse(req);
  if (migrationPause) return migrationPause;

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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: pending } = await admin
      .from("financial_transactions")
      .select("id, stripe_payment_link_id, amount")
      .eq("psychologist_id", user.id)
      .eq("status", "pending")
      .not("stripe_payment_link_id", "is", null)
      .is("deleted_at", null)
      .limit(100);

    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    let updated = 0;
    for (const tx of pending) {
      try {
        const sessions = await stripe.checkout.sessions.list({
          payment_link: tx.stripe_payment_link_id!,
          limit: 5,
        });
        const paid = sessions.data.find((s) => s.payment_status === "paid");
        if (paid) {
          await admin
            .from("financial_transactions")
            .update({
              status: "paid",
              paid_date: new Date().toISOString().slice(0, 10),
              stripe_paid_at: new Date().toISOString(),
              stripe_payment_intent_id: typeof paid.payment_intent === "string" ? paid.payment_intent : null,
            })
            .eq("id", tx.id);
          updated++;
          log("Marked paid", { tx: tx.id });
        }
      } catch (e) {
        log("Skip tx", { tx: tx.id, err: String(e) });
      }
    }

    return new Response(JSON.stringify({ updated, checked: pending.length }), {
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
