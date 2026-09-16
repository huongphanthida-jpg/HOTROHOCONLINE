const API_KEY_STORAGE_KEY = 'GEMINI_AI_API_KEY';
const MODEL_STORAGE_KEY = 'tnh_gvcn_gemini_model_v1';

export interface GeminiModelInfo {
  id: string;
  name: string;
  description: string;
  badge: string;
  isDefault?: boolean;
}

export const PRIMARY_MODEL = "gemini-2.5-flash";
export const FALLBACK_MODEL = "gemini-1.5-flash";

export const GEMINI_MODELS: GeminiModelInfo[] = [
  {
    id: PRIMARY_MODEL,
    name: 'Gemini 2.5 Flash',
    description: 'Model tối ưu cho Vision & Trắc nghiệm (Mặc định).',
    badge: 'Khuyên Dùng (Default)',
    isDefault: true,
  },
  {
    id: FALLBACK_MODEL,
    name: 'Gemini 1.5 Flash',
    description: 'Model tốc độ cao, phản hồi nhanh, tự động dự phòng khi model chính bận/404.',
    badge: 'Dự Phòng Tốt',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Model đa thức thế hệ mới, xử lý hình ảnh và văn bản siêu tốc.',
    badge: 'Siêu Tốc',
  },
];

export function getStoredGeminiApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
}

export function saveStoredGeminiApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
}

export function getStoredGeminiModel(): string {
  return localStorage.getItem(MODEL_STORAGE_KEY) || PRIMARY_MODEL;
}

export function saveStoredGeminiModel(modelId: string): void {
  localStorage.setItem(MODEL_STORAGE_KEY, modelId);
}

/**
 * Execute Gemini AI request with automatic multi-model fallback mechanism
 * Order: [Selected Model] -> PRIMARY_MODEL -> FALLBACK_MODEL -> gemini-2.0-flash
 */
export async function executeGeminiWithFallback<T>(
  requestFn: (model: string, apiKey: string) => Promise<T>,
  userApiKey?: string,
  userModel?: string
): Promise<{ result: T; usedModel: string }> {
  const apiKey = userApiKey || getStoredGeminiApiKey();
  const primaryModel = userModel || getStoredGeminiModel();

  const fallbackSequence = Array.from(
    new Set([primaryModel, PRIMARY_MODEL, FALLBACK_MODEL, 'gemini-2.0-flash'])
  );

  let lastError: any = null;

  for (const model of fallbackSequence) {
    try {
      console.log(`[Gemini Fallback System] Attempting AI request with model: ${model}...`);
      const result = await requestFn(model, apiKey);
      return { result, usedModel: model };
    } catch (err: any) {
      console.warn(`[Gemini Fallback System] Model ${model} failed:`, err);
      lastError = err;
      // Retry immediately with next model in fallbackSequence
    }
  }

  // If all models fail, format exact API error message
  const rawErrorMessage =
    lastError?.message || lastError?.toString() || '429 RESOURCE_EXHAUSTED / API_KEY_EXHAUSTED';
  throw new Error(`Đã dừng do lỗi API: ${rawErrorMessage}`);
}
