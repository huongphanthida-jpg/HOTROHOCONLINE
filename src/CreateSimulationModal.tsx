import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Upload,
  FileText,
  FlaskConical,
  Activity,
  LineChart,
  Atom,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { UploadedSourceItem, AISimulationItem } from '../types';
import { callGeminiAI } from '../services/aiService';

interface CreateSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulationCreated: (newSim: AISimulationItem) => void;
}

export const CreateSimulationModal: React.FC<CreateSimulationModalProps> = ({
  isOpen,
  onClose,
  onSimulationCreated,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<'Vật Lý' | 'Toán Học' | 'Hóa Học'>('Vật Lý');
  const [topicTitle, setTopicTitle] = useState('');
  const [promptDescription, setPromptDescription] = useState('');
  const [uploadedSources, setUploadedSources] = useState<UploadedSourceItem[]>([]);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStepText, setGenerationStepText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Preset sample prompts
  const samplePrompts = [
    {
      subject: 'Hóa Học',
      title: 'Chuẩn độ Axit - Bazơ (HCl & NaOH)',
      desc: 'Mô phỏng thí nghiệm nhỏ từng giọt dung dịch NaOH vào cốc đựng HCl có chất chỉ thị Phenolphthalein. Có thanh trượt chỉnh nồng độ và nút bấm nhỏ giọt.',
    },
    {
      subject: 'Vật Lý',
      title: 'Dao động Sóng cơ & Giao thoa 2 nguồn',
      desc: 'Mô phỏng 2 nguồn sóng điểm tạo các gợn sóng tròn giao thoa trên mặt nước. Có thanh trượt chỉnh tần số f, biên độ A và khoảng cách 2 nguồn.',
    },
    {
      subject: 'Toán Học',
      title: 'Đồ thị Hàm số & Tiếp tuyến Động',
      desc: 'Mô phỏng vẽ đồ thị hàm số bậc 3 y = ax³ + bx² + cx + d và tiếp tuyến chuyển động theo tọa độ điểm x₀ thời gian thực.',
    },
  ];

  const handleSelectSample = (sample: typeof samplePrompts[0]) => {
    setSelectedSubject(sample.subject as any);
    setTopicTitle(sample.title);
    setPromptDescription(sample.desc);
  };

  // Process uploaded files
  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsReadingFiles(true);
    setErrorMsg('');

    const newItems: UploadedSourceItem[] = [];
    const fileArray = Array.from(files);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const isImage = file.type.startsWith('image/');
      const sizeFormatted = `${(file.size / 1024).toFixed(1)} KB`;

      if (isImage) {
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const base64Data = dataUrl.split(',')[1];
          newItems.push({
            id: `sim-src-img-${Date.now()}-${i}`,
            name: file.name,
            type: 'image',
            sizeFormatted,
            mimeType: file.type || 'image/jpeg',
            dataUrl,
            base64Data,
          });
        } catch (e) {
          console.warn('Lỗi đọc ảnh:', file.name, e);
        }
      } else {
        try {
          const textContent = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsText(file);
          });
          newItems.push({
            id: `sim-src-txt-${Date.now()}-${i}`,
            name: file.name,
            type: 'text',
            sizeFormatted,
            textContent,
          });
        } catch (e) {
          console.warn('Lỗi đọc file văn bản:', file.name, e);
        }
      }
    }

    setUploadedSources((prev) => [...prev, ...newItems]);
    setIsReadingFiles(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleRemoveSource = (id: string) => {
    setUploadedSources((prev) => prev.filter((s) => s.id !== id));
  };

  // Execute AI Simulation Generation
  const handleGenerateSimulation = async () => {
    const textSections: string[] = [];

    uploadedSources
      .filter((s) => s.type === 'text' && s.textContent)
      .forEach((s, idx) => {
        textSections.push(`=== TÀI LIỆU NGUỒN #${idx + 1}: ${s.name} ===\n${s.textContent}`);
      });

    if (promptDescription.trim()) {
      textSections.push(`=== YÊU CẦU MÔ PHỎNG & HIỆN TƯỢNG ===\n${promptDescription.trim()}`);
    }

    const imagesToSend = uploadedSources
      .filter((s) => s.type === 'image' && s.base64Data)
      .map((s, idx) => ({
        mimeType: s.mimeType || 'image/jpeg',
        data: s.base64Data!,
        title: s.name || `Hình ảnh SGK #${idx + 1}`,
      }));

    const title = topicTitle.trim() || `Thí nghiệm mô phỏng môn ${selectedSubject}`;
    const combinedSourceText = textSections.join('\n\n');

    if (!combinedSourceText && imagesToSend.length === 0) {
      setErrorMsg('Vui lòng nhập mô tả thí nghiệm hoặc tải lên bài học/ảnh SGK để AI có cơ sở tạo mô phỏng!');
      return;
    }

    setIsGenerating(true);
    setErrorMsg('');
    setGenerationStepText('AI đang đọc tài liệu và lập trình mã mô phỏng p5.js/HTML5 Canvas...');

    const systemInstruction = `
Bạn là một chuyên gia lập trình mô phỏng giáo dục và phát triển thí nghiệm ảo tương tác bằng HTML5 Canvas và p5.js cho học sinh phổ thông Việt Nam.

Nhiệm vụ: Dựa vào các tài liệu và văn bản/hình ảnh được tải lên, hãy viết ra MỘT FILE HTML HOÀN CHỈNH (Single File HTML) chứa toàn bộ CSS, HTML và JavaScript để chạy một Thí nghiệm ảo / Mô phỏng học tập tương tác.

CÁC YÊU CẦU BẮT BUỘC VỀ CODE MÔ PHỎNG:
1. Giao diện đẹp mắt, hiện đại (dark mode hoặc light mode sắc nét, font chữ sans-serif tiếng Việt).
2. TẢI THƯ VIỆN BẮT BUỘC TRONG THẺ <head>:
   <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
3. THANH ĐIỀU KHIỂN TƯƠNG TÁC THỜI GIAN THỰC (Interactive Controls UI):
   - Có các thanh trượt <input type="range"> để học sinh tùy chỉnh thông số (Nhiệt độ, Nồng độ, Khối lượng, Vận tốc, Tần số, Chiều dài...).
   - Có các nút bấm Action: "Chạy mô phỏng", "Tạm dừng", "Đặt lại (Reset)", "Nhiệt độ +", "Thêm giọt hóa chất"...
4. BẢNG THÔNG SỐ VÀ CÔNG THỨC THỜI GIAN THỰC (HUD/Dashboard):
   - Hiển thị công thức toán/lý/hóa áp dụng.
   - Hiển thị các giá trị đại lượng tính toán tức thời (Chu kỳ T, Động năng Ek, Thế năng Et, pH, Nồng độ...).
5. CHỈ TRẢ VỀ ĐOẠN MÃ CODE HTML HOÀN CHỈNH (bắt đầu bằng <!DOCTYPE html> và kết thúc bằng </html>). KHÔNG ĐƯỢC viết câu chào, lời mở đầu hay bất kỳ văn bản prose tiếng Việt nào bên ngoài code block.
`;

    const userPrompt = `
Hãy lập trình mã mô phỏng thí nghiệm ảo tương tác bằng HTML5 Canvas / p5.js cho:
- Môn học: ${selectedSubject}
- Chủ đề thí nghiệm: ${title}
- Nội dung tài liệu & Yêu cầu chi tiết:
${combinedSourceText}

Đảm bảo mã HTML5/JS này đầy đủ, chạy trực tiếp trong iframe và có giao diện điều khiển phong phú.
`;

    try {
      const res = await callGeminiAI({
        prompt: userPrompt,
        systemInstruction,
        temperature: 0.5,
        maxOutputTokens: 8192,
        images: imagesToSend.length > 0 ? imagesToSend : undefined,
      });

      let rawCode = res.text || '';
      // Strip markdown ```html ... ``` wrappers if present
      rawCode = rawCode.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

      if (!rawCode.toLowerCase().includes('<html') && !rawCode.toLowerCase().includes('<!doctype')) {
        // Fallback wrap in HTML document if AI output snippet
        rawCode = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; }
    .control-panel { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; background: #1e293b; padding: 12px; border-radius: 12px; }
    button { background: #0d9488; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; }
    button:hover { background: #0f766e; }
  </style>
</head>
<body>
  ${rawCode}
</body>
</html>`;
      }

      const newSim: AISimulationItem = {
        id: `sim-ai-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title,
        subject: selectedSubject,
        description: promptDescription.trim() || `Thí nghiệm mô phỏng AI tạo từ tài liệu môn ${selectedSubject}`,
        code: rawCode,
        createdAt: new Date().toISOString(),
        sourceDocTitle: uploadedSources[0]?.name || 'Tài liệu giáo viên',
      };

      setIsGenerating(false);
      onSimulationCreated(newSim);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi sinh mô phỏng AI:', err);
      setIsGenerating(false);
      setErrorMsg(`Không thể kết nối API AI để tạo mô phỏng: ${err.message || 'Vui lòng thử lại!'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-0 relative my-8">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
                <span>+ Tải Tài Liệu &amp; Tạo Mô Phỏng Bằng AI</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-teal-950 text-[10px] font-black uppercase">
                  p5.js &amp; Canvas
                </span>
              </h3>
              <p className="text-teal-100 text-xs">
                AI phân tích tài liệu bài học và tự động lập trình thí nghiệm ảo tương tác 2D/3D cho học sinh
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Subject Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              1. Chọn Môn Học Thí Nghiệm:
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'Vật Lý', label: 'Vật Lý', icon: Activity, color: 'text-teal-600' },
                { id: 'Toán Học', label: 'Toán Học', icon: LineChart, color: 'text-purple-600' },
                { id: 'Hóa Học', label: 'Hóa Học', icon: Atom, color: 'text-emerald-600' },
              ].map((sub) => {
                const IconComponent = sub.icon;
                const isSelected = selectedSubject === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubject(sub.id as any)}
                    className={`p-3 rounded-2xl border text-center font-bold text-xs transition-all flex items-center justify-center space-x-2 ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-teal-50'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isSelected ? 'text-white' : sub.color}`} />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Topic & Description Prompt */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                2. Tên Thí Nghiệm &amp; Yêu Cầu Mô Phỏng:
              </label>
              <span className="text-[11px] text-slate-400">Chọn mẫu nhanh bên dưới</span>
            </div>

            {/* Quick Sample Chips */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              {samplePrompts.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSample(s)}
                  className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-700 dark:text-purple-300 font-medium whitespace-nowrap hover:bg-purple-100 transition-colors"
                >
                  ⚡ {s.title}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              placeholder="Ví dụ: Mô phỏng thí nghiệm chuẩn độ Axit - Bazơ, Mô phỏng giao thoa sóng..."
              className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
            />

            <textarea
              rows={3}
              value={promptDescription}
              onChange={(e) => setPromptDescription(e.target.value)}
              placeholder="Mô tả cụ thể hiện tượng, các thông số cần điều chỉnh (nhiệt độ, khối lượng, nồng độ, các nút bấm nhỏ giọt, tạm dừng)..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* 3. Upload Sources (Textbook pages, Docs, Photos) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              3. Tải Lên Trang Sách Giáo Khoa / Ảnh Bài Học / Tệp Mô Tả:
            </label>

            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 rounded-2xl p-4 text-center transition-colors bg-slate-50/50 dark:bg-slate-800/40 relative">
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.docx"
                onChange={handleFileInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center space-y-1.5 pointer-events-none">
                <Upload className="w-6 h-6 text-teal-600" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Bấm hoặc Kéo thả hình ảnh bài học, tệp PDF/Word vào đây
                </span>
                <span className="text-[11px] text-slate-400">
                  AI sẽ tự động đọc văn bản &amp; hình ảnh trong tài liệu để thiết kế thí nghiệm
                </span>
              </div>
            </div>

            {/* List of Uploaded Sources */}
            {uploadedSources.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {uploadedSources.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{s.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({s.sizeFormatted})</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSource(s.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200"
          >
            Hủy
          </button>

          <button
            type="button"
            disabled={isGenerating || isReadingFiles}
            onClick={handleGenerateSimulation}
            className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{generationStepText || 'AI đang tạo mô phỏng p5.js...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>⚡ Kích Hoạt AI Tạo Mô Phỏng</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
