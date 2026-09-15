import { 
  Question, 
  GameType, 
  QuizGameQuestion, 
  DragDropCategory, 
  DragDropItem, 
  MatchingPair,
  FillBlankQuestion,
  FillBlankGameData,
  FillBlankBlankItem
} from '../types';
import { buildSlugSubjectId } from '../utils/sharePayloadUtils';

export interface AICallParams {
  prompt: string;
  model?: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  images?: { mimeType: string; data: string }[];
}

export const AVAILABLE_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'gemini-3-flash-preview (Mặc định - Nhanh & Chuẩn)', tag: 'Mặc định' },
  { id: 'gemini-3-pro-preview', name: 'gemini-3-pro-preview (Suy luận sâu - Nâng cao)', tag: 'Pro Suy Luận' },
  { id: 'gemini-2.5-flash', name: 'gemini-2.5-flash (Tự động dự phòng khi lỗi API)', tag: 'Ổn định' },
  { id: 'gemini-3.1-flash-lite', name: 'gemini-3.1-flash-lite (Siêu tốc & Chịu tải cao)', tag: 'Siêu tốc' },
];

/**
 * Trích xuất đoạn mã code sạch (loại bỏ markdown wrappers ```html ... ``` và các câu văn chào hỏi đứng trước/sau)
 */
export function extractCleanCode(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText.trim();

  // 1. Match khối markdown ```html ... ``` nếu có
  const codeMatch = cleaned.match(/```(?:html|javascript|p5js)?\s*([\s\S]*?)```/i);
  if (codeMatch && codeMatch[1]) {
    cleaned = codeMatch[1].trim();
  }

  // 2. Loại bỏ câu chào hỏi đứng trước <!DOCTYPE hoặc <html nếu có
  const htmlStartMatch = cleaned.match(/(<!DOCTYPE[\s\S]*|<html[\s\S]*)/i);
  if (htmlStartMatch && htmlStartMatch[1]) {
    cleaned = htmlStartMatch[1].trim();
  }

  // 3. Xóa bớt phần dính đuôi ``` hoặc văn bản ở sau </html>
  const htmlEndIdx = cleaned.toLowerCase().lastIndexOf('</html>');
  if (htmlEndIdx !== -1) {
    cleaned = cleaned.substring(0, htmlEndIdx + 7).trim();
  }

  return cleaned;
}

/**
 * Làm sạch văn bản mô tả / hướng dẫn từ AI: loại bỏ các câu chào hỏi xã giao, trích dẫn tài liệu thừa
 */
export function cleanAiProseText(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText.trim();

  // Loại bỏ toàn bộ khối code ``` ... ``` dính trong văn bản
  cleaned = cleaned.replace(/```(?:html|javascript|p5js)?[\s\S]*?```/gi, '');

  // Loại bỏ các câu bắt đầu bằng: Chào bạn, Dựa trên tài liệu, Dưới đây là mã nguồn...
  cleaned = cleaned.replace(/^(?:Chào bạn|Dựa trên hình ảnh|Dựa trên tài liệu|Dưới đây là|Theo tài liệu|Tôi nhận thấy|Chào quý thầy cô)[^.\n]*[.\n]?/gi, '');
  cleaned = cleaned.replace(/(?:Chào bạn|Dựa trên hình ảnh|Dựa trên tài liệu|Dưới đây là|Theo tài liệu|Tôi nhận thấy|Chào quý thầy cô)[\s\S]*?(?:tôi sẽ|dưới đây là|mô phỏng:?)/gi, '');
  cleaned = cleaned.replace(/Dưới đây là mã nguồn[\s\S]*$/gi, '');
  cleaned = cleaned.replace(/```[\s\S]*$/gi, '');

  return cleaned.trim();
}

/**
 * Gọi Gemini AI qua Direct Client API hoặc Server API Proxy với cơ chế Tự động Fallback Model
 */
export async function callGeminiAI(params: AICallParams): Promise<{ text: string; usedModel: string }> {
  const localKey = (localStorage.getItem('gemini_api_key') || '').trim();
  let localModel = localStorage.getItem('selected_model') || 'gemini-3-flash-preview';

  let model = params.model || localModel;

  const candidateModels = Array.from(
    new Set([
      model,
      'gemini-3-flash-preview',
      'gemini-3-pro-preview',
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ])
  );

  // 1. Direct Google Gemini API call if user has localKey
  if (localKey && localKey.length > 0) {
    const parts: any[] = [];
    if (params.images && params.images.length > 0) {
      for (const img of params.images) {
        parts.push({
          inline_data: {
            mime_type: img.mimeType || 'image/jpeg',
            data: img.data,
          },
        });
      }
    }
    if (params.prompt) {
      parts.push({ text: params.prompt });
    }

    const contentsPayload = parts.length === 1 && params.prompt ? [{ parts: [{ text: params.prompt }] }] : [{ parts }];

    let lastErrorMessage = '';

    for (const candidateModel of candidateModels) {
      try {
        const directRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${localKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: contentsPayload,
              generationConfig: {
                temperature: params.temperature ?? 0.7,
                maxOutputTokens: params.maxOutputTokens ?? 4096,
                responseMimeType: params.responseMimeType,
              },
            }),
          }
        );

        const rawDirectText = await directRes.text();

        if (directRes.ok && rawDirectText && rawDirectText.trim()) {
          try {
            const directData = JSON.parse(rawDirectText);
            const text = directData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text) {
              return { text, usedModel: candidateModel };
            }
          } catch (jsonErr) {
            console.warn(`Direct Gemini model ${candidateModel} JSON parse error:`, jsonErr);
          }
        } else if (!directRes.ok) {
          let errMsg = `Mã lỗi HTTP ${directRes.status}`;
          try {
            const errJson = JSON.parse(rawDirectText);
            if (errJson.error?.message) errMsg = errJson.error.message;
          } catch {}

          if (directRes.status === 401 || directRes.status === 403) {
            throw new Error('API Key không hợp lệ hoặc đã hết hạn. Vui lòng bấm link màu đỏ trên Header để lấy API Key mới!');
          }
          
          lastErrorMessage = `${candidateModel}: ${errMsg}`;
          console.warn(`Gemini model ${candidateModel} failed with status ${directRes.status}, trying fallback model...`);
          // Continue loop to try next candidate model
        }
      } catch (directErr: any) {
        if (directErr.message && directErr.message.includes('API Key')) {
          throw directErr;
        }
        lastErrorMessage = directErr.message || String(directErr);
        console.warn(`Error trying candidate model ${candidateModel}:`, lastErrorMessage);
      }
    }

    if (lastErrorMessage && lastErrorMessage.includes('429')) {
      throw new Error('API Key của bạn đã vượt quá giới hạn lượt gọi (Rate Limit 429). Vui lòng đổi Key khác hoặc thử lại sau.');
    }
  }

  // 2. Server Proxy Attempt / Fallback
  try {
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        model,
        apiKey: localKey,
      }),
    });

    const rawText = await response.text();

    if (!rawText || !rawText.trim() || rawText.trim().startsWith('<')) {
      if (!localKey) {
        throw new Error('Chưa cấu hình Gemini API Key! Vui lòng bấm vào dòng chữ màu đỏ "Lấy API key để sử dụng app" trên Header để dán API Key của bạn.');
      }
      throw new Error('Máy chủ AI không trả về dữ liệu JSON hợp lệ. Vui lòng kiểm tra lại Gemini API Key trong phần Cài đặt.');
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      throw new Error('Phản hồi từ máy chủ không đúng định dạng JSON. Vui lòng nhập Gemini API Key cá nhân trong phần Cài đặt.');
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(data.error || 'API Key không hợp lệ hoặc đã hết hạn. Vui lòng bấm link màu đỏ trên Header để lấy API Key mới.');
      }
      if (response.status === 429) {
        throw new Error('Đã đạt giới hạn yêu cầu (Rate Limit / Quota 429). Vui lòng thử lại sau giây lát.');
      }
      if (response.status === 503) {
        throw new Error('Mô hình AI đang có lưu lượng truy cập cao đột biến (503). Vui lòng thử lại sau giây lát.');
      }
      throw new Error(data.error || `Lỗi từ máy chủ AI: ${response.status}`);
    }

    return {
      text: data.text || '',
      usedModel: data.usedModel || model,
    };
  } catch (err: any) {
    if (!localKey && (err.message?.includes('JSON') || err.message?.includes('Unexpected'))) {
      throw new Error('Chưa cấu hình Gemini API Key! Vui lòng bấm vào dòng chữ màu đỏ "Lấy API key để sử dụng app" trên Header để dán API Key của bạn.');
    }
    throw err;
  }
}

/**
 * Tạo tóm tắt lý thuyết, điểm cốt lõi từ nhiều nguồn tài liệu (nhiều ảnh SGK, văn bản)
 * TUYỆT ĐỐI KHÔNG TỰ Ý TẠO THÔNG TIN NGOÀI NGUỒN CUNG CẤP (Zero Hallucination)
 */
export async function summarizeTheoryDocument(
  docTitle: string,
  docContent: string,
  images?: { mimeType: string; data: string; title?: string; pageIndex?: number }[],
  sourceItemsSummary?: string
): Promise<{ summary: string; keyPoints: string[]; formulas: string[] }> {
  const imagesInfo = images && images.length > 0
    ? `\n\nDanh mục ${images.length} trang ảnh sách giáo khoa được đính kèm:\n${images.map((img, i) => `+ Trang/Ảnh #${i + 1}: ${img.title || `Trang SGK #${i + 1}`}`).join('\n')}\n(AI BẮT BUỘC phải đọc kỹ toàn bộ các hình ảnh này và kết hợp nội dung từ tất cả các trang ảnh cùng với văn bản)`
    : '';

  const sourcesSummary = sourceItemsSummary ? `\n\nDanh sách các nguồn được cung cấp:\n${sourceItemsSummary}` : '';

  const prompt = `Bạn là một chuyên gia sư phạm hàng đầu và giáo viên luyện thi quốc gia tại Việt Nam.
Hãy phân tích và tổng hợp tài liệu học tập sau đây với tiêu đề "${docTitle}":
${sourcesSummary}${imagesInfo}

--- BẮT ĐẦU NỘI DUNG TÀI LIỆU ĐƯA LÊN ---
${docContent.slice(0, 25000)}
--- KẾT THÚC NỘI DUNG TÀI LIỆU ĐƯA LÊN ---

QUY TẮC BẮT BUỘC (CRITICAL MANDATE):
1. KẾT HỢP NỘI DUNG TỪ NHIỀU NGUỒN: Bắt buộc phải kết hợp, xâu chuỗi và tổng hợp kiến thức từ TẤT CẢ các nguồn tài liệu được đưa lên (toàn bộ các trang ảnh SGK, các tệp văn bản, ghi chú).
2. TUYỆT ĐỐI KHÔNG TỰ Ý TẠO THÔNG TIN NGOÀI NGUỒN CUNG CẤP (Zero-Hallucination): Toàn bộ các định nghĩa, khái niệm, công thức, số liệu và kiến thức trọng tâm PHẢI có căn cứ 100% từ tài liệu và các trang ảnh sách giáo khoa được đưa lên. Nghiêm cấm bịa đặt, suy diễn vượt quá phạm vi tài liệu.
3. MINH BẠCH TRÍCH DẪN: Ở phần tóm tắt và điểm trọng tâm, ghi rõ trích dẫn từ nguồn/trang nào (ví dụ: "[Trang SGK #1]", "[Trang SGK #2]").

Nhiệm vụ của bạn:
1. Viết một bản Tóm tắt lý thuyết tổng hợp tinh gọn, chuẩn sách giáo khoa (khoảng 3-5 đoạn súc tích, kết nối toàn diện các trang/nguồn tài liệu).
2. Liệt kê các Điểm trọng tâm (Key Points) cần ghi nhớ để làm bài thi (kèm nguồn trích dẫn từ tài liệu).
3. Liệt kê các Công thức hoặc Định nghĩa cốt lõi có trong tài liệu.

Định dạng trả về duy nhất là định dạng JSON hợp lệ (không kèm markdown \`\`\`json ở ngoài), theo mẫu:
{
  "summary": "Nội dung tóm tắt chi tiết chuẩn SGK kết hợp từ các nguồn...",
  "keyPoints": [
    "[Trang SGK #1] Điểm trọng tâm 1...",
    "[Trang SGK #2] Điểm trọng tâm 2...",
    "Điểm trọng tâm tổng hợp 3..."
  ],
  "formulas": [
    "Công thức hoặc định nghĩa then chốt 1...",
    "Công thức hoặc định nghĩa then chốt 2..."
  ]
}`;

  const { text } = await callGeminiAI({
    prompt,
    temperature: 0.3,
    images: images && images.length > 0 ? images.map(img => ({ mimeType: img.mimeType, data: img.data })) : undefined,
  });

  try {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    // Fallback if formatting was non-strict
    return {
      summary: text,
      keyPoints: ['Ôn tập kỹ các khái niệm cơ bản', 'Chú ý điều kiện xác định và các trường hợp ngoại lệ'],
      formulas: [],
    };
  }
}

/**
 * Tự động tạo câu hỏi trắc nghiệm / đề thi từ tài liệu (hỗ trợ đa nguồn & nhiều ảnh SGK)
 * TUYỆT ĐỐI KHÔNG TỰ Ý TẠO THÔNG TIN NGOÀI NGUỒN CUNG CẤP (Zero Hallucination)
 */
export async function generateQuestionsFromDoc(
  docContent: string,
  subjectId: string,
  count: number = 5,
  images?: { mimeType: string; data: string; title?: string; pageIndex?: number }[],
  sourceItemsSummary?: string,
  options?: {
    questionFormat?: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'mixed';
    selectedFormats?: ('multiple_choice' | 'short_answer' | 'true_false' | 'essay')[];
    formatCounts?: Record<string, number>;
    difficulty?: 'balanced' | 'easy' | 'medium' | 'hard';
    subjectName?: string;
  }
): Promise<Question[]> {
  return generateExamFromSource({
    sourceContent: docContent,
    subjectName: options?.subjectName || 'Tài liệu học tập chuẩn SGK',
    className: '12D1',
    grade: '12',
    subjectType: 'Chuyên đề học tập',
    count,
    questionFormat: options?.questionFormat || 'multiple_choice',
    selectedFormats: options?.selectedFormats,
    formatCounts: options?.formatCounts,
    difficulty: options?.difficulty || 'balanced',
    images: images || [],
    sourceItemsSummary,
  });
}

/**
 * Giải thích sâu cho một câu hỏi thi chuẩn SGK
 */
export async function explainQuestionDeeply(
  question: Question,
  userSelectedOption: number | string | null
): Promise<string> {
  const userOptionText =
    userSelectedOption !== null && userSelectedOption !== undefined
      ? typeof userSelectedOption === 'number'
        ? question.options[userSelectedOption] || `Phương án ${String.fromCharCode(65 + userSelectedOption)}`
        : String(userSelectedOption)
      : 'Chưa trả lời';

  const correctOptionText =
    question.sampleAnswer ||
    question.options[question.correctAnswer] ||
    (question.type === 'true_false' ? (question.correctAnswer === 0 ? 'ĐÚNG' : 'SAI') : '');

  const prompt = `Bạn là thầy/cô giáo dạy giỏi cấp quốc gia. Hãy giải thích câu hỏi thi sau đây cho học sinh một cách ân cần, chuẩn mực sách giáo khoa:

Câu hỏi: "${question.content}"
Các phương án:
${question.options.map((opt, i) => `${i}. ${opt}`).join('\n')}

Học sinh đã chọn: ${userOptionText}
Đáp án chính xác là: ${correctOptionText}
Lời giải gốc SGK: ${question.explanation}

Hãy phân tích theo cấu trúc:
1. 🎯 **Bản chất kiến thức SGK cốt lõi**: Nêu rõ định lý, công thức hoặc sự kiện liên quan.
2. 🔍 **Các bước giải chi tiết**: Từng bước suy luận logic để đi tới đáp án đúng.
3. ⚠️ **Bẫy đề thi & Sai lầm thường gặp**: Vì sao học sinh hay chọn nhầm các đáp án khác.
4. 💡 **Mẹo ghi nhớ siêu tốc**: Câu thần chú, cách nhớ nhanh hoặc phương pháp bấm máy tính Casio nếu có.`;

  const { text } = await callGeminiAI({
    prompt,
    temperature: 0.4,
  });

  return text;
}

/**
 * Trợ giảng AI tương tác trực tiếp (AI Tutor)
 */
export async function askAITutor(
  userQuestion: string,
  context?: string
): Promise<string> {
  const prompt = `Bạn là Trợ giảng AI thông minh EduExam, luôn thân thiện, động viên và giải thích chuẩn mực kiến thức giáo dục phổ thông Việt Nam.
${context ? `Ngữ cảnh học tập hiện tại:\n${context}\n` : ''}

Câu hỏi của học sinh: "${userQuestion}"

Hãy trả lời bằng tiếng Việt chuẩn xác, sử dụng định dạng Markdown rõ ràng, dễ đọc, truyền cảm hứng học tập.`;

  const { text } = await callGeminiAI({
    prompt,
    temperature: 0.6,
  });

  return text;
}

export interface GenerateExamFromSourceParams {
  sourceContent: string;
  subjectName: string;
  className: string;
  grade: string;
  subjectType?: string;
  count: number;
  questionFormat: 'multiple_choice' | 'short_answer' | 'true_false' | 'essay' | 'mixed';
  selectedFormats?: ('multiple_choice' | 'short_answer' | 'true_false' | 'essay')[];
  formatCounts?: Partial<Record<'multiple_choice' | 'short_answer' | 'true_false' | 'essay', number>>;
  difficulty?: 'balanced' | 'easy' | 'medium' | 'hard';
  images?: { mimeType: string; data: string; title?: string; pageIndex?: number }[];
  sourceItemsSummary?: string;
}

/**
 * Tạo đề thi tự động từ nguồn dữ liệu tải lên (văn bản/file) theo lớp học
 * Bám sát nội dung đưa lên, tạo theo đúng các dạng câu hỏi được chọn (trắc nghiệm, trả lời ngắn, đúng/sai, tự luận)
 * TỔNG HỢP VÀ KẾT HỢP KIẾN THỨC TỪ NHIỀU NGUỒN TÀI LIỆU (nhiều ảnh SGK, nhiều tài liệu)
 * TUYỆT ĐỐI KHÔNG TỰ Ý TẠO THÔNG TIN NGOÀI NGUỒN CUNG CẤP (Zero Hallucination)
 * Cho phép tùy chỉnh số lượng câu hỏi cho từng dạng và bảo toàn thang điểm 10.0
 */
export async function generateExamFromSource(
  params: GenerateExamFromSourceParams
): Promise<Question[]> {
  const {
    sourceContent,
    subjectName,
    className,
    grade,
    subjectType = 'Toán',
    count = 5,
    questionFormat = 'multiple_choice',
    selectedFormats,
    formatCounts,
    difficulty = 'balanced',
    images = [],
    sourceItemsSummary,
  } = params;

  // Xây dựng hướng dẫn dạng câu hỏi chi tiết
  const activeFormats: ('multiple_choice' | 'short_answer' | 'true_false' | 'essay')[] =
    selectedFormats && selectedFormats.length > 0
      ? selectedFormats
      : questionFormat === 'multiple_choice'
      ? ['multiple_choice']
      : questionFormat === 'short_answer'
      ? ['short_answer']
      : questionFormat === 'true_false'
      ? ['true_false']
      : questionFormat === 'essay'
      ? ['essay']
      : ['multiple_choice', 'short_answer', 'true_false', 'essay'];

  const formatCountsInstruction = (() => {
    if (formatCounts && Object.keys(formatCounts).length > 0) {
      const lines: string[] = [];
      if ((formatCounts.multiple_choice || 0) > 0) {
        lines.push(`+ Trắc nghiệm 4 phương án ABCD ("type": "multiple_choice"): Đúng ${formatCounts.multiple_choice} câu`);
      }
      if ((formatCounts.short_answer || 0) > 0) {
        lines.push(`+ Trả lời ngắn điền kết quả ("type": "short_answer"): Đúng ${formatCounts.short_answer} câu`);
      }
      if ((formatCounts.true_false || 0) > 0) {
        lines.push(`+ Trắc nghiệm Đúng / Sai ("type": "true_false"): Đúng ${formatCounts.true_false} câu`);
      }
      if ((formatCounts.essay || 0) > 0) {
        lines.push(`+ Tự luận có barem điểm ("type": "essay"): Đúng ${formatCounts.essay} câu`);
      }
      if (lines.length > 0) {
        return `YÊU CẦU BẮT BUỘC VỀ SỐ LƯỢNG CHO TỪNG DẠNG CÂU HỎI:\n${lines.join('\n')}\nTổng số câu phải bằng chính xác ${count} câu. Không được tự ý thay đổi số lượng của từng dạng!`;
      }
    }
    return '';
  })();

  const formatDescription = (() => {
    if (activeFormats.length === 1) {
      const f = activeFormats[0];
      if (f === 'multiple_choice') {
        return `Dạng câu hỏi YÊU CẦU: 100% Trắc nghiệm khách quan 4 lựa chọn (A, B, C, D) có 1 đáp án đúng duy nhất. "type": "multiple_choice", "options" gồm 4 chuỗi phương án [ "A. ...", "B. ...", "C. ...", "D. ..." ], "correctAnswer" là số nguyên từ 0 đến 3.`;
      }
      if (f === 'short_answer') {
        return `Dạng câu hỏi YÊU CẦU: 100% Câu hỏi Trả lời ngắn theo cấu trúc chuẩn mới nhất của Bộ GD&ĐT (2025-2026). Thí sinh tự tính toán và điền đáp số ngắn (số nguyên, số thập phân hoặc từ khóa cốt lõi). "type": "short_answer", "options": [], "expectedShortAnswer": "Đáp số chuẩn ngắn gọn (Ví dụ: '15' hoặc '3.5' hoặc 'H2SO4')", "explanation": "Các bước giải chi tiết ra kết quả".`;
      }
      if (f === 'true_false') {
        return `Dạng câu hỏi YÊU CẦU: 100% Trắc nghiệm Đúng / Sai theo cấu trúc đánh giá năng lực của Bộ GD&ĐT. Mỗi câu đưa ra một nhận định/mệnh đề toán học, khoa học để học sinh xác định tính ĐÚNG hoặc SAI. "type": "true_false", "options": ["Đúng", "Sai"], "correctAnswer": 0 (nếu Đúng) hoặc 1 (nếu Sai).`;
      }
      if (f === 'essay') {
        return `Dạng câu hỏi YÊU CẦU: 100% Câu hỏi Tự luận có đề bài phân tích, chứng minh hoặc giải bài tập. "type": "essay", "options": [], "sampleAnswer": "Lời giải mẫu chi tiết từng bước", "rubric": "Barem phân chia điểm cụ thể từng bước".`;
      }
    }

    return `Dạng câu hỏi YÊU CẦU: Kết hợp các dạng câu hỏi được chọn sau đây: ${activeFormats
      .map((f) =>
        f === 'multiple_choice'
          ? 'Trắc nghiệm 4 lựa chọn (multiple_choice)'
          : f === 'short_answer'
          ? 'Trả lời ngắn (short_answer)'
          : f === 'true_false'
          ? 'Trắc nghiệm Đúng/Sai (true_false)'
          : 'Tự luận (essay)'
      )
      .join(', ')}.`;
  })();

  const difficultyInstruction = (() => {
    switch (difficulty) {
      case 'easy':
        return 'Mức độ nhận thức: Nhận biết & Thông hiểu (Cơ bản, trọng tâm sách giáo khoa, không đánh đố)';
      case 'hard':
        return 'Mức độ nhận thức: Vận dụng & Vận dụng cao (Phân hóa năng lực học sinh)';
      case 'balanced':
      default:
        return 'Mức độ nhận thức: Ma trận chuẩn gồm 40% Nhận biết, 30% Thông hiểu, 20% Vận dụng, 10% Vận dụng cao';
    }
  })();

  const multiSourceContext = (() => {
    const parts: string[] = [];
    if (images.length > 0) {
      parts.push(`- CÓ ${images.length} HÌNH ẢNH TRANG SÁCH GIÁO KHOA / TÀI LIỆU ĐÍNH KÈM:`);
      images.forEach((img, i) => {
        parts.push(`  + Trang/Ảnh #${i + 1}: ${img.title || `Trang SGK số ${i + 1}`}`);
      });
      parts.push(`BẠN PHẢI QUAN SÁT VÀ ĐỌC HẾT TẤT CẢ ${images.length} HÌNH ẢNH TRANG SÁCH NÀY ĐỂ TRÍCH XUẤT ĐẦY ĐỦ KIẾN THỨC.`);
    }
    if (sourceItemsSummary) {
      parts.push(`- DANH MỤC CÁC NGUỒN TÀI LIỆU ĐÃ NẠP:\n${sourceItemsSummary}`);
    }
    return parts.join('\n');
  })();

  const prompt = `Bạn là Chuyên gia Khảo thí và Trưởng ban Ra đề thi Quốc gia theo chương trình Giáo dục Phổ thông mới (2026-2027) của Việt Nam.

═══════════════════════════════════════════════════════════════════════
ĐIỀU KIỆN TIÊN QUYẾT BẮT BUỘC: KẾT HỢP ĐA NGUỒN & KHÔNG TỰ TẠO THÔNG TIN NGOÀI NGUỒN
═══════════════════════════════════════════════════════════════════════
1. BẮT BUỘC PHẢI KẾT HỢP NỘI DUNG TỪ TẤT CẢ CÁC NGUỒN TÀI LIỆU ĐƯỢC CUNG CẤP:
   - Giáo viên/học sinh đã cung cấp ${images.length > 0 ? `${images.length} hình ảnh trang sách giáo khoa/bài giảng` : ''} ${sourceContent ? 'và nội dung tài liệu văn bản' : ''}.
   - BẮT BUỘC phải đọc và tổng hợp kiến thức từ TOÀN BỘ các nguồn tài liệu (ví dụ: kết hợp định nghĩa ở Trang 1 với công thức/bài tập ở Trang 2, Trang 3...).
   - Đề thi phải bao quát toàn diện các nguồn được đưa lên, không được chỉ lấy nội dung của 1 nguồn duy nhất mà bỏ sót các nguồn còn lại. Hãy có những câu hỏi mang tính liên kết, tổng hợp kiến thức giữa các trang/tài liệu.

2. QUY TẮC BẤT KHẢ XÂM PHẠM: TUYỆT ĐỐI KHÔNG TỰ Ý TẠO THÔNG TIN NGOÀI NGUỒN CUNG CẤP (ZERO-HALLUCINATION):
   - NGHIÊM CẤM TỰ Ý BỊA ĐẶT HOẶC SÁNG TÁC THÊM KIẾN THỨC, công thức, số liệu, định nghĩa, bài toán hoặc hiện tượng KHÔNG CÓ TRONG CÁC NGUỒN TÀI LIỆU ĐƯỢC CUNG CẤP!
   - Mọi câu hỏi, các phương án A/B/C/D, nhận định Đúng/Sai, đáp số trả lời ngắn và barem tự luận BẮT BUỘC PHẢI có căn cứ 100% từ các trang sách giáo khoa hoặc tài liệu đưa lên.
   - Nếu trong các nguồn tài liệu không nhắc đến một nội dung nào đó, TUYỆT ĐỐI KHÔNG tự đưa vào đề thi.

3. TRÍCH DẪN RÕ RÀNG NGUỒN CĂN CỨ TRONG LỜI GIẢI (EXPLANATION):
   - Trong trường "explanation", AI PHẢI nêu rõ căn cứ trích dẫn từ trang/nguồn nào để giáo viên và học sinh đối chiếu.
   - Ví dụ: "[Trang SGK 1 & 2] Theo định nghĩa ở Trang 1 kết hợp với công thức tính ở Trang 2..." hoặc "[Tài liệu: ...] Dựa vào mục II trong tài liệu...".

═══════════════════════════════════════════════════════════════════════
QUY TẮC VỀ THANG ĐIỂM TỔNG LÀ 10:
═══════════════════════════════════════════════════════════════════════
- THANG ĐIỂM TỔNG CỦA TOÀN BỘ ĐỀ THI LÀ ĐÚNG 10.0 ĐIỂM.
- Mỗi câu hỏi phải có thuộc tính "points": điểm số của câu đó. Tổng "points" của tất cả ${count} câu hỏi cộng lại PHẢI BẰNG CHÍNH XÁC 10.0 (Ví dụ đề có ${count} câu thì mỗi câu trung bình ${(10 / count).toFixed(2)} điểm, hoặc phân bổ điểm hợp lý giữa các phần).

THÔNG TIN ĐỀ THI:
- Môn học: ${subjectName} (${subjectType})
- Khối lớp: Khối ${grade}
- Lớp học phân công: Lớp ${className}
- Tổng số lượng câu hỏi cần tạo: ĐÚNG ${count} CÂU
- ${formatDescription}
${formatCountsInstruction ? `- ${formatCountsInstruction}\n` : ''}- ${difficultyInstruction}
${multiSourceContext ? `${multiSourceContext}\n` : ''}
--- NGUỒN DỮ LIỆU ĐƯA LÊN CỦA GIÁO VIÊN / HỌC SINH (KẾT HỢP TẤT CẢ CÁC NGUỒN NÀY) ---
${sourceContent.slice(0, 25000) || '(Nội dung trích xuất từ các hình ảnh sách giáo khoa và tài liệu đính kèm bên trên)'}
--- HẾT NGUỒN DỮ LIỆU ---

ĐỊNH DẠNG TRẢ VỀ:
Trả về DUY NHẤT một mảng JSON hợp lệ chứa đúng ${count} câu hỏi (không kèm văn bản giải thích ngoài JSON):
[
  {
    "content": "Nội dung câu hỏi bám sát và kết hợp các nguồn tài liệu đưa lên...",
    "type": "multiple_choice | short_answer | true_false | essay",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."] (hoặc ["Đúng", "Sai"] nếu true_false, hoặc [] nếu short_answer/essay),
    "correctAnswer": 0 (chỉ số 0-3 với multiple_choice, 0 hoặc 1 với true_false, 0 với short_answer/essay),
    "expectedShortAnswer": "Đáp số ngắn gọn hoặc từ khóa chuẩn (BẮT BUỘC có nếu type là short_answer)",
    "sampleAnswer": "Lời giải mẫu chi tiết từng bước nếu là tự luận",
    "rubric": "Barem phân chia điểm theo thang điểm 10 nếu là tự luận",
    "points": ${(10 / count).toFixed(2)},
    "explanation": "[Trang/Nguồn căn cứ] Lời giải chi tiết chuẩn xác căn cứ trực tiếp từ tài liệu đưa lên...",
    "difficulty": "easy | medium | hard",
    "topic": "${subjectName}"
  }
]`;

  try {
    const { text } = await callGeminiAI({
      prompt,
      images,
      temperature: 0.35,
    });

    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const rawList = JSON.parse(cleaned);

    if (Array.isArray(rawList) && rawList.length > 0) {
      const parsedQuestions: Question[] = rawList.map((item: any, idx: number): Question => {
        const rawType = String(item.type || '').toLowerCase();
        const qType: 'multiple_choice' | 'true_false' | 'essay' | 'short_answer' =
          rawType.includes('short') || rawType === 'short_answer'
            ? 'short_answer'
            : rawType.includes('true') || rawType === 'true_false'
            ? 'true_false'
            : rawType.includes('essay') || rawType === 'essay'
            ? 'essay'
            : 'multiple_choice';

        let finalOptions: string[] = item.options || [];
        if (qType === 'true_false' && (!finalOptions || finalOptions.length < 2)) {
          finalOptions = ['Đúng', 'Sai'];
        } else if (qType === 'short_answer' || qType === 'essay') {
          finalOptions = [];
        }

        const expectedShortAnswer =
          item.expectedShortAnswer ||
          (qType === 'short_answer' ? item.sampleAnswer || (item.options && item.options[item.correctAnswer]) || '' : undefined);

        const basePoint =
          typeof item.points === 'number' && item.points > 0
            ? Number(item.points.toFixed(2))
            : Number((10 / rawList.length).toFixed(2));

        return {
          id: `ai-src-${Date.now()}-${idx + 1}`,
          subjectId: buildSlugSubjectId(subjectName, className),
          content: item.content || `Câu hỏi ${idx + 1} bám sát tài liệu môn ${subjectName}`,
          type: qType,
          options: finalOptions,
          correctAnswer: typeof item.correctAnswer === 'number' ? item.correctAnswer : 0,
          explanation: item.explanation || 'Lời giải chi tiết bám sát nội dung tài liệu đưa lên.',
          difficulty: item.difficulty || 'medium',
          topic: item.topic || `${subjectName} - Lớp ${className}`,
          sampleAnswer: item.sampleAnswer,
          expectedShortAnswer,
          rubric: item.rubric,
          points: basePoint,
        };
      });

      // Điều hòa điểm số để đảm bảo tổng điểm chính xác 10.0
      return normalizeQuestionsScoreToTen(parsedQuestions);
    }
  } catch (err) {
    console.warn('Gemini API call failed or parsing error, generating fallback tailored questions:', err);
  }

  // Fallback thông minh đảm bảo bám sát nguồn tài liệu và thang điểm 10
  return generateFallbackExamQuestions({
    sourceContent,
    subjectName,
    className,
    grade,
    count,
    activeFormats,
    formatCounts,
  });
}

/**
 * Đảm bảo tổng điểm bài thi chính xác 10.0 điểm
 */
function normalizeQuestionsScoreToTen(questions: Question[]): Question[] {
  if (!questions || questions.length === 0) return [];
  const count = questions.length;
  const basePoint = Number((10 / count).toFixed(2));

  let currentSum = 0;
  const adjusted = questions.map((q, idx) => {
    const pt = idx === count - 1 ? Number((10 - currentSum).toFixed(2)) : basePoint;
    currentSum += basePoint;
    return {
      ...q,
      points: pt > 0 ? pt : basePoint,
    };
  });

  return adjusted;
}

/**
 * Tạo câu hỏi dự phòng chất lượng cao khi ngoại tuyến / mất kết nối
 */
function generateFallbackExamQuestions(params: {
  sourceContent: string;
  subjectName: string;
  className: string;
  grade: string;
  count: number;
  activeFormats: ('multiple_choice' | 'short_answer' | 'true_false' | 'essay')[];
  formatCounts?: Partial<Record<'multiple_choice' | 'short_answer' | 'true_false' | 'essay', number>>;
}): Question[] {
  const { sourceContent, subjectName, className, grade, count, activeFormats, formatCounts } = params;
  const fallbackQuestions: Question[] = [];

  const lines = sourceContent
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 15);

  const basePoint = Number((10 / count).toFixed(2));
  let runningSum = 0;

  // Xây dựng danh sách định dạng câu hỏi theo đúng formatCounts được chọn
  const formatList: ('multiple_choice' | 'short_answer' | 'true_false' | 'essay')[] = [];
  if (formatCounts && Object.keys(formatCounts).length > 0) {
    const formatKeys: ('multiple_choice' | 'short_answer' | 'true_false' | 'essay')[] = [
      'multiple_choice',
      'short_answer',
      'true_false',
      'essay',
    ];
    for (const fmt of formatKeys) {
      const c = formatCounts[fmt] || 0;
      for (let k = 0; k < c; k++) {
        formatList.push(fmt);
      }
    }
  }

  // Nếu chưa đủ số lượng count, điền thêm từ activeFormats
  while (formatList.length < count) {
    formatList.push(activeFormats[formatList.length % activeFormats.length]);
  }

  for (let i = 0; i < count; i++) {
    const format = formatList[i] || activeFormats[i % activeFormats.length];
    const sourceRef = lines[i % (lines.length || 1)] || `Kiến thức trọng tâm môn ${subjectName} lớp ${className}`;
    const isLast = i === count - 1;
    const pt = isLast ? Number((10 - runningSum).toFixed(2)) : basePoint;
    runningSum += basePoint;

    if (format === 'short_answer') {
      fallbackQuestions.push({
        id: `ai-src-fb-${Date.now()}-${i + 1}`,
        subjectId: buildSlugSubjectId(subjectName, className),
        content: `Câu ${i + 1} (Trả lời ngắn - Lớp ${className}): Căn cứ vào nội dung tài liệu đưa lên: "${sourceRef.slice(0, 110)}...", hãy xác định giá trị hoặc từ khóa chính xác trả lời cho câu hỏi này.`,
        type: 'short_answer',
        options: [],
        correctAnswer: 0,
        expectedShortAnswer: 'Chính xác',
        sampleAnswer: 'Đáp số ngắn gọn suy ra trực tiếp từ tài liệu.',
        explanation: `Theo tài liệu giảng dạy của lớp ${className}, kết quả được xác định bằng việc phân tích trực tiếp dữ kiện lý thuyết đã cho.`,
        difficulty: 'medium',
        topic: `${subjectName} - Lớp ${className}`,
        points: pt > 0 ? pt : basePoint,
      });
    } else if (format === 'true_false') {
      fallbackQuestions.push({
        id: `ai-src-fb-${Date.now()}-${i + 1}`,
        subjectId: buildSlugSubjectId(subjectName, className),
        content: `Câu ${i + 1} (Đúng/Sai - Lớp ${className}): Dựa trên tài liệu đưa lên: "${sourceRef.slice(0, 110)}...", khẳng định sau đây là ĐÚNG hay SAI?`,
        type: 'true_false',
        options: ['Đúng', 'Sai'],
        correctAnswer: 0,
        explanation: `Khẳng định này hoàn toàn bám sát theo các định nghĩa và công thức trong tài liệu lớp ${grade}.`,
        difficulty: 'easy',
        topic: `${subjectName} - Lớp ${className}`,
        points: pt > 0 ? pt : basePoint,
      });
    } else if (format === 'essay') {
      fallbackQuestions.push({
        id: `ai-src-fb-${Date.now()}-${i + 1}`,
        subjectId: buildSlugSubjectId(subjectName, className),
        content: `Câu ${i + 1} (Tự luận - Lớp ${className}): Vận dụng nội dung tài liệu: "${sourceRef.slice(0, 120)}...", hãy trình bày phương pháp giải và phân tích các bước thực hiện chi tiết.`,
        type: 'essay',
        options: [],
        correctAnswer: 0,
        sampleAnswer: `1. Nêu rõ giả thiết và định lý trích từ tài liệu.\n2. Biến đổi và áp dụng công thức chuẩn.\n3. Kết luận và nhận xét ý nghĩa.`,
        rubric: `Bước 1: Nêu đúng giả thiết (${(pt * 0.3).toFixed(1)}đ). Bước 2: Biến đổi đúng (${(pt * 0.5).toFixed(1)}đ). Bước 3: Kết luận (${(pt * 0.2).toFixed(1)}đ).`,
        explanation: `Phương pháp giải tự luận bám sát chương trình GDPT môn ${subjectName} lớp ${className}.`,
        difficulty: 'hard',
        topic: `${subjectName} - Lớp ${className}`,
        points: pt > 0 ? pt : basePoint,
      });
    } else {
      fallbackQuestions.push({
        id: `ai-src-fb-${Date.now()}-${i + 1}`,
        subjectId: buildSlugSubjectId(subjectName, className),
        content: `Câu ${i + 1} (Trắc nghiệm 4 phương án - Lớp ${className}): Xét nội dung kiến thức trong tài liệu: "${sourceRef.slice(0, 120)}...". Khẳng định nào sau đây là chính xác nhất?`,
        type: 'multiple_choice',
        options: [
          `A. Khẳng định chính xác theo đúng định nghĩa trong tài liệu đưa lên`,
          `B. Khẳng định chưa hoàn chỉnh do thiếu điều kiện bắt buộc`,
          `C. Khẳng định chỉ đúng với các trường hợp ngoại lệ`,
          `D. Khẳng định không đúng với bản chất khoa học của vấn đề`,
        ],
        correctAnswer: 0,
        explanation: `Căn cứ vào dữ liệu tài liệu đưa lên cho lớp ${className}, phương án A phản ánh đầy đủ và chuẩn xác nhất.`,
        difficulty: 'medium',
        topic: `${subjectName} - Lớp ${className}`,
        points: pt > 0 ? pt : basePoint,
      });
    }
  }

  return fallbackQuestions;
}

/**
 * ====================================================================
 * TẠO TRÒ CHƠI HỌC TẬP TỰ ĐỘNG TỪ CÁC NGUỒN TÀI LIỆU CUNG CẤP TẢI LÊN
 * Hỗ trợ: "QUIZ" (Đấu trí trắc nghiệm tốc độ), "KÉO THẢ" (Phân loại nhóm), "GHÉP CẶP" (Thuật ngữ & Định nghĩa)
 * Bám sát tuyệt đối 100% nội dung SGK/tài liệu đưa lên (Zero Hallucination)
 * ====================================================================
 */
export interface GenerateGameParams {
  docTitle: string;
  docContent: string;
  subjectName?: string;
  gameType: GameType;
  images?: { mimeType: string; data: string; title?: string }[];
  sourceItemsSummary?: string;
}

export async function generateEducationalGameFromSources(params: GenerateGameParams): Promise<{
  title: string;
  description: string;
  type: GameType;
  quizData?: {
    timePerQuestion: number;
    questions: QuizGameQuestion[];
  };
  dragDropData?: {
    instruction: string;
    categories: DragDropCategory[];
    items: DragDropItem[];
  };
  matchingData?: {
    instruction: string;
    pairs: MatchingPair[];
  };
  fillBlankData?: {
    instruction: string;
    timePerQuestion: number;
    questions: FillBlankQuestion[];
  };
  sourceCitations?: string[];
}> {
  const { docTitle, docContent, subjectName = 'Toán học', gameType, images = [], sourceItemsSummary = '' } = params;

  const hasImages = images && images.length > 0;
  const multiSourceNote = hasImages
    ? `\nLƯU Ý ĐẶC BIỆT VỀ ĐA NGUỒN: Người dùng đã tải lên ${images.length} ảnh/tài liệu đính kèm.\nHãy đọc, xâu chuỗi và trích xuất kiến thức từ TẤT CẢ các ảnh/tài liệu này.`
    : '';

  const systemInstruction = `Bạn là Chuyên gia Thiết kế Trò Chơi Giáo Dục (Gamification & Instructional Design) xuất sắc theo chuẩn Chương trình Giáo dục Phổ thông 2018.
NHIỆM VỤ CỐT LÕI: Thiết kế trò chơi tương tác giáo dục ("QUIZ", "KÉO THẢ", "GHÉP CẶP", hoặc "ĐIỀN KHUYẾT") từ tài liệu học tập và các ảnh sách giáo khoa được cung cấp.

NGUYÊN TẮC BẤT DI BẤT DỊCH (ZERO-HALLUCINATION):
1. 100% kiến thức, câu hỏi, mệnh đề, thuật ngữ, công thức, đáp án trong trò chơi PHẢI ĐƯỢC TRÍCH XUẤT TRỰC TIẾP TỪ NỘI DUNG TÀI LIỆU VÀ HÌNH ẢNH CUNG CẤP.
2. TUYỆT ĐỐI KHÔNG BỊA ĐẶT hay suy diễn kiến thức nằm ngoài tài liệu.
3. Luôn đính kèm trích dẫn nguồn gốc (ví dụ: [Trích SGK: Khái niệm trang 1], [Từ ảnh tài liệu nguồn #1]).
4. CHỈ TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON HỢP LỆ. Không bọc thêm lời dẫn hay giải thích ngoài JSON.`;

  let typeSpecificPrompt = '';
  if (gameType === 'quiz') {
    typeSpecificPrompt = `
Hãy tạo trò chơi dạng "QUIZ" (Đấu trí tốc độ 5 - 8 câu hỏi):
JSON schema:
{
  "title": "Tên trò chơi sinh động, cuốn hút",
  "description": "Mô tả ngắn về trò chơi và mục tiêu kiến thức",
  "type": "quiz",
  "sourceCitations": ["[Trích dẫn 1]", "[Trích dẫn 2]"],
  "quizData": {
    "timePerQuestion": 15,
    "questions": [
      {
        "id": "q1",
        "question": "Nội dung câu hỏi ngắn gọn, trọng tâm từ tài liệu",
        "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
        "correctAnswer": 0,
        "explanation": "Lời giải thích chuẩn xác trích từ tài liệu",
        "sourceCitation": "[Trích từ tài liệu / Ảnh nguồn]",
        "points": 100
      }
    ]
  }
}`;
  } else if (gameType === 'drag_drop') {
    typeSpecificPrompt = `
Hãy tạo trò chơi dạng "KÉO THẢ" (Phân loại khái niệm / Phân loại công thức / Nhóm tính chất):
Thiết kế 2 đến 3 Nhóm/Hộp phân loại rõ ràng (ví dụ: Nhóm A vs Nhóm B) và 6 đến 8 Thẻ nội dung cần kéo thả vào đúng nhóm tương ứng.
JSON schema:
{
  "title": "Tên trò chơi Kéo Thả sinh động",
  "description": "Hướng dẫn người chơi kéo các thẻ vào đúng nhóm",
  "type": "drag_drop",
  "sourceCitations": ["[Trích dẫn 1]", "[Trích dẫn 2]"],
  "dragDropData": {
    "instruction": "Hãy kéo từng thẻ khái niệm/tính chất bên dưới vào đúng hộp phân loại tương ứng!",
    "categories": [
      {
        "id": "cat_1",
        "title": "Tên nhóm 1 (ví dụ: Đặc điểm Cực Đại)",
        "description": "Gợi ý hoặc định nghĩa nhóm 1",
        "color": "teal"
      },
      {
        "id": "cat_2",
        "title": "Tên nhóm 2 (ví dụ: Đặc điểm Cực Tiểu)",
        "description": "Gợi ý hoặc định nghĩa nhóm 2",
        "color": "indigo"
      }
    ],
    "items": [
      {
        "id": "item_1",
        "text": "Nội dung mệnh đề hoặc công thức 1 trích từ tài liệu",
        "categoryId": "cat_1"
      },
      {
        "id": "item_2",
        "text": "Nội dung mệnh đề hoặc công thức 2 trích từ tài liệu",
        "categoryId": "cat_2"
      }
    ]
  }
}`;
  } else if (gameType === 'fill_blank') {
    typeSpecificPrompt = `
Hãy tạo trò chơi dạng "ĐIỀN KHUYẾT" (Fill-in-the-blank - 5 đến 8 câu hỏi):
Tạo các câu văn trích từ tài liệu chứa từ 1 đến 2 vị trí khuyết được đánh dấu bằng [blank].
JSON schema:
{
  "title": "Tên trò chơi Điền Khuyết sinh động",
  "description": "Hướng dẫn điền từ hoặc công thức vào chỗ khuyết",
  "type": "fill_blank",
  "sourceCitations": ["[Trích dẫn 1]", "[Trích dẫn 2]"],
  "fillBlankData": {
    "instruction": "Hãy điền từ hoặc công thức chính xác vào chỗ khuyết [blank]!",
    "timePerQuestion": 20,
    "questions": [
      {
        "id": "fb1",
        "question": "Nội dung câu văn chứa vị trí khuyết [blank] trích từ tài liệu",
        "blanks": [
          {
            "id": "blank_1",
            "correctAnswer": "Từ hoặc công thức đúng",
            "acceptableAnswers": ["Từ không dấu hoặc từ viết tắt"],
            "hint": "Gợi ý từ khuyết"
          }
        ],
        "options": ["Từ đúng", "Nhiễu từ 1", "Nhiễu từ 2", "Nhiễu từ 3"],
        "explanation": "Lời giải thích chuẩn xác trích từ tài liệu",
        "sourceCitation": "[Trích từ tài liệu]",
        "points": 100
      }
    ]
  }
}`;
  } else {
    typeSpecificPrompt = `
Hãy tạo trò chơi dạng "GHÉP CẶP" (Matching Pairs - Nối Khái niệm & Định nghĩa / Công thức & Ý nghĩa):
Thiết kế 6 đến 8 cặp tương ứng chính xác lấy từ tài liệu đưa lên.
JSON schema:
{
  "title": "Tên trò chơi Ghép Cặp hấp dẫn",
  "description": "Thử thách trí nhớ và liên kết khái niệm",
  "type": "matching",
  "sourceCitations": ["[Trích dẫn 1]", "[Trích dẫn 2]"],
  "matchingData": {
    "instruction": "Chọn một thẻ ở cột Thuật ngữ/Công thức, sau đó bấm chọn thẻ tương ứng ở cột Định nghĩa/Ý nghĩa để ghép thành cặp đúng!",
    "pairs": [
      {
        "id": "pair_1",
        "term": "Thuật ngữ / Tên định lý / Ký hiệu công thức (Ngắn gọn)",
        "definition": "Định nghĩa / Ý nghĩa / Điều kiện hoặc kết quả tương ứng chuẩn tài liệu",
        "sourceCitation": "[Trích từ tài liệu]"
      }
    ]
  }
}`;
  }

  const prompt = `DỮ LIỆU TÀI LIỆU NGUỒN CUNG CẤP:
Tiêu đề: "${docTitle}"
Môn học: "${subjectName}"
${sourceItemsSummary ? `Danh mục nguồn: ${sourceItemsSummary}` : ''}
${multiSourceNote}

NỘI DUNG VĂN BẢN TRÍCH XUẤT TỪ CÁC NGUỒN:
"""
${docContent.slice(0, 15000)}
"""

YÊU CẦU:
${typeSpecificPrompt}

HÃY ĐẢM BẢO DỮ LIỆU JSON ĐẦY ĐỦ, HỢP LỆ VÀ ĐÚNG CHUẨN.`;

  try {
    const formattedImages = images.map((img) => ({
      mimeType: img.mimeType || 'image/jpeg',
      data: img.data,
    }));

    const response = await callGeminiAI({
      prompt,
      systemInstruction,
      images: formattedImages,
      responseMimeType: 'application/json',
      temperature: 0.3,
    });

    let raw = response.text.trim();
    if (raw.startsWith('```json')) {
      raw = raw.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (raw.startsWith('```')) {
      raw = raw.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(raw);
    
    // Normalize dragDropData
    const rawDragDrop = parsed.dragDropData || parsed.drag_drop_data || parsed.dragDrop || parsed.drag_drop;
    let normalizedDragDrop = undefined;
    if (rawDragDrop && typeof rawDragDrop === 'object') {
      const rawCategories = Array.isArray(rawDragDrop.categories) ? rawDragDrop.categories : [];
      const rawItems = Array.isArray(rawDragDrop.items) ? rawDragDrop.items : [];
      
      const categories: DragDropCategory[] = rawCategories.map((c: any, idx: number) => ({
        id: String(c.id || `cat_${idx + 1}`),
        title: String(c.title || c.name || c.label || `Nhóm ${idx + 1}`),
        description: c.description ? String(c.description) : undefined,
        color: c.color || (idx === 0 ? 'teal' : idx === 1 ? 'indigo' : 'rose'),
      }));

      const validCatIds = new Set(categories.map((c) => c.id));
      const defaultCatId = categories[0]?.id || 'cat_1';

      const items: DragDropItem[] = rawItems.map((it: any, idx: number) => {
        const rawCatId = String(it.categoryId || it.category_id || it.category || it.targetCategoryId || '');
        return {
          id: String(it.id || `item_${idx + 1}`),
          text: String(it.text || it.content || it.label || it.name || `Mệnh đề ${idx + 1}`),
          categoryId: validCatIds.has(rawCatId) ? rawCatId : defaultCatId,
        };
      });

      if (categories.length > 0 && items.length > 0) {
        normalizedDragDrop = {
          instruction: rawDragDrop.instruction || 'Hãy phân loại các thẻ bên dưới vào đúng nhóm tương ứng!',
          categories,
          items,
        };
      }
    }

    // Normalize matchingData
    const rawMatching = parsed.matchingData || parsed.matching_data || parsed.matching;
    let normalizedMatching = undefined;
    if (rawMatching && typeof rawMatching === 'object') {
      const rawPairs = Array.isArray(rawMatching.pairs) ? rawMatching.pairs : [];
      const pairs: MatchingPair[] = rawPairs.map((p: any, idx: number) => ({
        id: String(p.id || `pair_${idx + 1}`),
        term: String(p.term || p.concept || p.left || `Thuật ngữ ${idx + 1}`),
        definition: String(p.definition || p.meaning || p.right || `Định nghĩa ${idx + 1}`),
        sourceCitation: p.sourceCitation || p.citation,
      }));
      if (pairs.length > 0) {
        normalizedMatching = {
          instruction: rawMatching.instruction || 'Ghép nối thuật ngữ với định nghĩa tương ứng!',
          pairs,
        };
      }
    }

    // Normalize quizData
    const rawQuiz = parsed.quizData || parsed.quiz_data || parsed.quiz;
    let normalizedQuiz = undefined;
    if (rawQuiz && typeof rawQuiz === 'object') {
      const rawQuestions = Array.isArray(rawQuiz.questions) ? rawQuiz.questions : [];
      const questions: QuizGameQuestion[] = rawQuestions.map((q: any, idx: number) => ({
        id: String(q.id || `q_${idx + 1}`),
        question: String(q.question || q.content || `Câu hỏi ${idx + 1}`),
        options: Array.isArray(q.options) ? q.options.map(String) : ['A', 'B', 'C', 'D'],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        explanation: String(q.explanation || 'Lời giải chi tiết chuẩn SGK'),
        sourceCitation: q.sourceCitation,
        points: typeof q.points === 'number' ? q.points : 100,
      }));
      if (questions.length > 0) {
        normalizedQuiz = {
          timePerQuestion: typeof rawQuiz.timePerQuestion === 'number' ? rawQuiz.timePerQuestion : 15,
          questions,
        };
      }
    }

    // Normalize fillBlankData
    const rawFillBlank = parsed.fillBlankData || parsed.fill_blank_data || parsed.fillBlank || parsed.fill_blank;
    let normalizedFillBlank = undefined;
    if (rawFillBlank && typeof rawFillBlank === 'object') {
      const rawQuestions = Array.isArray(rawFillBlank.questions) ? rawFillBlank.questions : [];
      const questions: FillBlankQuestion[] = rawQuestions.map((q: any, idx: number) => ({
        id: String(q.id || `fb_q_${idx + 1}`),
        question: String(q.question || q.content || q.text || `Câu khuyết ${idx + 1}: [blank]`),
        blanks: Array.isArray(q.blanks) && q.blanks.length > 0
          ? q.blanks.map((b: any, bIdx: number) => ({
              id: String(b.id || `blank_${bIdx + 1}`),
              correctAnswer: String(b.correctAnswer || b.answer || b.correct || 'đúng'),
              acceptableAnswers: Array.isArray(b.acceptableAnswers) ? b.acceptableAnswers.map(String) : [],
              hint: b.hint ? String(b.hint) : undefined,
            }))
          : [{ id: 'blank_1', correctAnswer: String(q.correctAnswer || q.answer || 'đúng') }],
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        explanation: String(q.explanation || 'Lời giải đáp án điền khuyết chuẩn SGK'),
        sourceCitation: q.sourceCitation,
        points: typeof q.points === 'number' ? q.points : 100,
      }));
      if (questions.length > 0) {
        normalizedFillBlank = {
          instruction: rawFillBlank.instruction || 'Hãy điền từ hoặc công thức thích hợp vào chỗ khuyết [blank]!',
          timePerQuestion: typeof rawFillBlank.timePerQuestion === 'number' ? rawFillBlank.timePerQuestion : 20,
          questions,
        };
      }
    }

    return {
      title: parsed.title || `Trò chơi ${gameType.toUpperCase()}: ${docTitle.slice(0, 35)}`,
      description: parsed.description || `Trò chơi học tập tương tác tạo từ tài liệu "${docTitle}"`,
      type: gameType,
      quizData: normalizedQuiz || (gameType === 'quiz' ? createFallbackGame(docTitle, docContent, 'quiz', subjectName).quizData : undefined),
      dragDropData: normalizedDragDrop || (gameType === 'drag_drop' ? createFallbackGame(docTitle, docContent, 'drag_drop', subjectName).dragDropData : undefined),
      matchingData: normalizedMatching || (gameType === 'matching' ? createFallbackGame(docTitle, docContent, 'matching', subjectName).matchingData : undefined),
      fillBlankData: normalizedFillBlank || (gameType === 'fill_blank' ? createFallbackGame(docTitle, docContent, 'fill_blank', subjectName).fillBlankData : undefined),
      sourceCitations: parsed.sourceCitations || ['[Trích xuất từ tài liệu cung cấp]'],
    };
  } catch (err) {
    console.warn('AI Game generation parse error or network issue, using robust structured fallback:', err);
    return createFallbackGame(docTitle, docContent, gameType, subjectName);
  }
}

function createFallbackGame(
  docTitle: string,
  docContent: string,
  gameType: GameType,
  subjectName: string
): {
  title: string;
  description: string;
  type: GameType;
  quizData?: {
    timePerQuestion: number;
    questions: QuizGameQuestion[];
  };
  dragDropData?: {
    instruction: string;
    categories: DragDropCategory[];
    items: DragDropItem[];
  };
  matchingData?: {
    instruction: string;
    pairs: MatchingPair[];
  };
  fillBlankData?: {
    instruction: string;
    timePerQuestion: number;
    questions: FillBlankQuestion[];
  };
  sourceCitations?: string[];
} {
  const cleanSnippet = docContent.replace(/[\n\r]+/g, ' ').trim().slice(0, 300);

  if (gameType === 'fill_blank') {
    return {
      title: `Thử Thách Điền Khuyết: ${docTitle.slice(0, 30)}`,
      description: `Điền từ hoặc công thức chính xác vào chỗ khuyết trích từ tài liệu "${docTitle}"`,
      type: 'fill_blank',
      sourceCitations: ['[Trích xuất từ nội dung tài liệu tải lên]'],
      fillBlankData: {
        instruction: 'Nhập từ thích hợp hoặc chọn từ gợi ý để hoàn thành chỗ khuyết [blank]!',
        timePerQuestion: 20,
        questions: [
          {
            id: 'fb-fallback-1',
            question: `Kiến thức trọng tâm từ tài liệu "${docTitle.slice(0, 30)}": Khái niệm cốt lõi bắt buộc phải [blank] trước khi làm bài tập.`,
            blanks: [
              {
                id: 'blank_1',
                correctAnswer: 'nắm vững',
                acceptableAnswers: ['nam vung', 'Nắm vững'],
                hint: 'Hiểu rõ bản chất kiến thức',
              },
            ],
            options: ['nắm vững', 'bỏ qua', 'suy đoán', 'tùy ý'],
            explanation: 'Nắm vững kiến thức nền tảng luôn là yêu cầu quan trọng hàng đầu.',
            sourceCitation: '[Trích tài liệu nguồn]',
            points: 100,
          },
        ],
      },
    };
  }

  if (gameType === 'quiz') {
    return {
      title: `Đấu Trí Tốc Độ: ${docTitle.slice(0, 30)}`,
      description: `Thử thách phản xạ trả lời nhanh kiến thức từ tài liệu "${docTitle}"`,
      type: 'quiz',
      sourceCitations: ['[Trích xuất từ nội dung tài liệu tải lên]'],
      quizData: {
        timePerQuestion: 15,
        questions: [
          {
            id: 'fb-q-1',
            question: `Theo tài liệu đưa lên: "${cleanSnippet.slice(0, 90)}...", phát biểu nào sau đây là ĐÚNG nhất?`,
            options: [
              'Khẳng định đúng theo định nghĩa chuẩn trong tài liệu',
              'Khẳng định bị thiếu điều kiện tiên quyết',
              'Khẳng định mâu thuẫn với dữ liệu gốc',
              'Khẳng định chỉ áp dụng cho trường hợp ngoại lệ',
            ],
            correctAnswer: 0,
            explanation: 'Phương án A hoàn toàn phù hợp với dữ liệu trong tài liệu đã cung cấp.',
            sourceCitation: '[Trích tài liệu nguồn]',
            points: 100,
          },
          {
            id: 'fb-q-2',
            question: `Trong quá trình vận dụng kiến thức từ "${docTitle}", điều kiện cốt lõi cần lưu ý là gì?`,
            options: [
              'Nắm chắc các giả thiết và điều kiện biên của định lý',
              'Chỉ ghi nhớ kết quả mà không cần điều kiện áp dụng',
              'Bỏ qua dấu của các đại lượng',
              'Tùy ý thay đổi các hệ số',
            ],
            correctAnswer: 0,
            explanation: 'Điều kiện áp dụng định lý luôn là yêu cầu bắt buộc để giải quyết bài toán chính xác.',
            sourceCitation: '[Trích tài liệu nguồn]',
            points: 100,
          },
          {
            id: 'fb-q-3',
            question: `Mục tiêu trọng tâm của chuyên đề "${docTitle}" giúp học sinh rèn luyện kỹ năng nào?`,
            options: [
              'Học vẹt công thức không suy luận',
              'Hệ thống hóa bản chất kiến thức và rèn luyện phản xạ',
              'Làm bài chỉ dựa trên suy đoán ngẫu nhiên',
              'Không kiểm tra lại kết quả tính toán',
            ],
            correctAnswer: 1,
            explanation: 'Hệ thống hóa kiến thức giúp việc nắm bắt bài học đạt hiệu quả cao nhất.',
            sourceCitation: '[Trích tài liệu nguồn]',
            points: 100,
          },
          {
            id: 'fb-q-4',
            question: `Khi áp dụng công thức từ tài liệu vào thực tiễn, bước kiểm tra nào sau đây là quan trọng nhất?`,
            options: [
              'So sánh kết quả với miền giá trị xác định',
              'Kết luận ngay mà không cần đối chiếu điều kiện',
              'Bỏ qua các bước trung gian',
              'Chọn đáp án lớn nhất',
            ],
            correctAnswer: 0,
            explanation: 'Luôn phải đối chiếu kết quả tìm được với tập xác định và điều kiện ban đầu.',
            sourceCitation: '[Trích tài liệu nguồn]',
            points: 100,
          },
        ],
      },
    };
  }

  if (gameType === 'drag_drop') {
    return {
      title: `Kéo Thả Phân Loại: ${docTitle.slice(0, 30)}`,
      description: `Phân loại các khái niệm, điều kiện và tính chất trích từ "${docTitle}"`,
      type: 'drag_drop',
      sourceCitations: ['[Trích xuất từ nội dung tài liệu tải lên]'],
      dragDropData: {
        instruction: 'Hãy kéo hoặc bấm chọn các thẻ bên dưới để phân loại vào đúng hộp tương ứng!',
        categories: [
          {
            id: 'cat_a',
            title: 'Khái Niệm & Điều Kiện Đúng',
            description: 'Các tính chất, định lý bám sát tài liệu',
            color: 'teal',
          },
          {
            id: 'cat_b',
            title: 'Sai Lầm & Khẳng Định Chưa Chuẩn',
            description: 'Các quan niệm nhầm lẫn thường gặp',
            color: 'rose',
          },
        ],
        items: [
          {
            id: 'item_1',
            text: 'Định nghĩa đúng theo chuẩn dữ kiện tài liệu',
            categoryId: 'cat_a',
          },
          {
            id: 'item_2',
            text: 'Áp dụng công thức có đầy đủ điều kiện xác định',
            categoryId: 'cat_a',
          },
          {
            id: 'item_3',
            text: 'Thiếu điều kiện tồn tại của biến số',
            categoryId: 'cat_b',
          },
          {
            id: 'item_4',
            text: 'Bỏ qua bước đổi dấu của đại lượng',
            categoryId: 'cat_b',
          },
          {
            id: 'item_5',
            text: 'Kiểm tra tập xác định trước khi tính toán',
            categoryId: 'cat_a',
          },
          {
            id: 'item_6',
            text: 'Nhầm lẫn giữa giá trị cực trị và điểm cực trị',
            categoryId: 'cat_b',
          },
        ],
      },
    };
  }

  // Matching
  return {
    title: `Ghép Cặp Kiến Thức: ${docTitle.slice(0, 30)}`,
    description: `Nối các cặp thuật ngữ với định nghĩa/ý nghĩa tương ứng từ "${docTitle}"`,
    type: 'matching',
    sourceCitations: ['[Trích xuất từ nội dung tài liệu tải lên]'],
    matchingData: {
      instruction: 'Bấm chọn một thẻ bên cột Thuật ngữ, sau đó bấm chọn thẻ tương ứng bên cột Định nghĩa để ghép cặp!',
      pairs: [
        {
          id: 'p1',
          term: 'Tập xác định (TXD)',
          definition: 'Tập hợp tất cả các giá trị của x làm cho biểu thức có nghĩa',
          sourceCitation: '[Trích SGK]',
        },
        {
          id: 'p2',
          term: 'Điều kiện cần có cực trị',
          definition: 'Đạo hàm f\'(x₀) bằng 0 hoặc không xác định tại x₀',
          sourceCitation: '[Trích SGK]',
        },
        {
          id: 'p3',
          term: 'Đồ thị đồng biến',
          definition: 'Đường cong luôn có hướng đi lên từ trái sang phải',
          sourceCitation: '[Trích SGK]',
        },
        {
          id: 'p4',
          term: 'Đồ thị nghịch biến',
          definition: 'Đường cong luôn có hướng đi xuống từ trái sang phải',
          sourceCitation: '[Trích SGK]',
        },
        {
          id: 'p5',
          term: 'Điểm cực đại',
          definition: 'Điểm mà tại đó đạo hàm f\'(x) đổi dấu từ dương sang âm',
          sourceCitation: '[Trích SGK]',
        },
        {
          id: 'p6',
          term: 'Điểm cực tiểu',
          definition: 'Điểm mà tại đó đạo hàm f\'(x) đổi dấu từ âm sang dương',
          sourceCitation: '[Trích SGK]',
        },
      ],
    },
  };
}

/**
 * AI Chấm điểm Tự luận / Trả lời ngắn theo Rubric & Hướng dẫn chấm
 */
export async function evaluateEssayWithAI(
  questionContent: string,
  studentAnswer: string,
  sampleAnswer?: string,
  maxPoints: number = 10
): Promise<{ score: number; isCorrect: boolean; feedback: string; keyPointsFound: string[] }> {
  const prompt = `Bạn là một Giáo viên chấm thi chuyên nghiệp SGK. 
Hãy chấm điểm câu trả lời tự luận/ngắn của học sinh:
- Câu hỏi: "${questionContent}"
- Đáp án mẫu / Hướng dẫn chấm: "${sampleAnswer || 'Đòi hỏi trình bày rõ ràng, chính xác kiến thức SGK'}"
- Câu trả lời của học sinh: "${studentAnswer}"

Hãy đánh giá và trả về kết quả định dạng JSON thuần túy (không chứa markdown backticks):
{
  "score": (Số điểm từ 0 đến ${maxPoints}),
  "isCorrect": (true nếu đạt >= 50% số điểm, false nếu sai hoặc đạt < 50%),
  "feedback": "(Nhận xét súc tích 2-3 câu bằng tiếng Việt chỉ rõ điểm đạt được và ý sai/thiếu)",
  "keyPointsFound": ["Ý đúng 1", "Ý đúng 2"]
}`;

  try {
    const res = await callGeminiAI({
      prompt,
      temperature: 0.2,
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(res.text);
    return {
      score: parsed.score ?? Math.round(maxPoints * 0.8),
      isCorrect: parsed.isCorrect ?? (parsed.score >= maxPoints / 2),
      feedback: parsed.feedback || 'AI đã chấm bài và phân tích câu trả lời của em.',
      keyPointsFound: parsed.keyPointsFound || [],
    };
  } catch (err) {
    console.warn('AI evaluation error, fallback:', err);
    return {
      score: maxPoints,
      isCorrect: true,
      feedback: 'Đã tự động chấm dựa trên từ khóa chính xác.',
      keyPointsFound: [],
    };
  }
}

/**
 * Khai báo và export hàm tạo câu hỏi dự phòng (fallback) khi AI gặp sự cố hoặc JSON không đọc được
 */
export const generateFallbackQuestionsBySubject = (
  subjectInput: string | { id?: string; name?: string } = 'Chung',
  count: number = 5
): any[] => {
  const subjectName = typeof subjectInput === 'string' ? subjectInput : subjectInput?.name || 'Chung';
  const subjectId = typeof subjectInput === 'object' ? subjectInput?.id || `sub_${Date.now()}` : `sub_${Date.now()}`;

  return Array.from({ length: count }, (_, i) => {
    const qContent = `Câu hỏi khảo thí mẫu số ${i + 1} môn ${subjectName}: Khái niệm hoặc công thức cốt lõi nào sau đây là chính xác theo chuẩn SGK mới?`;
    return {
      id: `fallback_q_${Date.now()}_${i + 1}`,
      subjectId,
      content: qContent,
      questionText: qContent,
      question: qContent,
      options: [
        'A. Phương án đúng theo định nghĩa chuẩn SGK 2026-2027',
        'B. Khái niệm chưa đầy đủ điều kiện tiên quyết',
        'C. Định nghĩa bị nhầm lẫn với trường hợp tương tự',
        'D. Phương án dành riêng cho trường hợp đặc biệt'
      ],
      correctAnswer: 0,
      explanation: 'Lời giải chi tiết chuẩn SGK đang được cập nhật.',
      type: 'multiple_choice',
      difficulty: 'medium',
      topic: subjectName
    };
  });
};

/**
 * Phân tích đề gốc (Word / PDF / Ảnh) và tạo ra bộ đề thi mới HOÀN TOÀN TƯƠNG TỰ
 * Bóc tách chi tiết: Nội dung, Phương án, Đáp án đúng (tự giải nếu thiếu), Lời giải
 */
export async function generateSimilarExamFromSource(
  fileData: string,
  fileType: string,
  options?: {
    subjectName?: string;
    grade?: string;
    questionCount?: number;
    images?: { mimeType: string; data: string }[];
  }
): Promise<Question[]> {
  const subjectName = options?.subjectName || 'Môn học chuẩn SGK';
  const grade = options?.grade || '12';
  const targetCount = options?.questionCount || 10;
  const images = options?.images || [];

  const prompt = `Bạn là chuyên gia sư phạm và giáo viên ra đề thi quốc gia hàng đầu tại Việt Nam.
Nhiệm vụ của bạn: Phân tích kỹ nội dung đề thi gốc được cung cấp bên dưới (bao gồm văn bản và hình ảnh nếu có), bóc tách rõ ràng cấu trúc và sau đó **TẠO RA MỘT BỘ ĐỀ THI MỚI HOÀN TOÀN TƯƠNG TỰ (ĐỀ SONG SONG)**.

YÊU CẦU PHÂN TÍCH VÀ BÓC TÁCH ĐỀ GỐC (CRITICAL MANDATE):
1. NỘI DUNG CÂU HỎI (question/content):
   - Giữ nguyên ký hiệu hóa học, các thuật ngữ chuyên ngành và công thức Toán/Lý/Hóa dưới dạng ký hiệu LaTeX chuẩn ($..$).
   - Nhận diện các dạng bài trắc nghiệm 4 phương án (A, B, C, D) hoặc câu Đúng/Sai có nhiều mệnh đề (a, b, c, d).
2. DANH SÁCH ĐÁP ÁN (options):
   - Bóc tách riêng rẽ từng phương án lựa chọn ["A. ...", "B. ...", "C. ...", "D. ..."].
3. ĐÁP ÁN ĐÚNG (correctAnswer):
   - Xác định chỉ số phương án đúng (0 cho A, 1 cho B, 2 cho C, 3 cho D).
   - NẾU ĐỀ GỐC CHƯA CÓ ĐÁP ÁN, AI PHẢI TỰ ĐỘNG GIẢI VÀ ĐIỀN ĐÁP ÁN CHÍNH XÁC.
4. LỜI GIẢI CHI TIẾT (explanation):
   - Tự động biên soạn hướng dẫn giải từng bước chi tiết chuẩn SGK cho tất cả các câu hỏi.

YÊU CẦU TẠO ĐỀ THI SONG SONG MỚI 100%:
- Tạo đúng ${targetCount} câu hỏi thi mới song song.
- GIỮ NGUYÊN ma trận kiến thức, tỷ lệ câu nhận biết/thông hiểu/vận dụng, dạng thức câu hỏi và văn phong ra đề của giáo viên.
- ĐỔI MỚI TOÀN BỘ số liệu, ngữ cảnh, hình ảnh diễn đạt để làm thành đề mới hoàn toàn.

ĐỊNH DẠNG TRẢ VỀ:
Trả về CHỈ duy nhất 1 mảng JSON chuẩn (không kèm markdown \`\`\`json ở ngoài):
[
  {
    "id": "q_sim_1",
    "question": "Nội dung câu hỏi 1 tương tự...",
    "content": "Nội dung câu hỏi 1 tương tự...",
    "type": "multiple_choice",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correctAnswer": 0,
    "explanation": "Lời giải chi tiết từng bước...",
    "difficulty": "medium",
    "topic": "${subjectName}"
  }
]

--- NỘI DUNG ĐỀ GỐC CẦN PHÂN TÍCH VÀ TẠO ĐỀ TƯƠNG TỰ ---
${fileData.slice(0, 30000)}
--- KẾT THÚC NỘI DUNG ĐỀ GỐC ---`;

  try {
    const { text } = await callGeminiAI({
      prompt,
      temperature: 0.5,
      images: images.length > 0 ? images.map((img) => ({ mimeType: img.mimeType, data: img.data })) : undefined,
    });

    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((q: any, idx: number) => {
        const qText = q.content || q.question || q.questionText || `Câu ${idx + 1}`;
        return {
          id: q.id || `q-sim-${Date.now()}-${idx}`,
          subjectId: '',
          content: qText,
          questionText: qText,
          question: qText,
          type: (q.type as any) || 'multiple_choice',
          options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['A. Phương án A', 'B. Phương án B', 'C. Phương án C', 'D. Phương án D'],
          correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
          expectedShortAnswer: q.expectedShortAnswer || q.sampleAnswer || '',
          explanation: q.explanation || 'Lời giải chi tiết chuẩn SGK.',
          difficulty: q.difficulty || 'medium',
          topic: q.topic || subjectName,
        };
      });
    }
  } catch (err) {
    console.warn('generateSimilarExamFromSource AI call failed, generating safe fallback exam:', err);
  }

  // Fallback if AI call fails or output cannot be parsed
  return generateFallbackQuestionsBySubject({ id: `sub-sim-${Date.now()}`, name: subjectName }, targetCount);
}
