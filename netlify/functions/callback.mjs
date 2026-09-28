// Suno posts task updates here. The app polls for results, so we just say "OK".
export default async () =>
  new Response(JSON.stringify({ code: 200, msg: "received" }), {
    headers: { "Content-Type": "application/json" },
  });
