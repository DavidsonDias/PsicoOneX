import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");

    const body = await req.json();

    // Health check — tells the client if Deepgram is configured
    if (body.healthCheck) {
      return new Response(
        JSON.stringify({ available: !!DEEPGRAM_API_KEY }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!DEEPGRAM_API_KEY) {
      return new Response(
        JSON.stringify({ error: "DEEPGRAM_API_KEY not configured", fallback: true }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      audio,
      mimeType = "audio/webm",
      lang = "pt-BR",
      model = "nova-2",
      diarize = true,
      punctuate = true,
      localLabel = "Profissional",
      remoteLabel = "Paciente",
    } = body;

    if (!audio) {
      return new Response(
        JSON.stringify({ error: "No audio data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode base64 audio
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Map language code for Deepgram
    const dgLang = lang === "pt-BR" ? "pt-BR" : lang;

    // Build Deepgram URL with parameters
    const params = new URLSearchParams({
      model,
      language: dgLang,
      punctuate: String(punctuate),
      diarize: String(diarize),
      smart_format: "true",
      utterances: "true",
    });

    const dgResponse = await fetch(
      `https://api.deepgram.com/v1/listen?${params.toString()}`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": mimeType,
        },
        body: bytes,
      }
    );

    if (!dgResponse.ok) {
      const errorText = await dgResponse.text();
      console.error("Deepgram error:", dgResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Deepgram API error [${dgResponse.status}]` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dgData = await dgResponse.json();

    // Process utterances (with diarization) or alternatives
    const segments: Array<{
      speaker: string;
      speakerLabel: string;
      text: string;
      startTime: number;
      endTime: number;
      confidence: number;
    }> = [];

    if (dgData.results?.utterances) {
      for (const utt of dgData.results.utterances) {
        // Deepgram speaker IDs: 0 = first speaker, 1 = second, etc.
        // In 1:1 clinical sessions: speaker 0 = local, speaker 1 = remote
        const speakerId = utt.speaker ?? 0;
        const isLocal = speakerId === 0;

        segments.push({
          speaker: isLocal ? "local" : "remote",
          speakerLabel: isLocal ? localLabel : remoteLabel,
          text: utt.transcript,
          startTime: utt.start,
          endTime: utt.end,
          confidence: utt.confidence,
        });
      }
    } else if (dgData.results?.channels?.[0]?.alternatives?.[0]) {
      // Fallback: no diarization, single transcript
      const alt = dgData.results.channels[0].alternatives[0];
      if (alt.transcript?.trim()) {
        segments.push({
          speaker: "local",
          speakerLabel: localLabel,
          text: alt.transcript.trim(),
          startTime: 0,
          endTime: 0,
          confidence: alt.confidence,
        });
      }
    }

    return new Response(
      JSON.stringify({
        segments,
        metadata: {
          duration: dgData.metadata?.duration,
          model: dgData.metadata?.model_info?.name,
          requestId: dgData.metadata?.request_id,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("transcribe-audio error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
