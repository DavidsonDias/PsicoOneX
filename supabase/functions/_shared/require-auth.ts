// Shared auth guard for edge functions. Validates the caller's JWT using
// the anon key and returns { user } or an error Response.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

export async function requireUser(req: Request, corsHeaders: Record<string, string>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }
  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) throw new Error("unauth");
    return { user: data.user, authClient: client };
  } catch {
    return {
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }
}

export function requireInternalSecret(req: Request, corsHeaders: Record<string, string>) {
  const provided =
    req.headers.get("x-internal-secret") ||
    req.headers.get("x-cron-secret") ||
    req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const expected =
    Deno.env.get("INTERNAL_FUNCTION_SECRET") ||
    Deno.env.get("CRON_SECRET") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!provided || !expected || provided !== expected) {
    // Also accept service role or cron secret as valid callers
    const isServiceRole = provided === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const isCron = provided === Deno.env.get("CRON_SECRET");
    if (!isServiceRole && !isCron) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
  return null;
}
