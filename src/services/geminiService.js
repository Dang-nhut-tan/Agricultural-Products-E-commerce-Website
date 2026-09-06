const apiKey = () => process.env.GEMINI_API_KEY || process.env.Gemini_key;
const apiRoot = "https://generativelanguage.googleapis.com/v1beta";

async function request(endpoint, body, timeoutMs = 90000) {
  if (!apiKey()) throw Object.assign(new Error("Gemini chưa được cấu hình."), { status: 503 });
  const response = await fetch(`${apiRoot}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Gemini API error:", response.status, data.error?.message || "Unknown error");
    throw Object.assign(new Error("Trợ lý AI đang bận. Vui lòng thử lại sau."), { status: 502 });
  }
  return data;
}

async function embedText(text) {
  const model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
  const data = await request(`models/${model}:embedContent`, {
    model: `models/${model}`,
    content: { parts: [{ text }] },
    taskType: "RETRIEVAL_QUERY",
    outputDimensionality: 768,
  });
  return data.embedding?.values || [];
}

async function generateJson(prompt, schema) {
  const model = process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash";
  const data = await request(`models/${model}:generateContent`, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.25,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });
  const text = data.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!text) throw Object.assign(new Error("Gemini không trả về công thức hợp lệ."), { status: 502 });
  return JSON.parse(text);
}

module.exports = { embedText, generateJson };
