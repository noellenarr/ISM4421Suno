// Server-side proxy for the Suno API (https://docs.sunoapi.org).
// Keeps the API key out of the browser. Set SUNO_API_KEY in Netlify env vars.

const BASE = "https://api.sunoapi.org/api/v1";

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function callSuno(path, key, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { code: res.status, msg: text || res.statusText };
  }
}

export default async (req) => {
  const key = process.env.SUNO_API_KEY;
  if (!key) {
    return json(500, { code: 500, msg: "SUNO_API_KEY is not set in Netlify environment variables." });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  // Suno requires a callback URL; we point it at a tiny function and poll for results instead.
  const callBackUrl = `${url.origin}/.netlify/functions/callback`;

  try {
    if (req.method === "GET") {
      const taskId = url.searchParams.get("taskId") || "";
      if (action === "credits") return json(200, await callSuno("/generate/credit", key));
      if (action === "status")
        return json(200, await callSuno(`/generate/record-info?taskId=${encodeURIComponent(taskId)}`, key));
      if (action === "lyrics-status")
        return json(200, await callSuno(`/lyrics/record-info?taskId=${encodeURIComponent(taskId)}`, key));
    }

    if (req.method === "POST") {
      const body = await req.json();
      if (action === "generate")
        return json(200, await callSuno("/generate", key, { method: "POST", body: JSON.stringify({ ...body, callBackUrl }) }));
      if (action === "lyrics")
        return json(200, await callSuno("/lyrics", key, { method: "POST", body: JSON.stringify({ prompt: body.prompt, callBackUrl }) }));
    }

    return json(400, { code: 400, msg: "Unknown action" });
  } catch (err) {
    return json(500, { code: 500, msg: err.message || "Server error" });
  }
};
