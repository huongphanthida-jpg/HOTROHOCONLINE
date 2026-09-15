import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Upload,
  FileText,
  Layers,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Sliders,
  HelpCircle,
  FileCheck,
  Eye,
  AlertTriangle,
  Send,
  Award,
  CheckSquare,
  Hash,
  Plus,
  Minus,
  Image as ImageIcon,
  Maximize2,
  FolderOpen,
  Edit3,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { Subject, Question, DocumentLearning, UploadedSourceItem } from '../types';
import { generateExamFromSource, generateFallbackQuestionsBySubject } from '../services/aiService';
import { buildSlugSubjectId } from '../utils/sharePayloadUtils';
import { FormattedMathText } from './FormattedMathText';

interface CreateExamFromSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableClasses: string[];
  existingDocuments?: DocumentLearning[];
  onCreateExam: (newSubject: Subject, questions: Question[]) => void;
}

// Sample realistic curriculum texts for 1-click test
const CURRICULUM_SAMPLES: Record<string, string> = {
  '10': `CHUYÊN ĐỀ TOÁN HỌC LỚP 10 (CHƯƠNG TRÌNH 2026-2027): VÉCTƠ VÀ CÁC PHÉP TOÁN
1. Định nghĩa véctơ: Véctơ là một đoạn thẳng có hướng. Điểm đầu là gốc, điểm cuối là ngọn. Véctơ-không là véctơ có điểm đầu và điểm cuối trùng nhau, kí hiệu là 0.
2. Hai véctơ cùng phương, cùng hướng: Hai véctơ được gọi là cùng phương nếu giá của chúng song song hoặc trùng nhau. Hai véctơ cùng phương thì hoặc cùng hướng hoặc ngược hướng.
3. Tổng và hiệu của hai véctơ:
- Quy tắc ba điểm: Với ba điểm A, B, C bất kì, ta có AB + BC = AC.
- Quy tắc hình bình hành: Nếu ABCD là hình bình hành thì AB + AD = AC.
- Quy tắc đường trung tuyến: Nếu M là trung điểm của đoạn thẳng AB thì với điểm O bất kì, OA + OB = 2OM.
4. Tích của một số với một véctơ: Tích của số k với véctơ a là một véctơ, kí hiệu là k.a. Véctơ k.a cùng hướng với a khi k > 0, ngược hướng với a khi k < 0. Độ dài |k.a| = |k|.|a|.
5. Tích vô hướng của hai véctơ: a . b = |a| . |b| . cos(a, b). Điều kiện để hai véctơ khác không vuông góc với nhau là a . b = 0.`,

  '11': `CHUYÊN ĐỀ TOÁN HỌC LỚP 11: HÀM SỐ LƯỢNG GIÁC VÀ GIỚI HẠN DÃY SỐ
1. Hàm số lượng giác:
- Hàm số y = sin x: Tập xác định R, tập giá trị [-1; 1], là hàm số lẻ, tuần hoàn với chu kì 2pi.
- Hàm số y = cos x: Tập xác định R, tập giá trị [-1; 1], là hàm số chẵn, tuần hoàn với chu kì 2pi.
- Hàm số y = tan x: Tập xác định R \\ {pi/2 + k.pi, k thuộc Z}, hàm số lẻ, tuần hoàn với chu kì pi.
2. Phương trình lượng giác cơ bản:
- sin x = sin a <=> x = a + k2pi hoặc x = pi - a + k2pi (k thuộc Z).
- cos x = cos a <=> x = a + k2pi hoặc x = -a + k2pi (k thuộc Z).
3. Giới hạn của dãy số và hàm số:
- Giới hạn lim (1/n^k) = 0 với k nguyên dương.
- Giới hạn vô định: 0/0, vô cùng/vô cùng. Phương pháp khử: nhân lượng liên hợp, chia cho bậc cao nhất.
- Giới hạn cơ bản: lim (sin x / x) = 1 khi x -> 0.`,

  '12': `CHUYÊN ĐỀ TOÁN HỌC LỚP 12: KHẢO SÁT HÀM SỐ & NGUYÊN HÀM - TÍCH PHÂN
1. Ứng dụng đạo hàm khảo sát hàm số:
- Tính đơn điệu: Cho hàm số f(x) có đạo hàm trên K. Nếu f'(x) > 0 với mọi x thuộc K thì hàm số đồng biến trên K. Nếu f'(x) < 0 thì hàm số nghịch biến.
- Cực trị: Điểm x0 là điểm cực đại nếu f'(x0) = 0 (hoặc không xác định) và f'(x) đổi dấu từ dương sang âm khi qua x0.
- Đường tiệm cận: lim f(x) = y0 khi x -> vô cùng thì y = y0 là tiệm cận ngang; lim f(x) = vô cùng khi x -> x0 thì x = x0 là tiệm cận đứng.
2. Nguyên hàm và Tích phân:
- Định nghĩa: F(x) là nguyên hàm của f(x) trên K nếu F'(x) = f(x).
- Công thức Newton-Leibniz: Tích phân từ a đến b của f(x)dx = F(b) - F(a).
- Ứng dụng hình học: Diện tích hình phẳng giới hạn bởi đồ thị y = f(x), trục hoành và hai đường thẳng x=a, x=b là S = tích phân từ a đến b của |f(x)|dx. Thể tích khối tròn xoay V = pi * tích phân [f(x)]^2 dx.`,
};

export const CreateExamFromSourceModal: React.FC<CreateExamFromSourceModalProps> = ({
  isOpen,
  onClose,
  availableClasses,
  existingDocuments = [],
  onCreateExam,
}) => {
  // Step: 'input' (setup source & parameters) or 'preview' (review generated questions)
  const [step, setStep] = useState<'input' | 'preview'>('input');

  // Basic Information
  const [selectedGrade, setSelectedGrade] = useState<'10' | '11' | '12'>('10');
  const [selectedClassNumber, setSelectedClassNumber] = useState('10T2');
  const [customClassName, setCustomClassName] = useState('');
  const [selectedSubjectType, setSelectedSubjectType] = useState('Toán');
  const [examTitle, setExamTitle] = useState('Toán lớp 10T2 - Đề kiểm tra năng lực');
  const [examDesc, setExamDesc] = useState('Đề thi được AI biên soạn bám sát nguồn tài liệu chuyên đề');
  const [colorTheme, setColorTheme] = useState('from-teal-500 to-emerald-600');

  // Source Data Input States (Multi-Source Support)
  const [sourceTab, setSourceTab] = useState<'upload' | 'paste' | 'library'>('upload');
  const [sourceText, setSourceText] = useState('');
  const [uploadedSources, setUploadedSources] = useState<UploadedSourceItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [previewLightboxItem, setPreviewLightboxItem] = useState<UploadedSourceItem | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isReadingFiles, setIsReadingFiles] = useState(false);

  // Exam Generation Settings
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [questionFormat, setQuestionFormat] = useState<
    'multiple_choice' | 'short_answer' | 'true_false' | 'essay' | 'mixed'
  >('multiple_choice');
  const [selectedCustomFormats, setSelectedCustomFormats] = useState<
    ('multiple_choice' | 'short_answer' | 'true_false' | 'essay')[]
  >(['multiple_choice', 'short_answer']);
  const [formatCounts, setFormatCounts] = useState<
    Record<'multiple_choice' | 'short_answer' | 'true_false' | 'essay', number>
  >({
    multiple_choice: 3,
    short_answer: 2,
    true_false: 2,
    essay: 1,
  });
  const [difficulty, setDifficulty] = useState<'balanced' | 'easy' | 'medium' | 'hard'>('balanced');

  // Tính tổng số câu hỏi từ các dạng đã chọn khi ở chế độ hỗn hợp
  const mixedTotalQuestions = useMemo(() => {
    return selectedCustomFormats.reduce((sum, fmt) => sum + (formatCounts[fmt] || 0), 0);
  }, [selectedCustomFormats, formatCounts]);

  // Cập nhật số câu cho 1 dạng cụ thể (+ hoặc -)
  const handleUpdateFormatCount = (
    fmt: 'multiple_choice' | 'short_answer' | 'true_false' | 'essay',
    delta: number
  ) => {
    setFormatCounts((prev) => {
      const current = prev[fmt] || 0;
      const nextVal = Math.max(1, Math.min(25, current + delta));
      const next = { ...prev, [fmt]: nextVal };
      if (!selectedCustomFormats.includes(fmt)) {
        setSelectedCustomFormats((f) => [...f, fmt]);
      }
      const newTotal = selectedCustomFormats.reduce(
        (sum, f) => sum + (f === fmt ? nextVal : (prev[f] || 0)),
        selectedCustomFormats.includes(fmt) ? 0 : nextVal
      );
      setQuestionCount(newTotal);
      return next;
    });
  };

  // Đặt giá trị số câu chính xác cho 1 dạng
  const handleSetExactFormatCount = (
    fmt: 'multiple_choice' | 'short_answer' | 'true_false' | 'essay',
    val: number
  ) => {
    const safeVal = Math.max(1, Math.min(30, val));
    setFormatCounts((prev) => {
      const next = { ...prev, [fmt]: safeVal };
      if (!selectedCustomFormats.includes(fmt)) {
        setSelectedCustomFormats((f) => [...f, fmt]);
      }
      const newTotal = selectedCustomFormats.reduce(
        (sum, f) => sum + (f === fmt ? safeVal : (prev[f] || 0)),
        selectedCustomFormats.includes(fmt) ? 0 : safeVal
      );
      setQuestionCount(newTotal);
      return next;
    });
  };

  // Bật/tắt 1 dạng câu hỏi trong chế độ hỗn hợp
  const handleToggleFormat = (fmt: 'multiple_choice' | 'short_answer' | 'true_false' | 'essay') => {
    const isChecked = selectedCustomFormats.includes(fmt);
    if (isChecked && selectedCustomFormats.length === 1) return; // Luôn giữ tối thiểu 1 dạng

    if (isChecked) {
      setSelectedCustomFormats((prev) => prev.filter((x) => x !== fmt));
      const remainingTotal = selectedCustomFormats
        .filter((x) => x !== fmt)
        .reduce((sum, f) => sum + (formatCounts[f] || 0), 0);
      setQuestionCount(remainingTotal || 1);
    } else {
      setSelectedCustomFormats((prev) => [...prev, fmt]);
      const addCount = (formatCounts[fmt] || 0) > 0 ? formatCounts[fmt] : 2;
      setFormatCounts((prev) => ({ ...prev, [fmt]: addCount }));
      const newTotal = mixedTotalQuestions + addCount;
      setQuestionCount(newTotal);
    }
  };

  // Phân bổ nhanh số câu tổng vào các dạng đã chọn
  const handleApplyPresetInMixed = (targetTotal: number) => {
    if (selectedCustomFormats.length === 0) return;
    const numFormats = selectedCustomFormats.length;
    const base = Math.floor(targetTotal / numFormats);
    let remainder = targetTotal % numFormats;

    const newCounts = { ...formatCounts };
    selectedCustomFormats.forEach((fmt) => {
      const extra = remainder > 0 ? 1 : 0;
      newCounts[fmt] = Math.max(1, base + extra);
      if (remainder > 0) remainder--;
    });

    setFormatCounts(newCounts);
    setQuestionCount(targetTotal);
  };

  // AI Generating State & Preview Mode State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStepText, setGenerationStepText] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewTab, setPreviewTab] = useState<'edit' | 'render'>('render');
  const [isEditingMode, setIsEditingMode] = useState<boolean>(false);
  const [editingQuestionIds, setEditingQuestionIds] = useState<Record<string, boolean>>({});

  const handleToggleEditQuestion = (id: string) => {
    setEditingQuestionIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Inline question editing handlers
  const handleUpdateQuestionContent = (id: string, content: string) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, content } : q))
    );
  };

  const handleUpdateQuestionOption = (id: string, optionIdx: number, newText: string) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const newOpts = [...(q.options || [])];
        const prefix = String.fromCharCode(65 + optionIdx) + '. ';
        newOpts[optionIdx] = newText.startsWith(prefix) ? newText : `${prefix}${newText.replace(/^[A-D]\.\s*/, '')}`;
        return { ...q, options: newOpts };
      })
    );
  };

  const handleSelectCorrectAnswer = (id: string, correctIdx: number) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, correctAnswer: correctIdx } : q))
    );
  };

  const handleUpdateExplanation = (id: string, explanation: string) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, explanation } : q))
    );
  };

  const handleUpdatePoints = (id: string, points: number) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, points } : q))
    );
  };

  const handleUpdateDifficulty = (id: string, difficulty: 'easy' | 'medium' | 'hard') => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, difficulty } : q))
    );
  };

  const handleUpdateExpectedAnswer = (id: string, expectedAnswer: string) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, expectedShortAnswer: expectedAnswer, sampleAnswer: expectedAnswer } : q))
    );
  };

  if (!isOpen) return null;

  const currentClass = customClassName.trim() || selectedClassNumber;

  // Handle Class change & auto suggest title
  const handleSelectClass = (cls: string) => {
    setSelectedClassNumber(cls);
    setCustomClassName('');
    const grade = cls.startsWith('10') ? '10' : cls.startsWith('11') ? '11' : '12';
    setSelectedGrade(grade as any);
    setExamTitle(`${selectedSubjectType} lớp ${cls} - Đề kiểm tra định kỳ`);
  };

  // Process multiple files (images, documents) and append to uploadedSources
  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsReadingFiles(true);
    setErrorMsg('');

    const newItems: UploadedSourceItem[] = [];
    const fileArray = Array.from(files);

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const isImage = file.type.startsWith('image/');
        const sizeFormatted = `${(file.size / 1024).toFixed(1)} KB`;

        if (isImage) {
          try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve((reader.result as string) || '');
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
            newItems.push({
              id: `src-img-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 6)}`,
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
              reader.onload = () => resolve((reader.result as string) || '');
              reader.onerror = reject;
              reader.readAsText(file);
            });
            newItems.push({
              id: `src-txt-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 6)}`,
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
    } catch (err: any) {
      console.error('Lỗi khi đọc danh sách tệp:', err);
      setErrorMsg('Không thể xử lý một số tệp đã chọn. Vui lòng thử lại!');
    } finally {
      setIsReadingFiles(false);
    }
  };

  // Handle file input change (multi-file)
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = ''; // Reset input to allow re-uploading same file name if needed
    }
  };

  // Remove a specific uploaded source
  const handleRemoveSource = (id: string) => {
    setUploadedSources((prev) => prev.filter((s) => s.id !== id));
  };

  // Clear all uploaded sources and selected library docs
  const handleClearAllSources = () => {
    setUploadedSources([]);
    setSelectedDocIds([]);
    setSourceText('');
  };

  // Toggle selection of a document from existing library
  const handleToggleDoc = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  // Quick action to load 2 structured sample textbook pages for current grade
  const handleLoadSampleTextbookPages = () => {
    const samplePage1: UploadedSourceItem = {
      id: `sample-page-1-${Date.now()}`,
      name: `Trang_SGK_${selectedGrade}_Trang_1_Ly_Thuyet_Trong_Tam.txt`,
      type: 'text',
      sizeFormatted: '3.5 KB',
      textContent: `[TRANG SÁCH GIÁO KHOA SỐ 1 - MÔN ${selectedSubjectType.toUpperCase()} LỚP ${selectedGrade}]\nPhần I: Khái niệm mở đầu, định nghĩa và định lý nền tảng:\n${CURRICULUM_SAMPLES[selectedGrade]}\n(Nguồn: Sách giáo khoa chuẩn lớp ${selectedGrade} - Trang 1)`,
    };

    const samplePage2: UploadedSourceItem = {
      id: `sample-page-2-${Date.now()}`,
      name: `Trang_SGK_${selectedGrade}_Trang_2_Cong_Thuc_Va_Phuong_Phap.txt`,
      type: 'text',
      sizeFormatted: '4.1 KB',
      textContent: `[TRANG SÁCH GIÁO KHOA SỐ 2 - MÔN ${selectedSubjectType.toUpperCase()} LỚP ${selectedGrade}]\nPhần II: Hệ thống công thức tính nhanh và phương pháp giải dạng bài tập:\n1. Công thức liên hệ toán học áp dụng trong thực tiễn môn ${selectedSubjectType} lớp ${selectedGrade}.\n2. Các bước suy luận chính xác từ giả thiết đến kết luận.\n3. Những lỗi sai học sinh thường gặp và quy ước chuẩn khi giải bài kiểm tra.\n(Nguồn: Sách giáo khoa chuẩn lớp ${selectedGrade} - Trang 2)`,
    };

    setUploadedSources((prev) => [...prev, samplePage1, samplePage2]);
  };

  // AI Exam Generation Execution (Synthesizes across all uploaded sources with zero-hallucination mandate)
  const handleGenerateExam = async () => {
    // 1. Gather all images
    const imagesToSend = uploadedSources
      .filter((s) => s.type === 'image' && (s.base64Data || s.dataUrl))
      .map((s, idx) => {
        const rawData = s.base64Data || s.dataUrl || '';
        const cleanData = rawData.replace(/^data:image\/\w+;base64,/, '').trim();
        return {
          mimeType: s.mimeType || 'image/jpeg',
          data: cleanData,
          title: s.name || `Trang SGK #${idx + 1}`,
          pageIndex: idx + 1,
        };
      });

    // 2. Gather all text sections
    const textSections: string[] = [];

    if (imagesToSend.length > 0) {
      textSections.push(
        `=== DANH MỤC ${imagesToSend.length} TRANG HÌNH ẢNH SÁCH GIÁO KHOA / TÀI LIỆU ĐƯỢC TẢI LÊN ===\n` +
          imagesToSend.map((img, i) => `Trang/Ảnh #${i + 1}: ${img.title}`).join('\n') +
          `\n(AI BẮT BUỘC phải đọc kỹ toàn bộ các hình ảnh này và kết hợp nội dung từ tất cả các trang ảnh để tạo đề thi)`
      );
    }

    uploadedSources
      .filter((s) => s.type === 'text' && s.textContent)
      .forEach((s, idx) => {
        textSections.push(
          `=== NGUỒN TÀI LIỆU VĂN BẢN #${idx + 1}: ${s.name} (${s.sizeFormatted}) ===\n${s.textContent}`
        );
      });

    selectedDocIds.forEach((id, idx) => {
      const doc = existingDocuments.find((d) => d.id === id);
      if (doc) {
        textSections.push(
          `=== TÀI LIỆU TỪ KHO KIẾN THỨC #${idx + 1}: ${doc.title} ===\n${doc.content}`
        );
      }
    });

    if (sourceText.trim()) {
      textSections.push(
        `=== NỘI DUNG VĂN BẢN / GHI CHÚ BỔ SUNG ===\n${sourceText.trim()}`
      );
    }

    const combinedSource = textSections.join('\n\n');

    const totalSourcesCount =
      uploadedSources.length + selectedDocIds.length + (sourceText.trim() ? 1 : 0);

    if (totalSourcesCount === 0 && imagesToSend.length === 0) {
      setErrorMsg(
        'Vui lòng tải lên các trang sách giáo khoa, tệp tài liệu hoặc dán nội dung để AI có cơ sở tạo đề thi!'
      );
      return;
    }

    setIsGenerating(true);
    setErrorMsg('');
    setGenerationStepText(
      `AI đang kết hợp kiến thức từ ${totalSourcesCount} nguồn tài liệu (${imagesToSend.length} ảnh SGK)...`
    );

    try {
      setTimeout(() => {
        setGenerationStepText(`AI đang tổng hợp nội dung liên trang và thiết lập ma trận đề thi lớp ${currentClass}...`);
      }, 1200);

      setTimeout(() => {
        setGenerationStepText('Đang thẩm định đề: Đảm bảo 100% không tạo thông tin ngoài nguồn cung cấp...');
      }, 2400);

      const activeFormats = questionFormat === 'mixed' ? selectedCustomFormats : [questionFormat as any];
      const effectiveTotal = questionFormat === 'mixed' ? mixedTotalQuestions : questionCount;
      const effectiveFormatCounts =
        questionFormat === 'mixed'
          ? Object.fromEntries(selectedCustomFormats.map((fmt) => [fmt, formatCounts[fmt] || 1]))
          : { [questionFormat]: questionCount };

      const sourceItemsSummary = [
        ...uploadedSources.map(
          (s, i) => `${i + 1}. [${s.type === 'image' ? 'Ảnh SGK' : 'Văn bản'}] ${s.name} (${s.sizeFormatted})`
        ),
        ...selectedDocIds
          .map((id) => existingDocuments.find((d) => d.id === id))
          .filter(Boolean)
          .map((d, i) => `${uploadedSources.length + i + 1}. [Kho tài liệu] ${d!.title}`),
        ...(sourceText.trim() ? [`${uploadedSources.length + selectedDocIds.length + 1}. [Ghi chú bổ sung] ${sourceText.slice(0, 80)}...`] : []),
      ].join('\n');

      const questions = await generateExamFromSource({
        sourceContent: combinedSource,
        subjectName: examTitle,
        className: currentClass,
        grade: selectedGrade,
        subjectType: selectedSubjectType,
        count: effectiveTotal,
        questionFormat,
        selectedFormats: activeFormats,
        formatCounts: effectiveFormatCounts,
        difficulty,
        images: imagesToSend,
        sourceItemsSummary,
      });

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        throw new Error('AI không thể khởi tạo câu hỏi từ nguồn tài liệu này. Vui lòng thử lại!');
      }

      const sanitizedQuestions: Question[] = questions.map((q, idx) => ({
        id: q.id || `q-gen-${Date.now()}-${idx + 1}`,
        subjectId: '',
        content: String(q.content || (q as any).question || (q as any).title || (q as any).prompt || `Câu hỏi ${idx + 1}`).trim(),
        type: q.type || 'multiple_choice',
        options: Array.isArray(q.options) && q.options.length > 0
          ? q.options.map((o) => String(o || '').trim())
          : ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
        correctAnswer: typeof q.correctAnswer === 'number' && !isNaN(q.correctAnswer) ? q.correctAnswer : 0,
        explanation: String(q.explanation || 'Giải thích chi tiết bám sát nội dung bài học.').trim(),
        points: typeof q.points === 'number' ? q.points : Number((10 / questions.length).toFixed(2)),
        difficulty: q.difficulty || 'medium',
        topic: examTitle,
        expectedShortAnswer: (q as any).expectedShortAnswer || (q as any).sampleAnswer || '',
        sampleAnswer: (q as any).sampleAnswer || (q as any).expectedShortAnswer || '',
      }));

      setGeneratedQuestions(sanitizedQuestions);
      setStep('preview');
    } catch (err: any) {
      console.error('Lỗi khi gọi AI tạo đề thi:', err);
      const msg = err.message || 'Có lỗi xảy ra trong quá trình AI tạo đề thi.';
      setErrorMsg(msg);
      alert(`Lỗi gọi AI: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete a question in preview & recalculate remaining points to preserve 10.0 scale
  const handleDeleteQuestion = (qId: string) => {
    setGeneratedQuestions((prev) => {
      const remaining = prev.filter((q) => q.id !== qId);
      if (remaining.length === 0) return [];
      const basePt = Number((10 / remaining.length).toFixed(2));
      let sum = 0;
      return remaining.map((q, idx) => {
        const pt = idx === remaining.length - 1 ? Number((10 - sum).toFixed(2)) : basePt;
        sum += basePt;
        return {
          ...q,
          points: pt > 0 ? pt : basePt,
        };
      });
    });
  };

  // Finalize and save exam
  const handleFinalizeSave = () => {
    if (generatedQuestions.length === 0) {
      setErrorMsg('Bộ đề thi chưa có câu hỏi nào. Vui lòng tạo câu hỏi trước khi lưu!');
      return;
    }

    const subjectId = buildSlugSubjectId(selectedSubjectType, currentClass);
    const mappedQuestions = generatedQuestions.map((q, idx) => ({
      ...q,
      id: `q-${subjectId}-${idx + 1}`,
      subjectId,
    }));

    const newSub: Subject = {
      id: subjectId,
      name: examTitle.trim() || `${selectedSubjectType} lớp ${currentClass}`,
      description:
        examDesc.trim() ||
        `Đề thi ${selectedSubjectType} lớp ${currentClass} (${generatedQuestions.length} câu) tạo từ dữ liệu nguồn`,
      color: colorTheme,
      icon:
        selectedSubjectType === 'Toán'
          ? 'fa-solid fa-square-root-variable'
          : selectedSubjectType === 'Vật lý'
          ? 'fa-solid fa-atom'
          : selectedSubjectType === 'Hóa học'
          ? 'fa-solid fa-flask'
          : selectedSubjectType === 'Sinh học'
          ? 'fa-solid fa-dna'
          : 'fa-solid fa-book',
      questionsCount: mappedQuestions.length,
      className: currentClass,
      grade: selectedGrade,
      subjectType: selectedSubjectType,
      questionFormat,
      source: 'teacher_custom',
      createdAt: new Date().toISOString(),
    };

    onCreateExam(newSub, mappedQuestions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full my-6 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/80 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Tạo Đề Thi Theo Lớp Bằng AI
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 text-[10px] font-bold">
                  Từ Nguồn Dữ Liệu
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI phân tích tài liệu/giáo án đưa lên, tự điều chỉnh số câu &amp; cấu trúc câu hỏi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'input' ? (
            <>
              {/* SECTION 1: Lớp học & Môn học */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-white flex items-center space-x-1.5">
                    <GraduationCap className="w-4 h-4 text-teal-600" />
                    <span>1. Phân Hiệu Lớp &amp; Thông Tin Môn Học</span>
                  </span>
                  <span className="text-[11px] text-teal-700 dark:text-teal-300 font-semibold">
                    Đang chọn: Lớp {currentClass} (Khối {selectedGrade})
                  </span>
                </div>

                {/* Quick Class Buttons */}
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 mb-1.5 font-medium">
                    Chọn nhanh lớp phân công:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['10T2', '11A2', '12D1', '10A1', '11B3', '12T1', '10A2', '11A1'].map((cls) => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => handleSelectClass(cls)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                          selectedClassNumber === cls && !customClassName
                            ? 'bg-teal-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-teal-50 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        Lớp {cls}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom class and subject details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      Mã lớp khác:
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 10T3, 11C2..."
                      value={customClassName}
                      onChange={(e) => {
                        setCustomClassName(e.target.value);
                        if (e.target.value.trim()) {
                          const cls = e.target.value.trim();
                          const grade = cls.startsWith('10') ? '10' : cls.startsWith('11') ? '11' : '12';
                          setSelectedGrade(grade as any);
                          setExamTitle(`${selectedSubjectType} lớp ${cls} - Đề kiểm tra`);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      Môn học:
                    </label>
                    <select
                      value={selectedSubjectType}
                      onChange={(e) => {
                        setSelectedSubjectType(e.target.value);
                        setExamTitle(`${e.target.value} lớp ${currentClass} - Đề kiểm tra định kỳ`);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium"
                    >
                      <option value="Toán">Toán học</option>
                      <option value="Vật lý">Vật lý</option>
                      <option value="Hóa học">Hóa học</option>
                      <option value="Sinh học">Sinh học</option>
                      <option value="Tiếng Anh">Tiếng Anh</option>
                      <option value="Lịch sử">Lịch sử</option>
                      <option value="Địa lí">Địa lí</option>
                      <option value="Tin học">Tin học</option>
                      <option value="Ngữ văn">Ngữ văn</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      Tông màu thẻ môn:
                    </label>
                    <select
                      value={colorTheme}
                      onChange={(e) => setColorTheme(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    >
                      <option value="from-teal-500 to-emerald-600">Xanh Ngọc (Teal)</option>
                      <option value="from-blue-500 to-cyan-600">Xanh Dương (Blue)</option>
                      <option value="from-indigo-500 to-purple-600">Tím Đậm (Purple)</option>
                      <option value="from-amber-500 to-orange-600">Cam Hổ Phách (Amber)</option>
                      <option value="from-rose-500 to-pink-600">Hồng Đỏ (Rose)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Tiêu đề đề thi / môn học <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="Ví dụ: Toán lớp 10T2 - Đề kiểm tra chuyên đề hàm số..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-semibold focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* SECTION 2: NGUỒN DỮ LIỆU ĐƯA LÊN (Hỗ trợ nạp nhiều nguồn: nhiều ảnh SGK, nhiều tệp, kho tài liệu) */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-white flex items-center space-x-1.5">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span>2. Nguồn Dữ Liệu Đưa Lên Để AI Tạo Đề Thi</span>
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Hỗ trợ tải nhiều trang ảnh SGK, tệp tài liệu và kết hợp đa nguồn (Không tạo thông tin ngoài nguồn)
                    </p>
                  </div>

                  {/* 3 Source Tabs */}
                  <div className="flex items-center space-x-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-600">
                    <button
                      type="button"
                      onClick={() => setSourceTab('upload')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center space-x-1.5 text-xs ${
                        sourceTab === 'upload'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải Tệp &amp; Ảnh SGK</span>
                      {uploadedSources.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/30 text-[10px] font-bold">
                          {uploadedSources.length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSourceTab('paste')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center space-x-1.5 text-xs ${
                        sourceTab === 'paste'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Dán Văn Bản</span>
                      {sourceText.trim() && (
                        <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSourceTab('library')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center space-x-1.5 text-xs ${
                        sourceTab === 'library'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Kho Tài Liệu AI</span>
                      {selectedDocIds.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full bg-teal-500 text-white text-[10px] font-bold">
                          {selectedDocIds.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* TAB 1: Tải Tệp & Nhiều Ảnh SGK */}
                {sourceTab === 'upload' && (
                  <div className="space-y-3">
                    <label
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingOver(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDraggingOver(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingOver(false);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          processFiles(e.dataTransfer.files);
                        }
                      }}
                      className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group ${
                        isDraggingOver
                          ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 scale-[1.01]'
                          : 'border-slate-300 dark:border-slate-600 hover:border-purple-500 dark:hover:border-purple-400 bg-white dark:bg-slate-800/80'
                      }`}
                    >
                      <input
                        type="file"
                        multiple
                        accept="image/*,.txt,.pdf,.docx,.md,.json"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-200 text-xs text-center">
                        Nhấn để chọn nhiều tệp hoặc kéo thả các tệp/ảnh vào đây
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1 text-center">
                        Hỗ trợ nạp cùng lúc <strong className="text-purple-600 dark:text-purple-400">nhiều ảnh sách giáo khoa (.png, .jpg)</strong> hoặc các tệp giáo án (.docx, .pdf, .txt, .md)
                      </span>
                      <div className="mt-2 flex items-center space-x-2 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-full">
                        <span>💡 Mẹo: Giữ phím Ctrl hoặc Shift để chọn cùng lúc nhiều trang sách</span>
                      </div>
                    </label>

                    {/* Quick Demo Test Action */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Chưa có sẵn ảnh trên máy?
                      </span>
                      <button
                        type="button"
                        onClick={handleLoadSampleTextbookPages}
                        className="text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center space-x-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Nạp thử 2 trang SGK mẫu Khối {selectedGrade}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: Dán Văn Bản / Giáo Án */}
                {sourceTab === 'paste' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Dán nội dung bài học, định lý, công thức hoặc giáo án bổ sung:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (CURRICULUM_SAMPLES[selectedGrade]) {
                            setSourceText(CURRICULUM_SAMPLES[selectedGrade]);
                          }
                        }}
                        className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center space-x-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Nạp mẫu chuẩn SGK Khối {selectedGrade}</span>
                      </button>
                    </div>

                    <textarea
                      rows={5}
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      placeholder="Dán nội dung bài giảng, lý thuyết SGK, hoặc danh sách kiến thức cần tạo đề..."
                      className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-sans leading-relaxed"
                    />
                    <div className="text-[11px] text-slate-400 text-right">
                      Đã nhập: {sourceText.length} ký tự
                    </div>
                  </div>
                )}

                {/* TAB 3: Chọn Từ Kho Tài Liệu AI (Hỗ trợ chọn nhiều tài liệu cùng lúc) */}
                {sourceTab === 'library' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Tích chọn các tài liệu từ kho để kết hợp vào đề thi:</span>
                      <span className="font-semibold text-teal-600">Đã chọn: {selectedDocIds.length} tài liệu</span>
                    </div>

                    {existingDocuments.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        Chưa có tài liệu nào trong phân hiệu "Học Lý Thuyết &amp; Tài Liệu AI". Bạn có thể chuyển sang tab Tải Tệp / Dán Văn Bản.
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {existingDocuments.map((doc) => {
                          const isSelected = selectedDocIds.includes(doc.id);
                          return (
                            <div
                              key={doc.id}
                              onClick={() => handleToggleDoc(doc.id)}
                              className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-900 dark:text-teal-200 shadow-2xs'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                                />
                                <BookOpen className="w-4 h-4 text-teal-600 shrink-0" />
                                <div>
                                  <div className="font-semibold text-xs">{doc.title}</div>
                                  <div className="text-[10px] text-slate-400 line-clamp-1">
                                    {doc.content.slice(0, 60)}...
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">
                                {doc.content.length} ký tự
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* BẢNG TỔNG HỢP CÁC NGUỒN TÀI LIỆU ĐÃ NẠP (Multi-Source Visual Gallery) */}
                {(uploadedSources.length > 0 || selectedDocIds.length > 0) && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            Đã nạp {uploadedSources.length + selectedDocIds.length} nguồn tài liệu (
                            {uploadedSources.filter((s) => s.type === 'image').length} ảnh SGK,{' '}
                            {uploadedSources.filter((s) => s.type === 'text').length} tệp văn bản
                            {selectedDocIds.length > 0 ? `, ${selectedDocIds.length} từ kho` : ''})
                          </span>
                        </span>
                        {isReadingFiles && (
                          <span className="text-[11px] text-slate-400 animate-pulse">
                            Đang xử lý tệp...
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer flex items-center space-x-1">
                          <Plus className="w-3 h-3" />
                          <span>Thêm tệp/ảnh khác</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*,.txt,.pdf,.docx,.md,.json"
                            onChange={handleFileInputChange}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleClearAllSources}
                          className="text-[11px] font-bold text-rose-600 hover:underline flex items-center space-x-0.5 ml-2"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Xóa tất cả</span>
                        </button>
                      </div>
                    </div>

                    {/* Danh sách các thẻ nguồn tài liệu */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                      {/* Uploaded Sources */}
                      {uploadedSources.map((source, idx) => (
                        <div
                          key={source.id}
                          className="p-2.5 rounded-xl border border-purple-200/80 dark:border-purple-800/80 bg-white dark:bg-slate-800 flex flex-col justify-between text-xs shadow-2xs hover:shadow-xs transition-shadow"
                        >
                          {source.type === 'image' ? (
                            <div>
                              <div className="relative group/img overflow-hidden rounded-lg mb-1.5 bg-slate-100 dark:bg-slate-900 h-24 flex items-center justify-center">
                                {source.dataUrl ? (
                                  <img
                                    src={source.dataUrl}
                                    alt={source.name}
                                    className="w-full h-full object-cover rounded-lg cursor-pointer group-hover/img:scale-105 transition-transform"
                                    onClick={() => setPreviewLightboxItem(source)}
                                  />
                                ) : (
                                  <ImageIcon className="w-8 h-8 text-purple-400" />
                                )}
                                <div
                                  onClick={() => setPreviewLightboxItem(source)}
                                  className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white text-[11px] font-semibold space-x-1"
                                >
                                  <Maximize2 className="w-4 h-4" />
                                  <span>Xem ảnh to</span>
                                </div>
                                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-purple-600/90 text-white font-extrabold text-[9px] shadow-xs">
                                  Trang SGK #{idx + 1}
                                </span>
                              </div>
                              <div className="font-semibold text-slate-800 dark:text-white truncate" title={source.name}>
                                {source.name}
                              </div>
                              <div className="text-[10px] text-slate-400">{source.sizeFormatted} • Hình ảnh bài học</div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center space-x-1.5 mb-1">
                                <span className="px-1.5 py-0.5 rounded-md bg-indigo-600 text-white font-extrabold text-[9px]">
                                  Văn bản #{idx + 1}
                                </span>
                                <span className="text-[10px] text-slate-400">{source.sizeFormatted}</span>
                              </div>
                              <div className="font-semibold text-slate-800 dark:text-white truncate" title={source.name}>
                                {source.name}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 bg-slate-50 dark:bg-slate-700/50 p-1 rounded">
                                {source.textContent?.slice(0, 90)}...
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-700/60">
                            {source.type === 'image' ? (
                              <button
                                type="button"
                                onClick={() => setPreviewLightboxItem(source)}
                                className="text-[11px] text-purple-600 hover:underline flex items-center space-x-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Phóng to</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">Đã nạp nội dung</span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveSource(source.id)}
                              className="text-[11px] text-rose-500 hover:text-rose-700 hover:underline flex items-center space-x-1"
                              title="Xóa trang này"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Xóa</span>
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Selected Library Docs */}
                      {selectedDocIds.map((id) => {
                        const doc = existingDocuments.find((d) => d.id === id);
                        if (!doc) return null;
                        return (
                          <div
                            key={doc.id}
                            className="p-2.5 rounded-xl border border-teal-200/80 dark:border-teal-800/80 bg-teal-50/40 dark:bg-teal-950/30 flex flex-col justify-between text-xs shadow-2xs"
                          >
                            <div>
                              <div className="flex items-center space-x-1.5 mb-1">
                                <span className="px-1.5 py-0.5 rounded-md bg-teal-600 text-white font-extrabold text-[9px]">
                                  Kho tài liệu AI
                                </span>
                              </div>
                              <div className="font-semibold text-teal-900 dark:text-teal-200 truncate" title={doc.title}>
                                {doc.title}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 bg-white/70 dark:bg-slate-800/70 p-1 rounded">
                                {doc.content.slice(0, 80)}...
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-teal-100 dark:border-teal-900/60">
                              <span className="text-[10px] text-teal-600 font-medium">Bản ghi có sẵn</span>
                              <button
                                type="button"
                                onClick={() => handleToggleDoc(doc.id)}
                                className="text-[11px] text-rose-500 hover:text-rose-700 hover:underline flex items-center space-x-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Bỏ chọn</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Prominent Zero-Hallucination & Multi-Source Synthesis Notice */}
                    <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 text-xs text-slate-700 dark:text-slate-200 space-y-1">
                      <div className="flex items-center space-x-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Nguyên Tắc Tạo Đề &amp; Đáp Án Bám Sát Toàn Diện Các Nguồn Đưa Lên:</span>
                      </div>
                      <ul className="text-[11px] list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-300 pl-1">
                        <li>
                          <strong>Kết hợp đa nguồn:</strong> AI sẽ tổng hợp toàn bộ kiến thức từ <strong>{uploadedSources.length + selectedDocIds.length} nguồn tài liệu trên</strong> (các trang sách giáo khoa, bài tập, ghi chú) để biên soạn đề thi.
                        </li>
                        <li>
                          <strong>Tuyệt đối không bịa đặt:</strong> Nghiêm cấm tự ý tạo thêm kiến thức hoặc số liệu ngoài nguồn cung cấp (Zero Hallucination). Mọi câu hỏi và đáp số đều phải có căn cứ 100% từ tài liệu.
                        </li>
                        <li>
                          <strong>Minh bạch trích dẫn:</strong> Lời giải chi tiết (explanation) sẽ chỉ rõ trích dẫn căn cứ từ trang/tài liệu nào để học sinh và giáo viên đối chiếu.
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: ĐIỀU CHỈNH SỐ LƯỢNG & DẠNG CÂU HỎI */}
              <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-white flex items-center space-x-1.5">
                    <Sliders className="w-4 h-4 text-teal-600" />
                    <span>3. Tự Điều Chỉnh Số Câu Hỏi &amp; Dạng Câu Hỏi Đề Xuất</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-extrabold border border-amber-500/20">
                    <Award className="w-3.5 h-3.5" />
                    <span>Thang điểm tổng: 10.0</span>
                  </span>
                </div>

                {/* Live Scoring Banner */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-purple-500/10 border border-teal-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5 text-slate-700 dark:text-slate-200">
                    <div className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                      10
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white">
                        Thang điểm tổng toàn bài: 10.0 điểm
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Với {questionCount} câu hỏi, mỗi câu được phân bổ khoảng{' '}
                        <strong className="text-teal-600 dark:text-teal-400 font-extrabold">
                          {(10 / questionCount).toFixed(2)} điểm
                        </strong>{' '}
                        (tổng toàn bài đạt đúng 10.0đ).
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:block text-right">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                      Quy chuẩn
                    </span>
                    <span className="font-extrabold text-teal-700 dark:text-teal-300 text-xs">
                      10.0 / 10.0
                    </span>
                  </div>
                </div>

                {/* Sub-item: Number of Questions */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Số lượng câu hỏi trong đề:{' '}
                      <strong className="text-teal-600 dark:text-teal-400 text-sm font-extrabold">
                        {questionFormat === 'mixed' ? mixedTotalQuestions : questionCount} câu
                      </strong>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {questionFormat === 'mixed'
                        ? '(Tự động tính từ số câu từng dạng bạn cấu hình)'
                        : '(Tự điều chỉnh từ 1 đến 30 câu)'}
                    </span>
                  </div>

                  {/* Preset Chips */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[3, 5, 10, 15, 20, 25, 30].map((cnt) => {
                      const isActive = (questionFormat === 'mixed' ? mixedTotalQuestions : questionCount) === cnt;
                      return (
                        <button
                          key={cnt}
                          type="button"
                          id={`preset-count-${cnt}`}
                          onClick={() => {
                            if (questionFormat === 'mixed') {
                              handleApplyPresetInMixed(cnt);
                            } else {
                              setQuestionCount(cnt);
                            }
                          }}
                          className={`px-3 py-1 rounded-xl font-bold text-xs transition-all ${
                            isActive
                              ? 'bg-teal-600 text-white shadow-2xs ring-2 ring-teal-500/20'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-teal-50 dark:hover:bg-teal-950/30'
                          }`}
                        >
                          {cnt} câu ({cnt === 5 ? '15p' : cnt === 10 ? '45p' : `${(10 / cnt).toFixed(2)}đ/câu`})
                        </button>
                      );
                    })}
                  </div>

                  {/* Slider */}
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={questionFormat === 'mixed' ? mixedTotalQuestions : questionCount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (questionFormat === 'mixed') {
                        handleApplyPresetInMixed(val);
                      } else {
                        setQuestionCount(val);
                      }
                    }}
                    className="w-full accent-teal-600 cursor-pointer"
                    id="slider-question-count"
                  />
                </div>

                {/* Sub-item: Question Format Suggestions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Dạng câu hỏi được đề xuất theo yêu cầu:
                    </label>
                    <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                      Bám sát nội dung đưa lên
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {/* Format 1: Trắc nghiệm 4 lựa chọn */}
                    <button
                      type="button"
                      id="btn-format-mc"
                      onClick={() => setQuestionFormat('multiple_choice')}
                      className={`text-left p-3 rounded-2xl border-2 transition-all flex items-start space-x-2.5 ${
                        questionFormat === 'multiple_choice'
                          ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 shadow-xs ring-2 ring-teal-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        A
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white text-xs">
                          Trắc nghiệm (A, B, C, D)
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          4 lựa chọn có 1 đáp án đúng chuẩn SGK, có lời giải bám sát tài liệu
                        </p>
                      </div>
                    </button>

                    {/* Format 2: Trả lời ngắn */}
                    <button
                      type="button"
                      id="btn-format-sa"
                      onClick={() => setQuestionFormat('short_answer')}
                      className={`text-left p-3 rounded-2xl border-2 transition-all flex items-start space-x-2.5 ${
                        questionFormat === 'short_answer'
                          ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 shadow-xs ring-2 ring-sky-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        <Hash className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white text-xs">
                          Trả lời ngắn (Chuẩn mới 2026)
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          Học sinh tự giải &amp; điền số/từ khóa đáp số chính xác từ tài liệu
                        </p>
                      </div>
                    </button>

                    {/* Format 3: Trắc nghiệm Đúng / Sai */}
                    <button
                      type="button"
                      id="btn-format-tf"
                      onClick={() => setQuestionFormat('true_false')}
                      className={`text-left p-3 rounded-2xl border-2 transition-all flex items-start space-x-2.5 ${
                        questionFormat === 'true_false'
                          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        ✓
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white text-xs">
                          Trắc nghiệm Đúng / Sai
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          Đánh giá tư duy lập luận mệnh đề theo chuẩn Bộ GD&amp;ĐT
                        </p>
                      </div>
                    </button>

                    {/* Format 4: Tự luận */}
                    <button
                      type="button"
                      id="btn-format-essay"
                      onClick={() => setQuestionFormat('essay')}
                      className={`text-left p-3 rounded-2xl border-2 transition-all flex items-start space-x-2.5 ${
                        questionFormat === 'essay'
                          ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 shadow-xs ring-2 ring-purple-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        ✎
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white text-xs">
                          Tự luận &amp; Barem điểm
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          Bài giải toán/phân tích chi tiết kèm thang điểm chấm chuẩn
                        </p>
                      </div>
                    </button>

                    {/* Format 5: Hỗn hợp Đa dạng */}
                    <button
                      type="button"
                      id="btn-format-mixed"
                      onClick={() => setQuestionFormat('mixed')}
                      className={`text-left p-3 rounded-2xl border-2 transition-all flex items-start space-x-2.5 sm:col-span-2 lg:col-span-2 ${
                        questionFormat === 'mixed'
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-xs ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        ★
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-800 dark:text-white text-xs">
                            Hỗn hợp Đa dạng (Tự chọn số câu từng dạng)
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                            Khuyên dùng
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          Tự do thiết lập số câu riêng biệt cho Trắc nghiệm, Trả lời ngắn, Đúng/Sai, Tự luận
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Multi-Format Custom Matrix Configuration (when mixed is active) */}
                  {questionFormat === 'mixed' && (
                    <div className="mt-3.5 p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3 shadow-xs">
                      {/* Section Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-indigo-100 dark:border-indigo-900/60">
                        <div>
                          <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center space-x-1.5">
                            <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Thiết lập số câu hỏi cho từng dạng:</span>
                          </div>
                          <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                            Bấm <strong className="font-bold">[ + ]</strong> hoặc <strong className="font-bold">[ - ]</strong> để tăng/giảm số lượng câu hỏi của từng dạng.
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                            {selectedCustomFormats.length}/4 dạng được chọn
                          </span>
                          <span className="text-xs font-extrabold px-3 py-1 rounded-xl bg-indigo-600 text-white shadow-xs">
                            Tổng: {mixedTotalQuestions} câu
                          </span>
                        </div>
                      </div>

                      {/* Format Cards with Stepper Controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {[
                          {
                            id: 'multiple_choice' as const,
                            label: 'Trắc nghiệm ABCD',
                            badge: '4 lựa chọn',
                            desc: '1 đáp án đúng chuẩn SGK',
                            iconLetter: 'A',
                          },
                          {
                            id: 'short_answer' as const,
                            label: 'Trả lời ngắn',
                            badge: 'Chuẩn mới 2026',
                            desc: 'Tự tính & điền đáp số/từ khóa',
                            iconNode: <Hash className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />,
                          },
                          {
                            id: 'true_false' as const,
                            label: 'Đúng / Sai',
                            badge: 'Mệnh đề',
                            desc: 'Nhận định Đúng/Sai chuẩn Bộ',
                            iconNode: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
                          },
                          {
                            id: 'essay' as const,
                            label: 'Tự luận',
                            badge: 'Barem điểm',
                            desc: 'Trình bày giải chi tiết kèm barem',
                            iconNode: <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
                          },
                        ].map((fmt) => {
                          const isChecked = selectedCustomFormats.includes(fmt.id);
                          const count = formatCounts[fmt.id] || 0;
                          const estPoint =
                            mixedTotalQuestions > 0 ? ((count / mixedTotalQuestions) * 10).toFixed(1) : '0';

                          return (
                            <div
                              key={fmt.id}
                              className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between space-y-2.5 ${
                                isChecked
                                  ? 'bg-white dark:bg-slate-800 border-indigo-400 dark:border-indigo-600 shadow-xs ring-1 ring-indigo-400/20'
                                  : 'bg-white/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/70 opacity-75 hover:opacity-90'
                              }`}
                            >
                              {/* Header: Toggle Checkbox + Title + Badge */}
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFormat(fmt.id)}
                                  className="flex items-start space-x-2 text-left flex-1"
                                  id={`toggle-fmt-${fmt.id}`}
                                >
                                  <div
                                    className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center transition-all ${
                                      isChecked
                                        ? 'bg-indigo-600 text-white shadow-2xs'
                                        : 'border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                                    }`}
                                  >
                                    {isChecked && <CheckSquare className="w-3.5 h-3.5" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-1.5">
                                      <span className="font-bold text-xs text-slate-800 dark:text-white">
                                        {fmt.label}
                                      </span>
                                      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                        {fmt.badge}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                                      {fmt.desc}
                                    </p>
                                  </div>
                                </button>

                                {/* Point preview if active */}
                                {isChecked && (
                                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                                    ~{estPoint} đ
                                  </span>
                                )}
                              </div>

                              {/* Stepper Controls */}
                              {isChecked ? (
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
                                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                    Số câu dạng này:
                                  </span>
                                  <div className="flex items-center space-x-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateFormatCount(fmt.id, -1)}
                                      disabled={count <= 1}
                                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                      title="Giảm 1 câu"
                                      id={`btn-dec-${fmt.id}`}
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>

                                    <div className="relative">
                                      <input
                                        type="number"
                                        min={1}
                                        max={30}
                                        value={count}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (!isNaN(val)) {
                                            handleSetExactFormatCount(fmt.id, val);
                                          }
                                        }}
                                        className="w-14 py-1 text-center font-mono font-extrabold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/50 rounded-lg border border-indigo-200 dark:border-indigo-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        id={`input-count-${fmt.id}`}
                                      />
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleUpdateFormatCount(fmt.id, 1)}
                                      disabled={count >= 25}
                                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                      title="Tăng 1 câu"
                                      id={`btn-inc-${fmt.id}`}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleFormat(fmt.id)}
                                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                                    id={`btn-activate-${fmt.id}`}
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Chọn dạng này (+2 câu)</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Live Matrix Summary Footnote */}
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-800/95 border border-indigo-100 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400">📊 Ma trận đề:</span>
                          {selectedCustomFormats.map((f, i) => {
                            const c = formatCounts[f] || 0;
                            const p =
                              mixedTotalQuestions > 0 ? ((c / mixedTotalQuestions) * 10).toFixed(1) : '0';
                            const name =
                              f === 'multiple_choice'
                                ? 'Trắc nghiệm'
                                : f === 'short_answer'
                                ? 'Trả lời ngắn'
                                : f === 'true_false'
                                ? 'Đúng/Sai'
                                : 'Tự luận';
                            return (
                              <span key={f} className="inline-flex items-center">
                                <strong className="font-bold text-slate-800 dark:text-white mx-0.5">
                                  {c} {name}
                                </strong>
                                <span className="text-slate-400 text-[11px]">({p}đ)</span>
                                {i < selectedCustomFormats.length - 1 && (
                                  <span className="mx-1 text-slate-400">+</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                        <div className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          Tổng {mixedTotalQuestions} câu = 10.0 điểm
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sub-item: Difficulty */}
                <div className="pt-1">
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">
                    Mức độ nhận thức đề thi:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'balanced', label: 'Ma trận chuẩn Bộ (40-30-20-10)' },
                      { id: 'easy', label: 'Cơ bản (Nhận biết - Thông hiểu)' },
                      { id: 'hard', label: 'Nâng cao (Vận dụng - Phân hóa)' },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDifficulty(d.id as any)}
                        className={`p-2 rounded-xl border text-center font-medium transition-all ${
                          difficulty === d.id
                            ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* STEP 2: PREVIEW GENERATED QUESTIONS */
            <div className="space-y-4 animate-fadeIn">
              {/* Header & Mode Switcher */}
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center space-x-2">
                      <span>Đã Tạo {generatedQuestions.length} Câu Hỏi Cho Lớp {currentClass}</span>
                      <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-extrabold">
                        Thang điểm 10.0
                      </span>
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">
                      {generatedQuestions
                        .map((q) => q.type)
                        .filter((v, i, a) => a.indexOf(v) === i)
                        .map((t) => {
                          const cnt = generatedQuestions.filter((q) => q.type === t).length;
                          const label =
                            t === 'multiple_choice'
                              ? 'Trắc nghiệm'
                              : t === 'short_answer'
                              ? 'Trả lời ngắn'
                              : t === 'true_false'
                              ? 'Đúng/Sai'
                              : 'Tự luận';
                          return `${cnt} ${label}`;
                        })
                        .join(' • ')}{' '}
                      • Tổng cộng: chuẩn 10.0 điểm
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditingMode((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      isEditingMode
                        ? 'bg-amber-500 text-white border-amber-600 shadow-2xs font-bold'
                        : 'bg-white dark:bg-slate-800 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40'
                    }`}
                    title="Bật/Tắt chế độ chỉnh sửa trực tiếp tất cả câu hỏi trong đề thi"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingMode ? 'Đang sửa (Bật)' : 'Sửa nội dung (Beta)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('input')}
                    className="px-3 py-1.5 rounded-xl border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-xs font-semibold flex items-center space-x-1 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Điều chỉnh lại</span>
                  </button>
                </div>
              </div>

              {/* View / Edit Mode Switcher Tabs */}
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewTab('edit');
                      setIsEditingMode(true);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      previewTab === 'edit' || isEditingMode
                        ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs border border-slate-200 dark:border-slate-600'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>✏️ Sửa nội dung (Inline Edit)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewTab('render');
                      setIsEditingMode(false);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      previewTab === 'render' && !isEditingMode
                        ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs border border-slate-200 dark:border-slate-600'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>👁️ Xem trước công thức (Math/Chem)</span>
                  </button>
                </div>

                <div className="hidden md:flex items-center space-x-1 text-[11px] text-slate-500 dark:text-slate-400 pr-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Hỗ trợ Toán: <code>$x^2$</code>, <code>\frac&#123;a&#125;&#123;b&#125;</code> | Hóa: <code>H2SO4</code>, <code>Fe3+</code></span>
                </div>
              </div>

              {/* Formula Guidance Tip Box */}
              {(previewTab === 'edit' || isEditingMode) && (
                <div className="px-3.5 py-2 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/60 text-[11px] text-purple-900 dark:text-purple-200 flex items-start space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Cú pháp gõ công thức Toán &amp; Hóa nhanh:</strong>
                    <span className="ml-1 text-purple-800 dark:text-purple-300">
                      Toán: kẹp dấu <code>$x^2 + y^2 = z^2$</code>, phân số <code>\frac&#123;a&#125;&#123;b&#125;</code>, căn <code>\sqrt&#123;x&#125;</code>.
                      Hóa: gõ trực tiếp <code>H2SO4</code> (tự thành H₂SO₄), <code>Fe3+</code> (tự thành Fe³⁺), <code>SO4 2-</code> (tự thành SO₄²⁻).
                      Bấm nút "👁️ Xem trước công thức" để kiểm tra hiển thị.
                    </span>
                  </div>
                </div>
              )}

              {/* Questions List */}
              <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                {generatedQuestions.map((q, idx) => {
                  const isCardEditing = isEditingMode || previewTab === 'edit' || !!editingQuestionIds[q.id];

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 relative group ${
                        isCardEditing
                          ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs hover:border-teal-300 dark:hover:border-teal-700'
                          : 'bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-800 dark:to-purple-950/20 border-purple-200/80 dark:border-purple-800/60 shadow-2xs'
                      }`}
                    >
                      {/* Question Header & Controls */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="w-6 h-6 rounded-lg bg-teal-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {idx + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                            {q.type === 'multiple_choice'
                              ? 'Trắc nghiệm ABCD'
                              : q.type === 'short_answer'
                              ? 'Trả lời ngắn'
                              : q.type === 'true_false'
                              ? 'Đúng / Sai'
                              : 'Tự luận'}
                          </span>

                          {/* Editable Points */}
                          {isCardEditing ? (
                            <div className="flex items-center space-x-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">+</span>
                              <input
                                type="number"
                                step="0.25"
                                min="0.25"
                                max="10"
                                value={q.points || (10 / generatedQuestions.length).toFixed(2)}
                                onChange={(e) => handleUpdatePoints(q.id, parseFloat(e.target.value) || 0)}
                                className="w-12 text-center bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded text-[11px] font-bold text-amber-900 dark:text-amber-200 p-0.5 focus:outline-hidden"
                              />
                              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">đ</span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                              +{q.points || (10 / generatedQuestions.length).toFixed(2)} điểm
                            </span>
                          )}

                          {/* Editable Difficulty */}
                          {isCardEditing ? (
                            <select
                              value={q.difficulty || 'medium'}
                              onChange={(e) => handleUpdateDifficulty(q.id, e.target.value as any)}
                              className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-[10px] font-bold text-slate-700 dark:text-slate-300 p-0.5 focus:outline-hidden"
                            >
                              <option value="easy">Độ khó: Dễ</option>
                              <option value="medium">Độ khó: Vừa</option>
                              <option value="hard">Độ khó: Khó</option>
                            </select>
                          ) : (
                            <span className="text-slate-400 text-[11px]">
                              Độ khó: {q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'hard' ? 'Khó' : 'Trung bình'}
                            </span>
                          )}
                        </div>

                        {/* Per-Card Actions: Pencil Edit ✏️ & Trash Can 🗑️ */}
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleEditQuestion(q.id)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 border ${
                              isCardEditing
                                ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                                : 'bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/40 border-slate-200 dark:border-slate-600'
                            }`}
                            title={isCardEditing ? 'Đang chỉnh sửa (Bấm lại để xem trước)' : 'Bấm biểu tượng cây bút để sửa câu hỏi, 4 đáp án & lời giải'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-bold">{isCardEditing ? 'Đang sửa' : 'Chỉnh sửa'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent"
                            title="Xóa câu này (tự động điều chỉnh điểm số câu còn lại đủ 10đ)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Question Content */}
                      {isCardEditing ? (
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            Nội dung câu hỏi:
                          </label>
                          <textarea
                            rows={2}
                            value={q.content}
                            onChange={(e) => handleUpdateQuestionContent(q.id, e.target.value)}
                            placeholder="Nhập nội dung câu hỏi (hỗ trợ <sub>, <sup> và công thức Toán/Hóa)..."
                            className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden text-slate-800 dark:text-slate-100"
                          />
                        </div>
                      ) : (
                        <div className="font-semibold text-slate-800 dark:text-slate-100 text-xs leading-relaxed">
                          <FormattedMathText text={q.content} />
                        </div>
                      )}

                      {/* Format Options & Answers */}
                      {q.type === 'multiple_choice' && (
                        <div className="space-y-2 pt-1">
                          {isCardEditing && (
                            <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              Chỉnh sửa 4 đáp án (Tích chọn ô tròn để đánh dấu đáp án ĐÚNG):
                            </span>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = oIdx === q.correctAnswer;
                              const optionText = opt.replace(/^[A-D]\.\s*/, '');
                              const labelChar = String.fromCharCode(65 + oIdx);

                              if (isCardEditing) {
                                return (
                                  <div
                                    key={oIdx}
                                    className={`p-1.5 rounded-xl border text-xs flex items-center space-x-2 transition-all ${
                                      isCorrect
                                        ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 font-semibold'
                                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleSelectCorrectAnswer(q.id, oIdx)}
                                      className={`w-6 h-6 rounded-lg font-extrabold text-xs flex items-center justify-center shrink-0 transition-all ${
                                        isCorrect
                                          ? 'bg-teal-600 text-white shadow-xs'
                                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-teal-500 hover:text-white'
                                      }`}
                                      title="Click để chọn đáp án này là ĐÚNG"
                                    >
                                      {labelChar}
                                    </button>
                                    <input
                                      type="text"
                                      value={optionText}
                                      onChange={(e) => handleUpdateQuestionOption(q.id, oIdx, e.target.value)}
                                      placeholder={`Nhập phương án ${labelChar}...`}
                                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden text-slate-800 dark:text-slate-200"
                                    />
                                    {isCorrect && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                                  </div>
                                );
                              } else {
                                return (
                                  <div
                                    key={oIdx}
                                    onClick={() => handleSelectCorrectAnswer(q.id, oIdx)}
                                    className={`px-3 py-2 rounded-xl border text-xs flex items-start space-x-2 cursor-pointer transition-all ${
                                      isCorrect
                                        ? 'border-teal-500 bg-teal-50/80 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 font-semibold shadow-2xs'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/80 hover:border-teal-300'
                                    }`}
                                    title="Click để chọn đáp án này là ĐÚNG"
                                  >
                                    <span className={`font-extrabold px-1.5 py-0.5 rounded text-[10px] ${isCorrect ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                      {labelChar}
                                    </span>
                                    <div className="flex-1 pt-0.5">
                                      <FormattedMathText text={optionText} />
                                    </div>
                                  </div>
                                );
                              }
                            })}
                          </div>
                        </div>
                      )}

                      {q.type === 'short_answer' && (
                        <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 text-xs border border-sky-200 dark:border-sky-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sky-800 dark:text-sky-300 font-semibold">
                              Đáp số / Từ khóa chuẩn:
                            </span>
                          </div>
                          {isCardEditing ? (
                            <input
                              type="text"
                              value={q.expectedShortAnswer || q.sampleAnswer || ''}
                              onChange={(e) => handleUpdateExpectedAnswer(q.id, e.target.value)}
                              placeholder="Nhập đáp số chính xác (ví dụ: 12.5, H2SO4, 5 m/s)..."
                              className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 rounded-lg text-sky-800 dark:text-sky-200 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                            />
                          ) : (
                            <span className="inline-block px-3 py-1 rounded-lg bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 font-mono font-bold text-xs border border-sky-300 dark:border-sky-700">
                              <FormattedMathText text={q.expectedShortAnswer || q.sampleAnswer || 'Chính xác'} />
                            </span>
                          )}
                        </div>
                      )}

                      {q.type === 'true_false' && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-xs border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Đáp án đúng/sai chuẩn:
                          </span>
                          {isCardEditing ? (
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => handleSelectCorrectAnswer(q.id, 0)}
                                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                                  q.correctAnswer === 0
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                ĐÚNG
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectCorrectAnswer(q.id, 1)}
                                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                                  q.correctAnswer === 1
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                SAI
                              </button>
                            </div>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-md font-bold ${q.correctAnswer === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}`}>
                              {q.correctAnswer === 0 ? 'ĐÚNG' : 'SAI'}
                            </span>
                          )}
                        </div>
                      )}

                      {q.type === 'essay' && (
                        <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 text-xs space-y-1.5 text-purple-900 dark:text-purple-200 border border-purple-200/80">
                          <div className="font-bold text-[11px]">Barem &amp; Lời giải mẫu ({q.points || (10 / generatedQuestions.length).toFixed(2)}đ):</div>
                          {isCardEditing ? (
                            <textarea
                              rows={3}
                              value={q.sampleAnswer || ''}
                              onChange={(e) => handleUpdateExpectedAnswer(q.id, e.target.value)}
                              placeholder="Nhập barem chấm điểm và bài giải mẫu..."
                              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg text-purple-900 dark:text-purple-200 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                            />
                          ) : (
                            <div className="whitespace-pre-line text-xs">
                              <FormattedMathText text={q.sampleAnswer || ''} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Explanation */}
                      {isCardEditing ? (
                        <div className="space-y-1 pt-1">
                          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            Lời giải / Giải thích chi tiết:
                          </label>
                          <textarea
                            rows={2}
                            value={q.explanation || ''}
                            onChange={(e) => handleUpdateExplanation(q.id, e.target.value)}
                            placeholder="Nhập hướng dẫn giải chi tiết cho câu hỏi này..."
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden text-slate-700 dark:text-slate-300"
                          />
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <strong>Lời giải bám sát tài liệu: </strong>
                          <FormattedMathText text={q.explanation || ''} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Đóng
          </button>

          {step === 'input' ? (
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateExam}
              className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-purple-600 hover:from-teal-700 hover:to-purple-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{generationStepText || 'Đang biên soạn đề thi...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>AI Tạo Đề Thi ({questionCount} câu - Lớp {currentClass})</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalizeSave}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lưu &amp; Xuất Bản Đề Thi Cho Lớp {currentClass}</span>
            </button>
          )}
        </div>
      </div>

      {/* LIGHTBOX MODAL TO VIEW UPLOADED TEXTBOOK IMAGE IN HIGH RESOLUTION */}
      {previewLightboxItem && previewLightboxItem.dataUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPreviewLightboxItem(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-xs truncate max-w-xs sm:max-w-md">
                  {previewLightboxItem.name}
                </span>
                <span className="text-[10px] text-slate-400">({previewLightboxItem.sizeFormatted})</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewLightboxItem(null)}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 overflow-auto max-h-[calc(90vh-60px)] flex items-center justify-center bg-slate-950">
              <img
                src={previewLightboxItem.dataUrl}
                alt={previewLightboxItem.name}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
