import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Obter whitelist do ENV
    const whitelistEnv = Deno.env.get('ALWAYS_ACTIVE_EMAILS') || '';
    const whitelist = whitelistEnv
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean);

    return new Response(
      JSON.stringify({ whitelist }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Get whitelist error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
