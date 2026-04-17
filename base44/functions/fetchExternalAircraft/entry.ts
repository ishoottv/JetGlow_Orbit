import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const OTHER_APP_ID = "69b81fc39c468c6a148d08c3";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const secret = Deno.env.get("API_SHARED_SECRET");

    const response = await fetch(
      `https://jetglow.base44.app/functions/quotesApi`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${secret}`,
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: `Remote API error: ${response.status} ${errText}` }, { status: response.status });
    }

    const data = await response.json();
    return Response.json({ quotes: data.quotes || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});