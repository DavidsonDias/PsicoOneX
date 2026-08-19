import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/require-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EXT: Record<string, string> = {
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireUser(req, corsHeaders);
  if ("error" in auth) return auth.error;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const body = await req.json();
    if (body.healthCheck) return json({ available: true, model: "openai/gpt-4o-transcribe" });

    const {
      audio,
      mimeType = "audio/wav",
      language,
      model = "openai/gpt-4o-transcribe",
    } = body as {
      audio?: string;
      mimeType?: string;
      language?: string;
      model?: string;
    };

    if (!audio) return json({ error: "No audio data provided" }, 400);

    // Decode base64 → bytes
    const binary = atob(audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    // ~2 KB WAV = header only / silence: nothing to transcribe
    if (bytes.byteLength < 2048) return json({ text: "", empty: true });
    if (bytes.byteLength > 24 * 1024 * 1024) return json({ error: "Áudio muito grande" }, 413);

    const base = (mimeType || "audio/wav").split(";")[0];
    const form = new FormData();
    form.append("model", model);
    form.append("file", new Blob([bytes], { type: base }), `recording.${EXT[base] ?? "wav"}`);
    if (language) form.append("language", language);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: form,
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.error("speech-to-text gateway error:", resp.status, detail);
      if (resp.status === 429) {
        return json({ error: "Muitas solicitações de transcrição. Aguarde alguns segundos." }, 429);
      }
      if (resp.status === 402) {
        return json({ error: "Créditos de IA insuficientes para transcrever o áudio." }, 402);
      }
      if (resp.status === 403) {
        return json({ error: "Transcrição por IA bloqueada nas configurações do workspace." }, 403);
      }
      return json({ error: `Falha na transcrição [${resp.status}]`, detail }, resp.status);
    }

    const data = await resp.json();
    return json({ text: (data?.text ?? "").trim(), usage: data?.usage });
  } catch (e) {
    console.error("speech-to-text error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
