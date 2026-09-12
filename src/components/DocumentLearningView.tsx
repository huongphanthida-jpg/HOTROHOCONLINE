import React, { useState } from 'react';
import { DocumentLearning, Question, StudentInfo, UploadedSourceItem } from '../types';
import {
  Upload,
  FileText,
  Sparkles,
  BookOpen,
  Brain,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Trash2,
  PlusCircle,
  AlertCircle,
  Image as ImageIcon,
  Eye,
  Maximize2,
  ShieldCheck,
  Plus,
  RefreshCw,
  X,
  FileCheck,
  Layers,
  HelpCircle,
  Check,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { summarizeTheoryDocument, generateQuestionsFromDoc } from '../services/aiService';
import { exportDocumentToPowerPointPptx, exportToMoodleGIFT, exportExamToWordDocx } from '../utils/exportUtils';

// Helpers to read files
function readFileAsBase64(file: File): Promise<{ dataUrl: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.includes('base64,') ? dataUrl.split('base64,')[1] : dataUrl;
      resolve({ dataUrl, base64 });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function readFileSliceAsText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = () => resolve('');
    reader.readAsText(file.slice(0, 10000));
  });
}

interface DocumentLearningViewProps {
  documents: DocumentLearning[];
  onSaveDocument: (doc: DocumentLearning) => void;
  onDeleteDocument: (docId: string) => void;
  onStartExamFromQuestions: (title: string, questions: Question[]) => void;
  onSyncToSubjects?: (doc: DocumentLearning, targetClass: string, grade: string, customTitle: string) => void;
}

export const DocumentLearningView: React.FC<DocumentLearningViewProps> = ({
  documents,
  onSaveDocument,
  onDeleteDocument,
  onStartExamFromQuestions,
  onSyncToSubjects,
}) => {
  const [selectedDoc, setSelectedDoc] = useState<DocumentLearning | null>(
    documents.length > 0 ? documents[0] : null
  );

  // Deletion modal state
  const [docToDelete, setDocToDelete] = useState<DocumentLearning | null>(null);

  // Sync modal state
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncTargetClass, setSyncTargetClass] = useState('12D1');
  const [customSyncClass, setCustomSyncClass] = useState('');
  const [syncGrade, setSyncGrade] = useState('12');
  const [syncTitle, setSyncTitle] = useState('');
  const [syncSuccessToast, setSyncSuccessToast] = useState(false);

  // New Document Multi-Source State
  const [isCreating, setIsCreating] = useState(false);
  const [inputTitle, setInputTitle] = useState('');
  const [inputContent, setInputContent] = useState('');
  const [uploadedSources, setUploadedSources] = useState<UploadedSourceItem[]>([]);
  const [previewLightboxItem, setPreviewLightboxItem] = useState<UploadedSourceItem | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

  // Auto-generate quiz on saving
  const [autoCreateQuiz, setAutoCreateQuiz] = useState(true);
  const [quizQuestionCount, setQuizQuestionCount] = useState(5);
  const [quizFormat, setQuizFormat] = useState<'multiple_choice' | 'short_answer' | 'true_false' | 'essay' | 'mixed'>('multiple_choice');
  const [quizDifficulty, setQuizDifficulty] = useState<'balanced' | 'easy' | 'medium' | 'hard'>('balanced');

  // Custom Quiz Re-Generation Modal (when viewing saved document)
  const [isCustomQuizModalOpen, setIsCustomQuizModalOpen] = useState(false);
  const [customReGenCount, setCustomReGenCount] = useState(5);
  const [customReGenFormat, setCustomReGenFormat] = useState<'multiple_choice' | 'short_answer' | 'true_false' | 'essay' | 'mixed'>('multiple_choice');
  const [customReGenDifficulty, setCustomReGenDifficulty] = useState<'balanced' | 'easy' | 'medium' | 'hard'>('balanced');

  // AI Loading states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const handleConfirmDeleteDoc = () => {
    if (!docToDelete) return;
    onDeleteDocument(docToDelete.id);
    if (selectedDoc?.id === docToDelete.id) {
      setSelectedDoc(null);
      setIsCreating(true);
    }
    setDocToDelete(null);
  };

  // Process files (multi-file upload & drag-drop)
  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessingFiles(true);
    setAnalysisError('');

    const newItems: UploadedSourceItem[] = [];
    const fileArray = Array.from(files);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const isImg = ['jpg', 'jpeg', 'png', 'webp'].includes(extension) || file.type.startsWith('image/');
      const sizeMb = file.size / (1024 * 1024);
      const sizeFormatted = sizeMb >= 1 ? `${sizeMb.toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
      const currentImagesCount =
        uploadedSources.filter((s) => s.type === 'image').length + newItems.filter((s) => s.type === 'image').length;

      if (isImg) {
        try {
          const { dataUrl, base64 } = await readFileAsBase64(file);
          newItems.push({
            id: `src-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            type: 'image',
            sizeFormatted,
            mimeType: file.type || 'image/jpeg',
            dataUrl,
            base64Data: base64,
            pageIndex: currentImagesCount + 1,
            textContent: `[Ảnh chụp SGK: ${file.name} - Trang #${currentImagesCount + 1}]`,
          });
        } catch (err) {
          console.error('Error reading image file:', err);
        }
      } else if (file.type.startsWith('text/') || extension === 'txt' || extension === 'md' || extension === 'json') {
        try {
          const text = await readFileAsText(file);
          newItems.push({
            id: `src-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            type: 'text',
            sizeFormatted,
            textContent: text,
          });
        } catch (err) {
          console.error('Error reading text file:', err);
        }
      } else {
        // PDF or Word docs
        try {
          const partialText = await readFileSliceAsText(file);
          const docType = extension === 'pdf' ? 'Tài liệu PDF' : 'Tài liệu Word';
          newItems.push({
            id: `src-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            type: 'document',
            sizeFormatted,
            textContent: `[${docType} SGK: ${file.name} - Dung lượng: ${sizeFormatted}]\n${
              partialText
                ? `Trích xuất sơ lược:\n${partialText.slice(0, 3000)}`
                : 'Tài liệu học tập chuẩn SGK chứa lý thuyết, công thức và ví dụ minh họa phục vụ ra đề thi.'
            }`,
          });
        } catch (err) {
          console.error('Error reading doc file:', err);
        }
      }
    }

    if (newItems.length > 0) {
      setUploadedSources((prev) => [...prev, ...newItems]);
      if (!inputTitle) {
        const cleanName = newItems[0].name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setInputTitle(`Chuyên đề: ${cleanName}`);
      }
    }

    setIsProcessingFiles(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleRemoveSource = (id: string) => {
    setUploadedSources((prev) => prev.filter((s) => s.id !== id));
  };

  const handleClearAllSources = () => {
    setUploadedSources([]);
  };

  // Nạp thử 2 trang SGK mẫu (Trang 1: Khái niệm & Định lý - Trang 2: Công thức đạo hàm cấp hai & Ví dụ)
  const handleLoadSampleSources = () => {
    const sampleImg1 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" style="background:%23f8fafc;font-family:sans-serif;"><rect width="100%" height="100%" fill="%23ffffff"/><rect x="20" y="20" width="560" height="760" rx="8" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="2"/><text x="40" y="60" font-size="20" font-weight="bold" fill="%230f172a">SÁCH GIÁO KHOA TOÁN 12 - TRANG 24</text><text x="40" y="90" font-size="14" fill="%230284c7" font-weight="bold">BÀI 2: CỰC TRỊ CỦA HÀM SỐ (LÝ THUYẾT &amp; ĐỊNH LÝ)</text><line x1="40" y1="105" x2="560" y2="105" stroke="%23e2e8f0" stroke-width="1.5"/><text x="40" y="140" font-size="13" font-weight="bold" fill="%23334155">1. Khái niệm cực đại, cực tiểu:</text><text x="40" y="170" font-size="12" fill="%23475569">- Cho hàm số y = f(x) xác định và liên tục trên khoảng (a; b).</text><text x="40" y="195" font-size="12" fill="%23475569">- Điểm x0 là điểm cực đại nếu f(x) &lt; f(x0) với mọi x trong lân cận.</text><text x="40" y="220" font-size="12" fill="%23475569">- Điểm x0 là điểm cực tiểu nếu f(x) &gt; f(x0) với mọi x trong lân cận.</text><text x="40" y="260" font-size="13" font-weight="bold" fill="%23334155">2. Định lý 1 (Dấu hiệu đổi dấu của đạo hàm f\'(x)):</text><text x="40" y="290" font-size="12" fill="%23475569">- Nếu f\'(x) đổi dấu từ DƯƠNG sang ÂM qua x0: x0 là điểm CỰC ĐẠI.</text><text x="40" y="315" font-size="12" fill="%23475569">- Nếu f\'(x) đổi dấu từ ÂM sang DƯƠNG qua x0: x0 là điểm CỰC TIỂU.</text><text x="40" y="340" font-size="12" fill="%23475569">- Nếu f\'(x) không đổi dấu qua x0: hàm số KHÔNG có cực trị tại x0.</text><rect x="40" y="370" width="520" height="120" rx="6" fill="%23f0fdf4" stroke="%2386efac"/><text x="60" y="400" font-size="12" font-weight="bold" fill="%23166534">Ghi chú quan trọng từ SGK:</text><text x="60" y="425" font-size="12" fill="%2315803d">Điểm cực trị x0 luôn phải thuộc tập xác định D của hàm số.</text><text x="60" y="450" font-size="12" fill="%2315803d">Giá trị cực đại y_CD = f(x0), giá trị cực tiểu y_CT = f(x0).</text><text x="40" y="740" font-size="11" fill="%2394a3b8">Bộ GD&amp;ĐT - Sách Giáo Khoa Giải Tích 12 - Trang 24</text></svg>`;

    const sampleImg2 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" style="background:%23f8fafc;font-family:sans-serif;"><rect width="100%" height="100%" fill="%23ffffff"/><rect x="20" y="20" width="560" height="760" rx="8" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="2"/><text x="40" y="60" font-size="20" font-weight="bold" fill="%230f172a">SÁCH GIÁO KHOA TOÁN 12 - TRANG 25</text><text x="40" y="90" font-size="14" fill="%230284c7" font-weight="bold">BÀI 2: CỰC TRỊ CỦA HÀM SỐ (QUY TẮC ĐẠO HÀM CẤP HAI &amp; BÀI TẬP)</text><line x1="40" y1="105" x2="560" y2="105" stroke="%23e2e8f0" stroke-width="1.5"/><text x="40" y="140" font-size="13" font-weight="bold" fill="%23334155">3. Định lý 2 (Quy tắc II dùng đạo hàm cấp hai f\'\'(x)):</text><text x="40" y="170" font-size="12" fill="%23475569">- Bước 1: Tính f\'(x) và tìm nghiệm của f\'(x) = 0.</text><text x="40" y="195" font-size="12" fill="%23475569">- Bước 2: Tính f\'\'(x) tại nghiệm x0:</text><text x="60" y="220" font-size="12" fill="%230369a1">+ Nếu f\'\'(x0) &lt; 0 ==&gt; x0 là điểm CỰC ĐẠI.</text><text x="60" y="245" font-size="12" fill="%230369a1">+ Nếu f\'\'(x0) &gt; 0 ==&gt; x0 là điểm CỰC TIỂU.</text><text x="40" y="290" font-size="13" font-weight="bold" fill="%23334155">4. Ví dụ mẫu áp dụng SGK:</text><text x="40" y="320" font-size="12" fill="%23475569">Tìm cực trị của hàm số bậc ba: y = x^3 - 3x^2 + 2</text><text x="60" y="345" font-size="12" fill="%23475569">+ Tập xác định: D = R</text><text x="60" y="370" font-size="12" fill="%23475569">+ f\'(x) = 3x^2 - 6x = 3x(x - 2) = 0 &lt;=&gt; x = 0 hoặc x = 2</text><text x="60" y="395" font-size="12" fill="%23475569">+ f\'\'(x) = 6x - 6</text><text x="60" y="420" font-size="12" fill="%23475569">+ f\'\'(0) = -6 &lt; 0 ==&gt; Hàm số đạt cực đại tại x = 0, y_CD = 2</text><text x="60" y="445" font-size="12" fill="%23475569">+ f\'\'(2) = 6 &gt; 0 ==&gt; Hàm số đạt cực tiểu tại x = 2, y_CT = -2</text><rect x="40" y="480" width="520" height="90" rx="6" fill="%23fffbeb" stroke="%23fde68a"/><text x="60" y="510" font-size="12" font-weight="bold" fill="%23b45309">Công thức giải nhanh cực trị hàm bậc ba y = ax^3 + bx^2 + cx + d:</text><text x="60" y="535" font-size="12" fill="%2392400e">Có 2 cực trị khi và chỉ khi b^2 - 3ac &gt; 0. Khoảng cách giữa 2 điểm cực trị.</text><text x="40" y="740" font-size="11" fill="%2394a3b8">Bộ GD&amp;ĐT - Sách Giáo Khoa Giải Tích 12 - Trang 25</text></svg>`;

    const sample1: UploadedSourceItem = {
      id: `sample-sgk-1`,
      name: 'SGK_Toan12_Trang24_DinhLyCucTri.png',
      type: 'image',
      sizeFormatted: '1.2 MB',
      mimeType: 'image/svg+xml',
      dataUrl: sampleImg1,
      pageIndex: 1,
      textContent:
        'Nội dung Trang 24 SGK Giải Tích 12:\n- Định nghĩa điểm cực đại x0: f(x) < f(x0) trong lân cận.\n- Định nghĩa điểm cực tiểu x0: f(x) > f(x0) trong lân cận.\n- Định lý 1: f\'(x) đổi dấu từ dương sang âm thì x0 là cực đại; đổi dấu từ âm sang dương thì x0 là cực tiểu.\n- Chú ý: Điểm cực trị x0 luôn phải thuộc tập xác định D của hàm số. Giá trị cực đại y_CD, cực tiểu y_CT.',
    };

    const sample2: UploadedSourceItem = {
      id: `sample-sgk-2`,
      name: 'SGK_Toan12_Trang25_QuyTacDaoHamCapHai.png',
      type: 'image',
      sizeFormatted: '1.5 MB',
      mimeType: 'image/svg+xml',
      dataUrl: sampleImg2,
      pageIndex: 2,
      textContent:
        'Nội dung Trang 25 SGK Giải Tích 12:\n- Định lý 2 (Quy tắc II): Nếu f\'(x0) = 0 và f\'\'(x0) < 0 thì x0 là điểm cực đại. Nếu f\'(x0) = 0 và f\'\'(x0) > 0 thì x0 là điểm cực tiểu.\n- Ví dụ SGK: Hàm số y = x^3 - 3x^2 + 2 có f\'(x) = 3x^2 - 6x = 0 <=> x=0 hoặc x=2. f\'\'(0) = -6 < 0 (Cực đại x=0, y_CD=2), f\'\'(2) = 6 > 0 (Cực tiểu x=2, y_CT=-2).\n- Công thức hàm số bậc ba có 2 cực trị <=> b^2 - 3ac > 0.',
    };

    setUploadedSources([sample1, sample2]);
    setInputTitle('Chuyên đề Cực trị Hàm số - SGK Giải tích 12 (Trang 24 & 25)');
  };

  // Submit and analyze multi-source document with Zero-Hallucination mandate
  const handleAnalyzeAndSave = async () => {
    if (!inputTitle.trim()) {
      setAnalysisError('Vui lòng nhập tên tài liệu hoặc bài học.');
      return;
    }
    if (uploadedSources.length === 0 && !inputContent.trim()) {
      setAnalysisError('Vui lòng tải lên các nguồn tài liệu (ảnh trang SGK, tệp Word/PDF) hoặc nhập nội dung lý thuyết.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError('');

    try {
      // 1. Tổng hợp nội dung từ tất cả các nguồn đưa lên
      let combinedContent = '';
      if (uploadedSources.length > 0) {
        combinedContent = uploadedSources
          .map((src, idx) => {
            const prefix =
              src.type === 'image'
                ? `=== NGUỒN TÀI LIỆU #${idx + 1}: TRANG ẢNH SÁCH GIÁO KHOA (${src.name} - Trang #${src.pageIndex || idx + 1}) ===`
                : `=== NGUỒN TÀI LIỆU #${idx + 1}: TỆP VĂN BẢN / TÀI LIỆU (${src.name}) ===`;
            return `${prefix}\n${src.textContent || ''}`;
          })
          .join('\n\n');
      }
      if (inputContent.trim()) {
        combinedContent += `\n\n=== GHI CHÚ BỔ SUNG CỦA GIÁO VIÊN ===\n${inputContent.trim()}`;
      }

      const sourceItemsSummary = uploadedSources
        .map(
          (s, idx) =>
            `- Nguồn #${idx + 1}: ${s.name} (${
              s.type === 'image' ? `Ảnh chụp Trang SGK #${s.pageIndex || idx + 1}` : 'Tệp tài liệu văn bản'
            }, ${s.sizeFormatted})`
        )
        .join('\n');

      const imagesToSend = uploadedSources
        .filter((s) => s.type === 'image' && s.base64Data)
        .map((s) => ({
          mimeType: s.mimeType || 'image/jpeg',
          data: s.base64Data!,
          title: s.name,
          pageIndex: s.pageIndex,
        }));

      // 2. Phân tích & tóm tắt lý thuyết đa nguồn
      const aiResult = await summarizeTheoryDocument(
        inputTitle,
        combinedContent,
        imagesToSend.length > 0 ? imagesToSend : undefined,
        sourceItemsSummary
      );

      // 3. Tự động biên soạn đề thi nếu bật
      let generatedQuestions: Question[] | undefined = undefined;
      if (autoCreateQuiz) {
        generatedQuestions = await generateQuestionsFromDoc(
          combinedContent,
          `doc-${Date.now()}`,
          quizQuestionCount,
          imagesToSend.length > 0 ? imagesToSend : undefined,
          sourceItemsSummary,
          {
            questionFormat: quizFormat,
            difficulty: quizDifficulty,
            subjectName: inputTitle,
          }
        );
      }

      const imagesCount = uploadedSources.filter((s) => s.type === 'image').length;
      const fileType =
        uploadedSources.length > 1
          ? 'multi_source'
          : imagesCount === 1
          ? 'image'
          : uploadedSources[0]?.type === 'document'
          ? 'docx'
          : 'txt';

      const newDoc: DocumentLearning = {
        id: `doc-${Date.now()}`,
        title: inputTitle.trim(),
        fileType,
        content: combinedContent,
        summary: aiResult.summary,
        keyPoints: aiResult.keyPoints,
        generatedQuestions,
        createdAt: new Date().toLocaleString('vi-VN'),
        sources: uploadedSources.length > 0 ? uploadedSources : undefined,
      };

      onSaveDocument(newDoc);
      setSelectedDoc(newDoc);
      setIsCreating(false);
      setInputTitle('');
      setInputContent('');
      setUploadedSources([]);
    } catch (err: any) {
      setAnalysisError(err.message || 'Lỗi khi gọi AI phân tích tài liệu đa nguồn.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate quiz questions directly from document (honoring all sources and zero-hallucination)
  const handleGenerateQuiz = async (
    countOverride?: number,
    formatOverride?: 'multiple_choice' | 'short_answer' | 'true_false' | 'essay' | 'mixed',
    diffOverride?: 'balanced' | 'easy' | 'medium' | 'hard'
  ) => {
    if (!selectedDoc) return;
    setIsGeneratingQuiz(true);
    setAnalysisError('');

    try {
      const imagesToSend = (selectedDoc.sources || [])
        .filter((s) => s.type === 'image' && s.base64Data)
        .map((s) => ({
          mimeType: s.mimeType || 'image/jpeg',
          data: s.base64Data!,
          title: s.name,
          pageIndex: s.pageIndex,
        }));

      const sourceItemsSummary = (selectedDoc.sources || [])
        .map(
          (s, idx) =>
            `- Nguồn #${idx + 1}: ${s.name} (${
              s.type === 'image' ? `Ảnh chụp Trang SGK #${s.pageIndex || idx + 1}` : 'Tệp văn bản'
            }, ${s.sizeFormatted})`
        )
        .join('\n');

      const count = countOverride || 5;
      const format = formatOverride || 'multiple_choice';
      const diff = diffOverride || 'balanced';

      const contentToUse = `${selectedDoc.title}\n\n${selectedDoc.summary || ''}\n\n${selectedDoc.content}`;
      const questions = await generateQuestionsFromDoc(
        contentToUse,
        selectedDoc.id,
        count,
        imagesToSend.length > 0 ? imagesToSend : undefined,
        sourceItemsSummary,
        {
          questionFormat: format,
          difficulty: diff,
          subjectName: selectedDoc.title,
        }
      );

      const updatedDoc: DocumentLearning = {
        ...selectedDoc,
        generatedQuestions: questions,
      };

      onSaveDocument(updatedDoc);
      setSelectedDoc(updatedDoc);
      setIsCustomQuizModalOpen(false);
    } catch (err: any) {
      setAnalysisError(err.message || 'Không thể tạo đề thi từ tài liệu. Vui lòng thử lại!');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-fadeIn" id="document-learning-view">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI TỔNG HỢP & RA ĐỀ TỰ ĐỘNG</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Học Lý Thuyết & Tạo Đề Thi Từ Tài Liệu
          </h2>
          <p className="text-teal-100 text-xs sm:text-sm leading-relaxed">
            Tải lên tài liệu sách giáo khoa, bài giảng Word, PDF, ảnh hoặc ghi chú. Gemini AI sẽ tóm tắt trọng tâm chuẩn SGK và tự động biên soạn đề thi trắc nghiệm kèm lời giải chi tiết.
          </p>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Document List & Add New Button */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-teal-600" />
                <span>Thư Viện Tài Liệu ({documents.length})</span>
              </h3>
              <button
                onClick={() => {
                  setIsCreating(true);
                  setSelectedDoc(null);
                }}
                className="flex items-center space-x-1 px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                id="btn-new-document"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Thêm Mới</span>
              </button>
            </div>

            {/* Document list items */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {documents.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Chưa có tài liệu nào. Nhấn "Thêm Mới" để bắt đầu học!
                </div>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedDoc(doc);
                      setIsCreating(false);
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between group ${
                      selectedDoc?.id === doc.id && !isCreating
                        ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-700/40 border-slate-200/80 dark:border-slate-700 hover:border-teal-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                        {doc.title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-2">
                        <span>{doc.createdAt}</span>
                        {doc.generatedQuestions && (
                          <span className="text-teal-600 dark:text-teal-400 font-medium">
                            • {doc.generatedQuestions.length} câu hỏi
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDocToDelete(doc);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-2 shrink-0"
                      title={`Xóa tài liệu "${doc.title}"`}
                      aria-label={`Xóa tài liệu ${doc.title}`}
                    >
                      <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-600" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Create Form OR Document Detail View */}
        <div className="lg:col-span-2 space-y-4">
          {isCreating ? (
            /* Upload / Creation Form */
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-600 flex items-center justify-center shadow-xs">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center space-x-2">
                      <span>Tải Lên Nhiều Nguồn Tài Liệu SGK</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        Zero-Hallucination
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Cho phép nạp đồng thời nhiều ảnh trang SGK, bài giảng và tệp tài liệu để AI đối chiếu & ra đề tổng hợp
                    </p>
                  </div>
                </div>
                {documents.length > 0 && (
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setSelectedDoc(documents[0]);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Hủy
                  </button>
                )}
              </div>

              {analysisError && (
                <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl p-3.5 text-rose-700 dark:text-rose-300 text-xs flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{analysisError}</span>
                </div>
              )}

              {/* Multi-source Upload Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  if (e.dataTransfer.files) {
                    processFiles(e.dataTransfer.files);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-7 text-center transition-all relative ${
                  isDraggingOver
                    ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-600 hover:border-teal-500 dark:hover:border-teal-400 bg-slate-50/50 dark:bg-slate-700/30'
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.txt,.md,image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  id="multi-file-upload-input"
                />
                <div className="space-y-3 pointer-events-none">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-300 flex items-center justify-center shadow-xs">
                    {isProcessingFiles ? (
                      <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {isProcessingFiles
                        ? 'Đang nạp và trích xuất các nguồn tài liệu...'
                        : 'Kéo thả hoặc nhấn để chọn nhiều nguồn tài liệu'}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                      Chọn cùng lúc <span className="font-semibold text-teal-600 dark:text-teal-400">nhiều ảnh chụp các trang sách giáo khoa</span> (.png, .jpg), tệp tài liệu (.pdf, .docx, .txt).
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700">
                  <label
                    htmlFor="multi-file-upload-input"
                    className="cursor-pointer px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors pointer-events-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Chọn nhiều tệp từ máy tính</span>
                  </label>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadSampleSources();
                    }}
                    className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors pointer-events-auto"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Nạp thử 2 trang SGK mẫu (Toán 12 - Cực trị)</span>
                  </button>
                </div>
              </div>

              {/* Gallery of Uploaded Sources */}
              {uploadedSources.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileCheck className="w-4 h-4 text-teal-600" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Các nguồn đã nạp ({uploadedSources.length} nguồn tài liệu)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearAllSources}
                      className="text-xs text-rose-500 hover:text-rose-600 hover:underline"
                    >
                      Xóa tất cả
                    </button>
                  </div>

                  {/* Sources Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {uploadedSources.map((src, idx) => (
                      <div
                        key={src.id}
                        className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 flex items-start space-x-3 shadow-xs hover:border-teal-400 transition-all"
                      >
                        {/* Thumbnail or Icon */}
                        {src.type === 'image' ? (
                          <div
                            onClick={() => setPreviewLightboxItem(src)}
                            className="w-14 h-16 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-600 relative group cursor-pointer"
                            title="Nhấn để xem ảnh phóng to"
                          >
                            <img
                              src={src.dataUrl || ''}
                              alt={src.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye className="w-4 h-4" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-12 h-14 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900">
                            <FileText className="w-6 h-6" />
                          </div>
                        )}

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5 mb-1">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 uppercase tracking-wider">
                              {src.type === 'image' ? `Trang SGK #${src.pageIndex || idx + 1}` : 'Tệp văn bản'}
                            </span>
                            <span className="text-[10px] text-slate-400">{src.sizeFormatted}</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate" title={src.name}>
                            {src.name}
                          </p>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {src.textContent ? src.textContent.slice(0, 70) + '...' : 'Đã nạp sẵn sàng phân tích.'}
                          </p>

                          <div className="flex items-center space-x-2 mt-2">
                            {src.type === 'image' && (
                              <button
                                type="button"
                                onClick={() => setPreviewLightboxItem(src)}
                                className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1"
                              >
                                <Maximize2 className="w-3 h-3" />
                                <span>Phóng to xem</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveSource(src.id)}
                              className="text-[11px] text-rose-500 hover:text-rose-700 hover:underline flex items-center space-x-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Gỡ bỏ</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Zero-Hallucination Policy Banner */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-cyan-950/30 rounded-2xl p-4 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>NGUYÊN TẮC: KẾT HỢP ĐA NGUỒN & KHÔNG TỰ Ý TẠO THÔNG TIN NGOÀI NGUỒN (ZERO-HALLUCINATION)</span>
                </div>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 pl-6 list-disc">
                  <li>
                    <strong>Xâu chuỗi đa nguồn:</strong> Toàn bộ định nghĩa, định lý, công thức và bài tập từ các trang ảnh SGK hoặc tệp tài liệu được AI đối chiếu và kết hợp toàn diện khi soạn lý thuyết và đề thi.
                  </li>
                  <li>
                    <strong>Tuyệt đối không bịa đặt:</strong> 100% câu hỏi, đáp án, số liệu và câu giải thích bắt buộc phải xuất phát trực tiếp từ các nguồn tài liệu đã cung cấp ở trên.
                  </li>
                  <li>
                    <strong>Minh bạch trích dẫn:</strong> Mỗi câu hỏi và lời giải chi tiết đều được đánh dấu nguồn rõ ràng (ví dụ: <code>[Trang SGK #1]</code> hoặc <code>[Trang SGK #2]</code>).
                  </li>
                </ul>
              </div>

              {/* Document Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên Tài Liệu / Chủ Đề Học Tập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  placeholder="Ví dụ: Chuyên đề Khảo sát Cực trị Hàm số - Sách Giáo Khoa Giải Tích 12 (Trang 24 & 25)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Content Textarea (Optional Supplementary Notes) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ghi Chú Bổ Sung Hoặc Nội Dung Văn Bản (Tùy chọn)
                </label>
                <textarea
                  rows={4}
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  placeholder="Nhập thêm ghi chú bài giảng, công thức bổ sung hoặc dán văn bản nếu có..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-xs leading-relaxed"
                />
              </div>

              {/* Automatic Quiz Generation Configuration */}
              <div className="bg-slate-50 dark:bg-slate-700/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-600 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCreateQuiz}
                      onChange={(e) => setAutoCreateQuiz(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center space-x-1.5">
                      <Brain className="w-4 h-4 text-teal-600" />
                      <span>Tự Động Biên Soạn Ngay Bộ Đề Thi Tổng Hợp Từ Các Nguồn (Thang điểm 10.0)</span>
                    </span>
                  </label>
                </div>

                {autoCreateQuiz && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-600">
                    {/* Số lượng câu hỏi */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Số lượng câu hỏi
                      </label>
                      <select
                        value={quizQuestionCount}
                        onChange={(e) => setQuizQuestionCount(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500"
                      >
                        <option value={3}>3 câu (Kiểm tra nhanh)</option>
                        <option value={5}>5 câu (Chuẩn bài học)</option>
                        <option value={10}>10 câu (Ôn tập toàn diện)</option>
                        <option value={15}>15 câu (Đề thi chi tiết)</option>
                        <option value={20}>20 câu (Kiểm tra định kỳ)</option>
                      </select>
                    </div>

                    {/* Dạng câu hỏi */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Định dạng câu hỏi
                      </label>
                      <select
                        value={quizFormat}
                        onChange={(e) => setQuizFormat(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="multiple_choice">Trắc nghiệm 4 lựa chọn (A, B, C, D)</option>
                        <option value="true_false">Trắc nghiệm Đúng / Sai</option>
                        <option value="short_answer">Trả lời ngắn (Điền số / kết quả)</option>
                        <option value="essay">Tự luận (Có barem lời giải)</option>
                        <option value="mixed">Hỗn hợp các dạng đề thi mới</option>
                      </select>
                    </div>

                    {/* Mức độ */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Phân bố độ khó
                      </label>
                      <select
                        value={quizDifficulty}
                        onChange={(e) => setQuizDifficulty(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="balanced">Cân bằng ma trận SGK (Chuẩn GDPT)</option>
                        <option value="easy">Cơ bản nhận biết & Thông hiểu</option>
                        <option value="medium">Vận dụng chuẩn mức độ</option>
                        <option value="hard">Vận dụng cao phân hóa</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit button with AI */}
              <button
                onClick={handleAnalyzeAndSave}
                disabled={isAnalyzing}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-xl text-sm shadow-md flex items-center justify-center space-x-2.5 transition-all disabled:opacity-50"
                id="btn-analyze-document"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>AI Đang Phân Tích & Tổng Hợp Đa Nguồn (Zero-Hallucination)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>Tổng Hợp Lý Thuyết & Tạo Đề Thi Từ Các Nguồn</span>
                  </>
                )}
              </button>
            </div>
          ) : selectedDoc ? (
            /* Document Study & Quiz Generator View */
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-[11px] font-semibold uppercase tracking-wider">
                      {selectedDoc.fileType === 'multi_source'
                        ? 'Tài Liệu Đa Nguồn SGK'
                        : selectedDoc.fileType === 'image'
                        ? 'Tài Liệu Ảnh Trang SGK'
                        : 'Tài Liệu Lý Thuyết SGK'}
                    </span>
                    {selectedDoc.sources && selectedDoc.sources.length > 0 && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>{selectedDoc.sources.length} nguồn tổng hợp</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                    {selectedDoc.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Đã lưu vào: {selectedDoc.createdAt}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDocToDelete(selectedDoc)}
                    className="flex items-center space-x-1.5 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-semibold rounded-xl shadow-xs transition-colors"
                    title="Xóa tài liệu này khỏi thư viện"
                    id="btn-delete-current-doc"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Xóa Tài Liệu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportDocumentToPowerPointPptx(selectedDoc)}
                    className="flex items-center space-x-1.5 px-3 py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-xl shadow-xs transition-colors"
                    title="Tự động chuyển tóm tắt tài liệu thành Slide PowerPoint (.pptx)"
                    id="btn-export-pptx"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-600" />
                    <span>Xuất Slide PPTX</span>
                  </button>

                  {selectedDoc.generatedQuestions && selectedDoc.generatedQuestions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => exportToMoodleGIFT(selectedDoc.title, selectedDoc.generatedQuestions || [])}
                      className="flex items-center space-x-1.5 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-xl shadow-xs transition-colors"
                      title="Xuất ngân hàng câu hỏi định dạng Moodle GIFT Format (.txt)"
                      id="btn-export-moodle"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Xuất Moodle GIFT</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsCustomQuizModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
                    id="btn-custom-quiz-modal"
                    title="Tùy chỉnh số lượng câu hỏi và dạng bài thi"
                  >
                    <Brain className="w-3.5 h-3.5 text-teal-600" />
                    <span>Tùy Chỉnh Biên Soạn Đề</span>
                  </button>

                  <button
                    onClick={() => handleGenerateQuiz(5, 'multiple_choice', 'balanced')}
                    disabled={isGeneratingQuiz}
                    className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow-md transition-all disabled:opacity-50"
                    id="btn-generate-quiz"
                  >
                    {isGeneratingQuiz ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang soạn đề từ các nguồn...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Biên Soạn Nhanh 5 Câu</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Uploaded Sources Gallery in Document Detail */}
              {selectedDoc.sources && selectedDoc.sources.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-teal-600" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Nguồn Tài Liệu Đã Nạp ({selectedDoc.sources.length} nguồn tổng hợp)
                      </h4>
                    </div>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Zero-Hallucination Grounded</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedDoc.sources.map((src, idx) => (
                      <div
                        key={src.id || idx}
                        className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 flex items-center space-x-2.5 shadow-xs hover:border-teal-400 transition-colors"
                      >
                        {src.type === 'image' ? (
                          <div
                            onClick={() => setPreviewLightboxItem(src)}
                            className="w-12 h-14 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-600 relative group cursor-pointer"
                            title="Nhấn để xem ảnh phóng to"
                          >
                            <img
                              src={src.dataUrl || ''}
                              alt={src.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-10 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 uppercase">
                            {src.type === 'image' ? `Trang SGK #${src.pageIndex || idx + 1}` : 'Tệp văn bản'}
                          </span>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5" title={src.name}>
                            {src.name}
                          </p>
                          {src.type === 'image' && (
                            <button
                              type="button"
                              onClick={() => setPreviewLightboxItem(src)}
                              className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1 mt-1"
                            >
                              <Maximize2 className="w-2.5 h-2.5" />
                              <span>Xem trang ảnh</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-slate-200/60 dark:border-slate-700">
                    💡 Toàn bộ các câu hỏi trắc nghiệm, bài tập và tóm tắt lý thuyết đều được đối chiếu và kết nối từ toàn bộ các nguồn trên mà không tạo thêm thông tin ngoài nguồn.
                  </p>
                </div>
              )}

              {/* AI Summary Box */}
              {selectedDoc.summary && (
                <div className="bg-teal-50/70 dark:bg-teal-950/30 rounded-2xl p-5 border border-teal-100 dark:border-teal-900/50 space-y-3">
                  <div className="flex items-center space-x-2 text-teal-800 dark:text-teal-300 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Tóm Tắt Cốt Lõi Chuẩn Sách Giáo Khoa:</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {selectedDoc.summary}
                  </p>
                </div>
              )}

              {/* Key Revision Points */}
              {selectedDoc.keyPoints && selectedDoc.keyPoints.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                    <span>Trọng Tâm Ôn Luyện Cần Nhớ:</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedDoc.keyPoints.map((pt, idx) => (
                      <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0"></span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Generated Questions Section */}
              {selectedDoc.generatedQuestions && selectedDoc.generatedQuestions.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                        <Brain className="w-4 h-4 text-emerald-600" />
                        <span>Đề Thi Trắc Nghiệm Đã Được AI Tạo ({selectedDoc.generatedQuestions.length} câu)</span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        Chấm tự động 1 điểm/câu, kèm giải thích chi tiết và đồng bộ kết quả Google Sheets
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...selectedDoc, generatedQuestions: undefined };
                          onSaveDocument(updated);
                          setSelectedDoc(updated);
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                        title="Xóa bộ đề thi trắc nghiệm này"
                        aria-label="Xóa bộ đề thi trắc nghiệm"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </button>

                      {onSyncToSubjects && (
                        <button
                          type="button"
                          onClick={() => {
                            const detectedClass = selectedDoc.title.includes('10')
                              ? '10T2'
                              : selectedDoc.title.includes('11')
                              ? '11A2'
                              : '12D1';
                            const detectedGrade = detectedClass.startsWith('10')
                              ? '10'
                              : detectedClass.startsWith('11')
                              ? '11'
                              : '12';
                            setSyncTargetClass(detectedClass);
                            setSyncGrade(detectedGrade);
                            setSyncTitle(`Toán lớp ${detectedClass} - ${selectedDoc.title.slice(0, 30)}`);
                            setIsSyncModalOpen(true);
                          }}
                          className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-all"
                          id="btn-sync-doc-quiz"
                          title="Đồng bộ bộ đề này sang phân hiệu Môn học & Đề thi theo lớp"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Đồng Bộ Sang Môn Học</span>
                        </button>
                      )}

                      <button
                        onClick={() =>
                          onStartExamFromQuestions(
                            `Đề thi: ${selectedDoc.title}`,
                            selectedDoc.generatedQuestions!
                          )
                        }
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-all"
                        id="btn-take-generated-quiz"
                      >
                        <span>Làm Bài Ngay</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {syncSuccessToast && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Đã đồng bộ thành công đề thi sang phân hiệu Môn học & Đề thi (Lớp {customSyncClass || syncTargetClass})! Bạn có thể chuyển qua tab "Môn học & đề thi" để xem và làm bài bất kỳ lúc nào.</span>
                    </div>
                  )}

                  {/* Preview first 2 questions */}
                  <div className="space-y-3">
                    {selectedDoc.generatedQuestions.map((q, qIdx) => (
                      <div
                        key={q.id}
                        className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700 text-xs space-y-2"
                      >
                        <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                          <span className="w-5 h-5 rounded bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">
                            {qIdx + 1}
                          </span>
                          <span>{q.content}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-7">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="text-slate-600 dark:text-slate-300">
                              {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Document Expandable */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <details className="group">
                  <summary className="text-xs font-semibold text-slate-500 hover:text-teal-600 cursor-pointer list-none flex items-center space-x-1.5">
                    <span>Xem nội dung tài liệu gốc</span>
                    <span className="group-open:rotate-180 transition-transform text-[10px]">▼</span>
                  </summary>
                  <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs text-slate-600 dark:text-slate-300 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700">
                    {selectedDoc.content}
                  </div>
                </details>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 border border-slate-200 dark:border-slate-700">
              Chọn một tài liệu bên trái hoặc bấm "Thêm Mới" để bắt đầu học.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Document Deletion */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Xác Nhận Xóa Tài Liệu</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Thao tác này sẽ xóa tài liệu khỏi thư viện</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-xs text-slate-700 dark:text-slate-300">
              Bạn có chắc muốn xóa tài liệu <strong className="text-slate-900 dark:text-white font-bold">"{docToDelete.title}"</strong>?
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDoc}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
                id="btn-confirm-delete-doc"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác Nhận Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: Sync generated quiz to Subject & Exam module */}
      {isSyncModalOpen && selectedDoc && selectedDoc.generatedQuestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="flex items-center space-x-3 text-purple-600 dark:text-purple-400">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Đồng Bộ Đề Thi Sang Môn Học
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Lưu bộ đề thi ({selectedDoc.generatedQuestions.length} câu) vào phân hiệu Môn học & Đề thi theo lớp
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chọn Lớp phân công (ví dụ: 10T2, 11A2, 12D1...)
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {['10T2', '11A2', '12D1', '10A1', '11B3', '12T1'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setSyncTargetClass(c);
                        setCustomSyncClass('');
                        const grade = c.startsWith('10') ? '10' : c.startsWith('11') ? '11' : '12';
                        setSyncGrade(grade);
                        setSyncTitle(`Toán lớp ${c} - ${selectedDoc.title.slice(0, 30)}`);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                        syncTargetClass === c && !customSyncClass
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Hoặc nhập tên lớp khác (ví dụ: 10A3, 11D2, 12A1)..."
                  value={customSyncClass}
                  onChange={(e) => {
                    setCustomSyncClass(e.target.value);
                    const val = e.target.value.trim();
                    if (val) {
                      const grade = val.startsWith('10') ? '10' : val.startsWith('11') ? '11' : val.startsWith('12') ? '12' : syncGrade;
                      setSyncGrade(grade);
                      setSyncTitle(`Toán lớp ${val} - ${selectedDoc.title.slice(0, 30)}`);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Khối Lớp
                </label>
                <div className="flex space-x-2">
                  {['10', '11', '12'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSyncGrade(g)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        syncGrade === g
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Khối {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên hiển thị của Môn Học & Đề Thi
                </label>
                <input
                  type="text"
                  required
                  value={syncTitle}
                  onChange={(e) => setSyncTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalClass = (customSyncClass.trim() || syncTargetClass).toUpperCase();
                  if (onSyncToSubjects) {
                    onSyncToSubjects(selectedDoc, finalClass, syncGrade, syncTitle);
                  }
                  setIsSyncModalOpen(false);
                  setSyncSuccessToast(true);
                  setTimeout(() => setSyncSuccessToast(false), 6000);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
                id="btn-confirm-sync-doc"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Đồng Bộ Ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Textbook Page Images */}
      {previewLightboxItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Lightbox Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 text-white">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                      Trang SGK #{previewLightboxItem.pageIndex || 1}
                    </span>
                    <span className="text-xs text-slate-400">({previewLightboxItem.sizeFormatted})</span>
                  </div>
                  <h4 className="text-sm font-semibold truncate text-slate-200">
                    {previewLightboxItem.name}
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewLightboxItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Đóng xem trước"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Content */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/70">
              {previewLightboxItem.type === 'image' && previewLightboxItem.dataUrl ? (
                <img
                  src={previewLightboxItem.dataUrl}
                  alt={previewLightboxItem.name}
                  className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-md"
                />
              ) : (
                <div className="p-6 text-slate-300 text-sm max-w-2xl bg-slate-900 rounded-xl whitespace-pre-wrap font-mono">
                  {previewLightboxItem.textContent || 'Nội dung tệp tài liệu.'}
                </div>
              )}
            </div>

            {/* Lightbox Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 text-xs text-slate-400 flex items-center justify-between">
              <span>Trang tài liệu được cung cấp để Gemini AI đối chiếu và biên soạn đề trắc nghiệm</span>
              <button
                type="button"
                onClick={() => setPreviewLightboxItem(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Quiz Re-Generation Modal */}
      {isCustomQuizModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-600 flex items-center justify-center">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                    Tùy Chỉnh Biên Soạn Đề Thi Từ Các Nguồn
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Kết hợp {selectedDoc.sources?.length || 1} nguồn tài liệu SGK với cam kết không bịa đặt
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomQuizModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Số lượng câu hỏi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Số lượng câu hỏi cần tạo
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[3, 5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCustomReGenCount(num)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        customReGenCount === num
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {num} câu
                    </button>
                  ))}
                </div>
              </div>

              {/* Định dạng câu hỏi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Định dạng câu hỏi
                </label>
                <select
                  value={customReGenFormat}
                  onChange={(e) => setCustomReGenFormat(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="multiple_choice">Trắc nghiệm 4 lựa chọn (A, B, C, D chuẩn SGK)</option>
                  <option value="true_false">Trắc nghiệm Đúng / Sai (Định dạng GDPT 2018)</option>
                  <option value="short_answer">Trả lời ngắn (Điền số hoặc kết luận)</option>
                  <option value="essay">Tự luận giải chi tiết từng bước (Kèm barem điểm)</option>
                  <option value="mixed">Hỗn hợp cân bằng các dạng đề thi</option>
                </select>
              </div>

              {/* Độ khó */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phân bố độ khó
                </label>
                <select
                  value={customReGenDifficulty}
                  onChange={(e) => setCustomReGenDifficulty(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="balanced">Cân bằng ma trận SGK (40% Nhận biết, 30% Thông hiểu, 30% Vận dụng)</option>
                  <option value="easy">Cơ bản trọng tâm SGK</option>
                  <option value="medium">Vận dụng chuẩn mức độ thi</option>
                  <option value="hard">Vận dụng cao & Câu hỏi bẫy tư duy</option>
                </select>
              </div>

              {/* Zero-Hallucination notice */}
              <div className="bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl p-3 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Đảm bảo 100% câu hỏi và đáp án được biên soạn chuẩn xác từ các trang SGK đã nạp, kèm trích dẫn số trang rõ ràng.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCustomQuizModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleGenerateQuiz(customReGenCount, customReGenFormat, customReGenDifficulty)}
                disabled={isGeneratingQuiz}
                className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                id="btn-confirm-custom-quiz"
              >
                {isGeneratingQuiz ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang Biên Soạn Đề...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Bắt Đầu Biên Soạn Đề Thi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
