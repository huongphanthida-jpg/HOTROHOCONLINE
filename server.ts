import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Helper to get Gemini client
function getGeminiClient(customApiKey?: string) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper delay for backoff retry
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Fallback models for robust reliability (ordered by speed, capability, and availability)
const FALLBACK_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash",
];

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasServerGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Gemini AI Proxy Endpoint
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const {
      prompt,
      model,
      systemInstruction,
      apiKey: customKey,
      temperature = 0.7,
      maxOutputTokens = 4096,
      responseMimeType,
      images, // array of { inlineData: { mimeType, data } }
    } = req.body;

    if (!prompt && (!images || images.length === 0)) {
      return res.status(400).json({ error: "Thiếu prompt hoặc tài liệu đầu vào" });
    }

    const ai = getGeminiClient(customKey);
    if (!ai) {
      return res.status(401).json({
        error: "Chưa cấu hình Gemini API Key. Vui lòng nhập API Key trong phần Cài đặt!",
        needApiKey: true,
      });
    }

    // Remap deprecated or invalid models
    let targetModel = model || "gemini-3.8-flash";
    if (targetModel === "gemini-3.6-flash" || targetModel === "gemini-2.0-flash") {
      targetModel = "gemini-3.8-flash";
    }

    // Build models list to try
    const modelsToTry = [
      targetModel,
      ...FALLBACK_MODELS.filter((m) => m !== targetModel),
    ];

    let lastError: any = null;
    let successData = null;

    // Up to 2 passes across the fallback models in case of transient spikes
    const MAX_PASSES = 2;

    passLoop: for (let pass = 0; pass < MAX_PASSES; pass++) {
      if (pass > 0) {
        // Brief backoff before 2nd pass across fallback models
        console.log(`Retrying fallback models (pass ${pass + 1}/${MAX_PASSES}) after backoff...`);
        await delay(1200);
      }

      for (const modelName of modelsToTry) {
        // Don't attempt Pro models as automatic fallback unless explicitly requested
        if (modelName === "gemini-3.1-pro-preview" && targetModel !== "gemini-3.1-pro-preview") {
          continue;
        }

        const contentsPayload: any = [];
        if (images && Array.isArray(images) && images.length > 0) {
          for (const img of images) {
            contentsPayload.push({
              inlineData: {
                mimeType: img.mimeType || "image/jpeg",
                data: img.data,
              },
            });
          }
        }
        if (prompt) {
          contentsPayload.push({ text: prompt });
        }

        const config: any = {
          temperature,
          maxOutputTokens,
        };

        if (systemInstruction) {
          config.systemInstruction = systemInstruction;
        }

        if (responseMimeType) {
          config.responseMimeType = responseMimeType;
        }

        const payload = contentsPayload.length === 1 && prompt ? prompt : { parts: contentsPayload };

        // 12s timeout per model attempt to prevent hanging during high-demand server spikes
        const timeoutMs = 12000;
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms for ${modelName}`)), timeoutMs);
        });

        try {
          const response = await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents: payload,
              config,
            }),
            timeoutPromise,
          ]);

          successData = {
            text: response.text || "",
            usedModel: modelName,
          };
          break passLoop;
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.code;
          const errMsg = err?.message || "";

          console.warn(`Model ${modelName} (pass ${pass + 1}) failed. Error:`, errMsg);

          // If invalid API key or permission denied, fail immediately
          if (status === 401 || status === 403) {
            return res.status(status).json({
              error: "API Key không hợp lệ hoặc không có quyền truy cập. Vui lòng kiểm tra lại trong phần Cài đặt!",
            });
          }

          // If 503 UNAVAILABLE (high demand), 429 (rate limit), or other transient error,
          // instantly failover to the next alternative model in the list!
          console.log(`Model ${modelName} encountered error (${status || 'transient'}). Failing over immediately to next model...`);
          continue;
        }
      }
    }

    if (successData) {
      return res.json(successData);
    }

    return res.status(500).json({
      error: `Tất cả các mô hình AI đều không phản hồi: ${lastError?.message || "Lỗi không xác định"}`,
    });
  } catch (globalErr: any) {
    console.error("Gemini API server error:", globalErr);
    return res.status(500).json({
      error: globalErr.message || "Lỗi xử lý yêu cầu AI",
    });
  }
});

// Proxy for Google Apps Script Web App sync
app.post("/api/sync-google-sheets", async (req, res) => {
  try {
    const { scriptUrl, payload } = req.body;
    if (!scriptUrl) {
      return res.status(400).json({ error: "Thiếu URL Google Apps Script Web App" });
    }

    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let jsonResult;
    try {
      jsonResult = JSON.parse(text);
    } catch {
      jsonResult = { message: text };
    }

    return res.json({ success: true, result: jsonResult });
  } catch (error: any) {
    console.error("Google Sheets sync error:", error);
    return res.status(500).json({
      error: "Không thể kết nối đến Google Apps Script. Vui lòng kiểm tra URL Web App và quyền truy cập.",
      details: error.message,
    });
  }
});

// Proxy for fetching online class database from Google Apps Script / Google Sheets
app.post("/api/fetch-google-sheet-classes", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Thiếu URL Google Sheet / Web App" });
    }

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json, text/plain, */*" },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Lỗi kết nối HTTP ${response.status}` });
    }

    const text = await response.text();
    let jsonResult: any;
    try {
      jsonResult = JSON.parse(text);
      if (jsonResult.classes && Array.isArray(jsonResult.classes)) {
        return res.json({ success: true, classes: jsonResult.classes });
      }
      if (Array.isArray(jsonResult)) {
        return res.json({ success: true, classes: jsonResult });
      }
    } catch {
      // If text is CSV format
    }

    return res.json({ success: true, rawText: text, result: jsonResult });
  } catch (error: any) {
    console.error("Google Sheets fetch error:", error);
    return res.status(500).json({
      error: "Không thể tải danh sách lớp học từ Google Sheets",
      details: error.message,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
