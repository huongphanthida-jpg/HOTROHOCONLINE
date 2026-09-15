import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Upload,
  FileText,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  Trash2,
  RefreshCw,
  HelpCircle,
  Eye,
  AlertTriangle,
  Send,
  Image as ImageIcon,
  Edit3,
  Check,
  Plus,
  ArrowLeft,
  Copy
} from 'lucide-react';
import { Subject, Question, UploadedSourceItem } from '../types';
import { generateSimilarExamFromSource } from '../services/aiService';
import { FormattedMathText } from './FormattedMathText';

interface CreateSimilarExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableClasses: string[];
  onCreateExam: (newSubject: Subject, questions: Question[]) => void;
}

export const CreateSimilarExamModal: React.FC<CreateSimilarExamModalProps> = ({
  isOpen,
  onClose,
  availableClasses,
  onCreateExam,
}) => {
  const [step, setStep] = useState<'input' | 'preview'>('input');

  // Metadata states
  const [selectedSubjectType, setSelectedSubjectType] = useState('Toán');
  const [selectedGrade, setSelectedGrade] = useState<'10' | '11' | '12'>('12');
  const [selectedClassNumber, setSelectedClassNumber] = useState('12D1');
  const [customClassName, setCustomClassName] = useState('');
  const [examTitle, setExamTitle] = useState('[Đề Song Song] Toán lớp 12D1 - Đề kiểm tra tương tự đề gốc');
  const [examDesc, setExamDesc] = useState('Bộ đề thi mới hoàn toàn được AI phân tích ma trận và tạo tương tự từ đề thi gốc');

  // Source inputs
  const [sourceTab, setSourceTab] = useState<'upload' | 'paste'>('upload');
  const [sourceText, setSourceText] = useState('');
  const [uploadedSources, setUploadedSources] = useState<UploadedSourceItem[]>([]);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Settings
  const [useOriginalCount, setUseOriginalCount] = useState(true);
  const [questionCount, setQuestionCount] = useState<number>(10);

  // Generation & Edit state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStepText, setGenerationStepText] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingQuestionIds, setEditingQuestionIds] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const currentClassName = customClassName.trim() || selectedClassNumber;

  const handleSelectClass = (cls: string) => {
    setSelectedClassNumber(cls);
    setCustomClassName('');
    const grade = cls.startsWith('10') ? '10' : cls.startsWith('11') ? '11' : '12';
    setSelectedGrade(grade as any);
    setExamTitle(`[Đề Song Song] ${selectedSubjectType} lớp ${cls} - Đề kiểm tra tương tự đề gốc`);
  };

  // Process files (images, docx, pdf, txt)
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
    } catch (err) {
      console.error('Lỗi xử lý file:', err);
      setErrorMsg('Không thể đọc toàn bộ file. Vui lòng kiểm tra lại định dạng file!');
    } finally {
      setIsReadingFiles(false);
    }
  };

  const handleRemoveSourceItem = (id: string) => {
    setUploadedSources((prev) => prev.filter((item) => item.id !== id));
  };

  // Generate similar exam handler
  const handleGenerateSimilarExam = async () => {
    setErrorMsg('');
    setIsGenerating(true);
    setGenerationStepText('Đang phân tích cấu trúc, ma trận và dạng bài từ đề gốc...');

    try {
      let combinedText = sourceText.trim();
      const imagesPayload: { mimeType: string; data: string }[] = [];

      uploadedSources.forEach((src) => {
        if (src.type === 'text' && src.textContent) {
          combinedText += `\n\n--- FILE ĐỀ GỐC: ${src.name} ---\n${src.textContent}`;
        } else if (src.type === 'image' && src.base64Data) {
          imagesPayload.push({
            mimeType: src.mimeType || 'image/jpeg',
            data: src.base64Data,
          });
        }
      });

      if (!combinedText && imagesPayload.length === 0) {
        throw new Error('Vui lòng tải lên file/ảnh đề thi gốc hoặc dán nội dung đề bài trước khi tạo!');
      }

      setGenerationStepText('AI đang biên soạn các câu hỏi mới song song tương tự đề gốc...');

      const targetCount = useOriginalCount ? 10 : questionCount;
      const questions = await generateSimilarExamFromSource(combinedText, 'mixed', {
        subjectName: selectedSubjectType,
        grade: selectedGrade,
        questionCount: targetCount,
        images: imagesPayload,
      });

      if (!questions || questions.length === 0) {
        throw new Error('AI không thể tạo danh sách câu hỏi. Vui lòng thử lại với file đề gốc rõ ràng hơn!');
      }

      setGeneratedQuestions(questions);
      setStep('preview');
    } catch (err: any) {
      console.error('Lỗi tạo đề thi tương tự:', err);
      const msg = err.message || 'Đã xảy ra lỗi trong quá trình AI phân tích và tạo đề thi tương tự.';
      setErrorMsg(msg);
      alert(`Lỗi tạo đề: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Inline editing functions
  const handleToggleEditQuestion = (id: string) => {
    setEditingQuestionIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleUpdateQuestionContent = (id: string, content: string) => {
    setGeneratedQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, content, questionText: content } : q)));
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
    setGeneratedQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, correctAnswer: correctIdx } : q)));
  };

  const handleUpdateExplanation = (id: string, explanation: string) => {
    setGeneratedQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, explanation } : q)));
  };

  const handleDeleteQuestion = (id: string) => {
    setGeneratedQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleSaveAndPublish = () => {
    if (generatedQuestions.length === 0) {
      setErrorMsg('Đề thi chưa có câu hỏi nào. Vui lòng tạo câu hỏi trước khi lưu!');
      return;
    }

    const newSubId = `sub-sim-${Date.now()}`;
    const newSubject: Subject = {
      id: newSubId,
      name: examTitle.trim() || `${selectedSubjectType} lớp ${currentClassName}`,
      description: examDesc.trim() || `Đề thi tương tự tạo bằng AI cho lớp ${currentClassName}`,
      color: 'from-purple-600 to-indigo-600',
      icon: 'fa-solid fa-sparkles',
      questionsCount: generatedQuestions.length,
      className: currentClassName,
      grade: selectedGrade,
      subjectType: selectedSubjectType,
      source: 'document_ai',
      createdAt: new Date().toISOString(),
    };

    const formattedQuestions: Question[] = generatedQuestions.map((q, idx) => ({
      ...q,
      id: `q-${newSubId}-${idx + 1}`,
      subjectId: newSubId,
    }));

    onCreateExam(newSubject, formattedQuestions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-white leading-tight">
                  {step === 'input'
                    ? 'Tạo Đề Thi Tương Tự Từ Đề Gốc'
                    : 'Xem Trước & Hiệu Chỉnh Đề Thi Song Song'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-[10px] font-black uppercase">
                  AI Song Song
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {step === 'input'
                  ? 'Phân tích file Word, PDF hoặc Ảnh chụp đề gốc để AI tạo đề thi mới cùng ma trận kiến thức'
                  : `Đã biên soạn ${generatedQuestions.length} câu hỏi mới tương tự đề gốc theo chuẩn SGK`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-2xl text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'input' ? (
            <>
              {/* Basic metadata settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Môn Học:
                  </label>
                  <select
                    value={selectedSubjectType}
                    onChange={(e) => {
                      setSelectedSubjectType(e.target.value);
                      setExamTitle(`[Đề Song Song] ${e.target.value} lớp ${currentClassName} - Đề kiểm tra tương tự đề gốc`);
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                  >
                    <option value="Toán">Toán Học</option>
                    <option value="Vật Lý">Vật Lý</option>
                    <option value="Hóa Học">Hóa Học</option>
                    <option value="Sinh Học">Sinh Học</option>
                    <option value="Ngữ Văn">Ngữ Văn</option>
                    <option value="Tiếng Anh">Tiếng Anh</option>
                    <option value="Lịch Sử">Lịch Sử</option>
                    <option value="Địa Lý">Địa Lý</option>
                    <option value="GDCD">GDCD / KTPL</option>
                    <option value="Tin Học">Tin Học</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Khối Lớp & Lớp Học:
                  </label>
                  <div className="flex space-x-2">
                    <select
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value as any)}
                      className="w-24 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                    >
                      <option value="10">Khối 10</option>
                      <option value="11">Khối 11</option>
                      <option value="12">Khối 12</option>
                    </select>
                    <input
                      type="text"
                      value={customClassName || selectedClassNumber}
                      onChange={(e) => setCustomClassName(e.target.value)}
                      placeholder="Mã lớp (12D1, 10T2)..."
                      className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số Lượng Câu Hỏi AI Tạo:
                  </label>
                  <div className="flex items-center space-x-3 mt-1">
                    <label className="flex items-center space-x-1.5 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useOriginalCount}
                        onChange={(e) => setUseOriginalCount(e.target.checked)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Tự động theo đề gốc</span>
                    </label>
                    {!useOriginalCount && (
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="w-16 px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên Đề Thi Tương Tự Mới:
                </label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="Nhập tên đề thi tương tự..."
                  className="w-full px-3.5 py-2.5 text-xs font-extrabold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Source tabs: File upload vs Paste text */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <Upload className="w-4 h-4 text-purple-600" />
                    <span>Nguồn Đề Thi Gốc Để Phân Tích (Word / PDF / Ảnh chụp / Ghi chú)</span>
                  </span>

                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setSourceTab('upload')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        sourceTab === 'upload'
                          ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      Tải File / Ảnh
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceTab('paste')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        sourceTab === 'paste'
                          ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      Dán Nội Dung Văn Bản
                    </button>
                  </div>
                </div>

                {sourceTab === 'upload' ? (
                  <div className="space-y-3">
                    {/* Drop zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingOver(true);
                      }}
                      onDragLeave={() => setIsDraggingOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingOver(false);
                        processFiles(e.dataTransfer.files);
                      }}
                      className={`p-6 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
                        isDraggingOver
                          ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/40 scale-[0.99]'
                          : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-purple-400'
                      }`}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.accept = '.docx,.pdf,.txt,.png,.jpg,.jpeg';
                        input.onchange = (e: any) => processFiles(e.target.files);
                        input.click();
                      }}
                    >
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2">
                        <Upload className="w-6 h-6" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                        Kéo thả hoặc bấm để chọn File Word (.docx), PDF (.pdf) hoặc Ảnh đề thi (.png, .jpg)
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        AI sẽ tự động OCR hình ảnh và trích xuất ma trận câu hỏi đề gốc để làm căn cứ tạo đề mới
                      </p>
                    </div>

                    {/* Uploaded items list */}
                    {uploadedSources.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          File/Ảnh đề gốc đã nạp ({uploadedSources.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {uploadedSources.map((item) => (
                            <div
                              key={item.id}
                              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between"
                            >
                              <div className="flex items-center space-x-2 truncate">
                                {item.type === 'image' ? (
                                  <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                                ) : (
                                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                )}
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                                  {item.name}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSourceItem(item.id)}
                                className="text-rose-500 hover:text-rose-700 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <textarea
                      rows={8}
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      placeholder="Dán toàn bộ câu hỏi/đề bài thi gốc vào đây để AI phân tích cấu trúc và ra đề tương tự..."
                      className="w-full p-3.5 text-xs font-medium rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            /* PREVIEW STEP */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-950/40 p-4 rounded-2xl border border-purple-200 dark:border-purple-800">
                <div>
                  <h4 className="text-sm font-extrabold text-purple-900 dark:text-purple-200">
                    Danh Sách {generatedQuestions.length} Câu Hỏi Thi Tương Tự
                  </h4>
                  <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                    Hỗ trợ hiển thị công thức Toán/Hóa qua FormattedMathText và cho phép giáo viên chỉnh sửa trực tiếp.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="px-3 py-1.5 rounded-xl border border-purple-300 dark:border-purple-700 text-xs font-bold text-purple-800 dark:text-purple-200 hover:bg-purple-100"
                >
                  <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />
                  Điều Chỉnh Nguồn
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {generatedQuestions.map((q, idx) => {
                  const isEditing = Boolean(editingQuestionIds[q.id]);
                  return (
                    <div
                      key={q.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                          Câu hỏi #{idx + 1} ({q.type === 'multiple_choice' ? 'Trắc nghiệm 4 đáp án' : q.type === 'true_false' ? 'Trắc nghiệm Đúng/Sai' : 'Trả lời ngắn'})
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleToggleEditQuestion(q.id)}
                            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center space-x-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{isEditing ? 'Hoàn tất sửa' : 'Chỉnh sửa'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center space-x-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Nội dung câu hỏi:
                            </label>
                            <textarea
                              rows={2}
                              value={q.content || q.questionText || ''}
                              onChange={(e) => handleUpdateQuestionContent(q.id, e.target.value)}
                              className="w-full p-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                            />
                          </div>

                          {q.type === 'multiple_choice' && (
                            <div className="space-y-2">
                              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                Các phương án (Bấm để chọn đáp án đúng):
                              </label>
                              {q.options.map((opt, oIdx) => (
                                <div key={oIdx} className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name={`correct_${q.id}`}
                                    checked={q.correctAnswer === oIdx}
                                    onChange={() => handleSelectCorrectAnswer(q.id, oIdx)}
                                    className="text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => handleUpdateQuestionOption(q.id, oIdx, e.target.value)}
                                    className="flex-1 p-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Lời giải chi tiết:
                            </label>
                            <input
                              type="text"
                              value={q.explanation || ''}
                              onChange={(e) => handleUpdateExplanation(q.id, e.target.value)}
                              className="w-full p-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-left">
                          <div className="text-sm font-extrabold text-slate-800 dark:text-white leading-relaxed">
                            <FormattedMathText text={q.content || q.questionText || ''} />
                          </div>

                          {q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2">
                              {q.options.map((opt, oIdx) => {
                                const isCorrect = q.correctAnswer === oIdx;
                                return (
                                  <div
                                    key={oIdx}
                                    className={`p-2 rounded-xl border text-xs font-medium flex items-center justify-between ${
                                      isCorrect
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold'
                                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    <FormattedMathText text={opt} />
                                    {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-1 shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {q.explanation && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                              <strong className="text-purple-600 dark:text-purple-400">Lời giải:</strong>{' '}
                              <FormattedMathText text={q.explanation} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end space-x-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100"
          >
            Hủy Bỏ
          </button>

          {step === 'input' ? (
            <button
              onClick={handleGenerateSimilarExam}
              disabled={isGenerating || isReadingFiles}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{generationStepText || 'Đang biên soạn đề tương tự...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Bắt Đầu Tạo Đề Tương Tự</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleSaveAndPublish}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Lưu & Xuất Bản Đề Thi Tương Tự</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
