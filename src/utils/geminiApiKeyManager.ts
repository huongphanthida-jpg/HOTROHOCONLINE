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
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    description: 'Model tốc độ cao, phản hồi nhanh, tối ưu cho tạo đề thi & cố vấn sư phạm hàng ngày (Mặc định).',
    badge: 'Khuyên Dùng (Default)',
    isDefault: true,
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    description: 'Model tư duy sâu chuyên biệt, thích hợp cho phân tích ma trận đề thi & lập hồ sơ học bạ phức tạp.',
    badge: 'Tư Duy Sâu',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Model ổn định, tiết kiệm dung lượng Quota API và đảm bảo dự phòng khi các model mới bị bận.',
    badge: 'Dự Phòng Tốt',
  },
];

export function getStoredGeminiApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
}

export function saveStoredGeminiApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
}

export function getStoredGeminiModel(): string {
  return localStorage.getItem(MODEL_STORAGE_KEY) || 'gemini-3-flash-preview';
}

export function saveStoredGeminiModel(modelId: string): void {
  localStorage.setItem(MODEL_STORAGE_KEY, modelId);
}

/**
 * Execute Gemini AI request with automatic multi-model fallback mechanism
 * Order: [Selected Model] -> gemini-3-flash-preview -> gemini-3-pro-preview -> gemini-2.5-flash
 */
export async function executeGeminiWithFallback<T>(
  requestFn: (model: string, apiKey: string) => Promise<T>,
  userApiKey?: string,
  userModel?: string
): Promise<{ result: T; usedModel: string }> {
  const apiKey = userApiKey || getStoredGeminiApiKey();
  const primaryModel = userModel || getStoredGeminiModel();

  const fallbackSequence = Array.from(
    new Set([primaryModel, 'gemini-3-flash-preview', 'gemini-3-pro-preview', 'gemini-2.5-flash'])
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
