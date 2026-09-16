const API_KEY_STORAGE_KEY = 'GEMINI_AI_API_KEY';
const MODEL_STORAGE_KEY = 'tnh_gvcn_gemini_model_v1';

export interface GeminiModelInfo {
  id: string;
  name: string;
  description: string;
  badge: string;
  isDefault?: boolean;
}

export const GEMINI_MODELS: GeminiModelInfo[] = [
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Model tốc độ cao, phản hồi nhanh, tối ưu cho tạo đề thi & cố vấn sư phạm hàng ngày (Mặc định).',
    badge: 'Khuyên Dùng (Default)',
    isDefault: true,
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Model đa thức thế hệ mới, xử lý hình ảnh và văn bản siêu tốc.',
    badge: 'Siêu Tốc',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Model tư duy sâu chuyên biệt, thích hợp cho phân tích ma trận đề thi & lập hồ sơ học bạ phức tạp.',
    badge: 'Tư Duy Sâu',
  },
];

export function getStoredGeminiApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
}

export function saveStoredGeminiApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
}

export function getStoredGeminiModel(): string {
  return localStorage.getItem(MODEL_STORAGE_KEY) || 'gemini-1.5-flash';
}

export function saveStoredGeminiModel(modelId: string): void {
  localStorage.setItem(MODEL_STORAGE_KEY, modelId);
}

/**
 * Execute Gemini AI request with automatic multi-model fallback mechanism
 * Order: [Selected Model] -> gemini-1.5-flash -> gemini-2.0-flash -> gemini-1.5-pro
 */
export async function executeGeminiWithFallback<T>(
  requestFn: (model: string, apiKey: string) => Promise<T>,
  userApiKey?: string,
  userModel?: string
): Promise<{ result: T; usedModel: string }> {
  const apiKey = userApiKey || getStoredGeminiApiKey();
  const primaryModel = userModel || getStoredGeminiModel();

  const fallbackSequence = Array.from(
    new Set([primaryModel, 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'])
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
