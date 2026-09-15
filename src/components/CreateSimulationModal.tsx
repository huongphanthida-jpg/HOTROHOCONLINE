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
  Dna,
  Globe,
  Landmark,
  Cpu,
  Wrench,
  Eye,
  Save,
  Edit3,
  CheckCircle2,
} from 'lucide-react';
import { UploadedSourceItem, AISimulationItem } from '../types';
import { generateSimulationCode, extractCleanCode, cleanAiProseText } from '../services/aiService';

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
  const [selectedSubject, setSelectedSubject] = useState<string>('Vật Lý');
  const [topicTitle, setTopicTitle] = useState('');
  const [promptDescription, setPromptDescription] = useState('');
  const [uploadedSources, setUploadedSources] = useState<UploadedSourceItem[]>([]);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStepText, setGenerationStepText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [previewItem, setPreviewItem] = useState<AISimulationItem | null>(null);

  if (!isOpen) return null;

  // Preset sample prompts covering all subjects
  const samplePrompts = [
    {
      subject: 'Sinh Học',
      title: 'Mô Phỏng Phân Bào (Mitosis/Meiosis) & ADN',
      desc: 'Mô phỏng chu kỳ tế bào, chuyển động tách nhiễm sắc thể về 2 cực và cấu trúc xoắn kép ADN tương tác.',
    },
    {
      subject: 'Địa Lý',
      title: 'Chuyển Động Trái Đất & Hiện Tượng 4 Mùa',
      desc: 'Mô phỏng Trái Đất nghiêng 23.5° quay quanh Mặt Trời, ngày/đêm dài ngắn theo vĩ độ và chu trình nước.',
    },
    {
      subject: 'Lịch Sử',
      title: 'Sa Bàn Tương Tác Chiến Dịch & Dòng Thời Gian',
      desc: 'Mô phỏng dòng thời gian sự kiện lịch sử (Timeline) và sa bàn di chuyển lực lượng chiến dịch.',
    },
    {
      subject: 'Tin Học',
      title: 'Cổng Logic (AND, OR, NOT) & Bảng Chân Lý',
      desc: 'Mô phỏng các cổng logic số, công tắc HIGH/LOW điều khiển đèn LED và hiển thị bảng chân lý thời gian thực.',
    },
    {
      subject: 'Công Nghệ',
      title: 'Mạch Điện Cảm Biến & Hệ Thống Tự Động',
      desc: 'Mô phỏng sơ đồ mạch điện rơ-le điều khiển cảm biến ánh sáng/nhiệt độ bật tắt thiết bị tự động.',
    },
    {
      subject: 'Hóa Học',
      title: 'Chuẩn độ Axit - Bazơ (HCl & NaOH)',
      desc: 'Mô phỏng thí nghiệm nhỏ từng giọt dung dịch NaOH vào cốc đựng HCl có chất chỉ thị Phenolphthalein.',
    },
    {
      subject: 'Vật Lý',
      title: 'Dao động Sóng cơ & Giao thoa 2 nguồn',
      desc: 'Mô phỏng 2 nguồn sóng điểm tạo các gợn sóng tròn giao thoa trên mặt nước. Có thanh trượt chỉnh tần số f.',
    },
    {
      subject: 'Toán Học',
      title: 'Đồ thị Hàm số & Tiếp tuyến Động',
      desc: 'Mô phỏng vẽ đồ thị hàm số bậc 3 y = ax³ + bx² + cx + d và tiếp tuyến chuyển động theo x₀.',
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

    try {
      let cleanedCode = await generateSimulationCode({
        selectedSubject,
        title,
        combinedSourceText,
        imagesToSend,
      });

      if (!cleanedCode.toLowerCase().includes('<html') && !cleanedCode.toLowerCase().includes('<!doctype')) {
        // Fallback wrap in HTML document if AI output snippet
        cleanedCode = `<!DOCTYPE html>
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
  ${cleanedCode}
</body>
</html>`;
      }

      const rawDesc = promptDescription.trim() || `Thí nghiệm mô phỏng môn ${selectedSubject}: ${title}`;
      const cleanedDesc = cleanAiProseText(rawDesc) || title;

      const generatedSim: AISimulationItem = {
        id: `sim-ai-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title,
        subject: selectedSubject,
        description: cleanedDesc,
        objectives: cleanedDesc,
        instructions: 'Sử dụng các thanh trượt và nút bấm trên màn hình mô phỏng để điều chỉnh thông số thí nghiệm.',
        explanation: `Mô phỏng dựa trên hiện tượng và quy luật chuẩn SGK môn ${selectedSubject}.`,
        code: cleanedCode,
        createdAt: new Date().toISOString(),
        sourceDocTitle: uploadedSources[0]?.name || 'Tài liệu giáo viên',
      };

      setIsGenerating(false);
      setPreviewItem(generatedSim);
    } catch (err: any) {
      console.error('Lỗi khi sinh mô phỏng AI:', err);
      setIsGenerating(false);
      setErrorMsg(`Không thể kết nối API AI để tạo mô phỏng: ${err.message || 'Vui lòng thử lại!'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-0 relative my-8">
        {previewItem ? (
          <>
            {/* Modal Header for Preview */}
            <div className="p-6 bg-gradient-to-r from-purple-800 via-teal-700 to-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
                    <span>Mô Phỏng Đã Sẵn Sàng — Kiểm Tra &amp; Chỉnh Sửa Thông Tin</span>
                  </h3>
                  <p className="text-teal-100 text-xs">
                    Kiểm tra trải nghiệm mô phỏng và chỉnh sửa văn bản (tên, mô tả, hướng dẫn) trước khi bấm lưu
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPreviewItem(null);
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview & Edit Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* 1. Live Interactive Preview (Code is completely hidden!) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <Eye className="w-4 h-4 text-teal-600" />
                    <span>Xem Trước Mô Phỏng Tương Tác:</span>
                  </label>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    ✓ Mã nguồn HTML5/p5.js đã được làm sạch &amp; ẩn an toàn
                  </span>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner">
                  <iframe
                    title={previewItem.title}
                    srcDoc={previewItem.code}
                    sandbox="allow-scripts allow-same-origin allow-modals"
                    className="w-full h-80 border-0 bg-slate-950"
                  />
                </div>
              </div>

              {/* 2. Text Content Fields (Editable by teacher) */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Edit3 className="w-4 h-4 text-purple-600" />
                  <span>Chỉnh Sửa Câu Từ &amp; Thông Tin Hiển Thị Trước Khi Lưu:</span>
                </div>

                {/* Edit Title */}
                <div className="space-y-1 text-xs">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Tên Thí Nghiệm Mô Phỏng:</label>
                  <input
                    type="text"
                    value={previewItem.title}
                    onChange={(e) => setPreviewItem({ ...previewItem, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>

                {/* Edit Description */}
                <div className="space-y-1 text-xs">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Mô Tả Ngắn &amp; Kiến Thức Trọng Tâm (Loại bỏ toàn bộ câu chào thừa):
                  </label>
                  <textarea
                    rows={3}
                    value={previewItem.description || ''}
                    onChange={(e) =>
                      setPreviewItem({
                        ...previewItem,
                        description: e.target.value,
                        objectives: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* Edit Instructions */}
                <div className="space-y-1 text-xs">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Hướng Dẫn Thao Tác Cho Học Sinh:
                  </label>
                  <textarea
                    rows={2}
                    value={previewItem.instructions || ''}
                    onChange={(e) => setPreviewItem({ ...previewItem, instructions: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Preview Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 transition-colors flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tạo Lại / Nhập Lại</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSimulationCreated(previewItem);
                  setPreviewItem(null);
                  onClose();
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-lg transition-all flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Mô Phỏng Vào Danh Sách</span>
              </button>
            </div>
          </>
        ) : (
          <>
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'Vật Lý', label: 'Vật Lý', icon: Activity, color: 'text-teal-600' },
                    { id: 'Toán Học', label: 'Toán Học', icon: LineChart, color: 'text-purple-600' },
                    { id: 'Hóa Học', label: 'Hóa Học', icon: Atom, color: 'text-emerald-600' },
                    { id: 'Sinh Học', label: 'Sinh Học', icon: Dna, color: 'text-rose-600' },
                    { id: 'Địa Lý', label: 'Địa Lý', icon: Globe, color: 'text-blue-600' },
                    { id: 'Lịch Sử', label: 'Lịch Sử', icon: Landmark, color: 'text-amber-600' },
                    { id: 'Tin Học', label: 'Tin Học', icon: Cpu, color: 'text-indigo-600' },
                    { id: 'Công Nghệ', label: 'Công Nghệ', icon: Wrench, color: 'text-orange-600' },
                  ].map((sub) => {
                    const IconComponent = sub.icon;
                    const isSelected = selectedSubject === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setSelectedSubject(sub.id)}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all flex items-center justify-center space-x-1.5 ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                            : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : sub.color}`} />
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
          </>
        )}
      </div>
    </div>
  );
};
