import React, { useState, useEffect, useCallback } from 'react';
import { DocumentLearning, Question } from '../types';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  Grid,
  Play,
  Printer,
  Sparkles,
  BookOpen,
  Target,
  FlaskConical,
  HelpCircle,
  CheckCircle2,
  Award,
  FileText
} from 'lucide-react';
import { exportDocumentToPowerPointPptx } from '../utils/exportUtils';

interface PPTPreviewModalProps {
  isOpen: boolean;
  doc: DocumentLearning | null;
  onClose: () => void;
}

export interface SlideData {
  id: number;
  type: 'title' | 'overview' | 'keypoints' | 'formulas' | 'quiz' | 'ending';
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  content?: React.ReactNode;
}

export const PPTPreviewModal: React.FC<PPTPreviewModalProps> = ({
  isOpen,
  doc,
  onClose,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'presentation' | 'grid'>('presentation');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Generate slide deck data from document
  const generateSlides = useCallback((document: DocumentLearning): SlideData[] => {
    const slides: SlideData[] = [];
    let slideId = 1;

    const docTitle = document.title || 'Bài Giảng Điện Tử';
    const summaryText = document.summary || document.content || 'Nội dung tóm tắt bài học đang được cập nhật.';
    const keyPointsList = document.keyPoints || [];
    const formulasList = document.formulas || [];
    const questionsList = document.generatedQuestions || [];

    // Slide 1: Bìa Bài Giảng
    slides.push({
      id: slideId++,
      type: 'title',
      title: docTitle,
      subtitle: 'BÀI GIẢNG ĐIỆN TỬ TỰ ĐỘNG - HỌC ONLINE 2026-2027',
      badge: 'Tài Liệu Số AI',
    });

    // Slide 2: Tổng Quan Nội Dung
    slides.push({
      id: slideId++,
      type: 'overview',
      title: '📌 1. TỔNG QUAN NỘI DUNG BÀI HỌC',
      subtitle: 'Tóm tắt lý thuyết cốt lõi được tổng hợp từ nguồn tài liệu',
      icon: <BookOpen className="w-5 h-5 text-teal-600" />,
      content: (
        <div className="space-y-4">
          {summaryText.split('\n\n').filter(Boolean).slice(0, 3).map((para, idx) => (
            <p key={idx} className="text-slate-700 dark:text-slate-200 text-sm md:text-base leading-relaxed text-justify">
              {para}
            </p>
          ))}
          {document.uploadedSources && document.uploadedSources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-400">Nguồn trích dẫn:</span>
              {document.uploadedSources.map((src, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 rounded-md font-medium border border-teal-200 dark:border-teal-900/40">
                  {src.name}
                </span>
              ))}
            </div>
          )}
        </div>
      ),
    });

    // Slide 3: Trọng Tâm Kiến Thức (Key Points)
    if (keyPointsList.length > 0) {
      slides.push({
        id: slideId++,
        type: 'keypoints',
        title: '🎯 2. TRỌNG TÂM KIẾN THỨC BẮT BUỘC GHI NHỚ',
        subtitle: 'Các khái niệm và điểm then chốt cần nắm vững để làm bài thi',
        icon: <Target className="w-5 h-5 text-emerald-600" />,
        content: (
          <div className="grid grid-cols-1 gap-3">
            {keyPointsList.slice(0, 5).map((kp, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-3 p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40 shadow-xs"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-slate-800 dark:text-slate-100 text-sm md:text-base font-medium leading-snug">
                  {kp}
                </p>
              </div>
            ))}
          </div>
        ),
      });
    }

    // Slide 4: Công Thức & Định Nghĩa (Formulas)
    if (formulasList.length > 0) {
      slides.push({
        id: slideId++,
        type: 'formulas',
        title: '🧪 3. CÔNG THỨC & ĐỊNH NGHĨA THEN CHỐT',
        subtitle: 'Bảng tổng hợp công thức toán học, vật lý, hóa học hoặc định nghĩa',
        icon: <FlaskConical className="w-5 h-5 text-amber-600" />,
        content: (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {formulasList.slice(0, 6).map((form, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-gradient-to-br from-amber-50/70 to-orange-50/70 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl border border-amber-200/70 dark:border-amber-900/40 shadow-xs"
              >
                <div className="flex items-center space-x-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                    Công thức #{idx + 1}
                  </span>
                </div>
                <p className="text-slate-800 dark:text-slate-100 text-sm font-semibold font-mono">
                  {form}
                </p>
              </div>
            ))}
          </div>
        ),
      });
    }

    // Slide 5: Câu Hỏi Vận Dụng Củng Cố (Quiz Preview)
    if (questionsList.length > 0) {
      const sampleQs = questionsList.slice(0, 2);
      slides.push({
        id: slideId++,
        type: 'quiz',
        title: '❓ 4. CÂU HỎI CỦNG CỐ KIẾN THỨC',
        subtitle: 'Trắc nghiệm tự luyện minh họa trích xuất từ đề thi',
        icon: <HelpCircle className="w-5 h-5 text-indigo-600" />,
        content: (
          <div className="space-y-4">
            {sampleQs.map((q, qIdx) => (
              <div key={qIdx} className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 shadow-xs">
                <p className="text-sm font-bold text-indigo-950 dark:text-indigo-200 mb-2">
                  Câu {qIdx + 1}: {q.content}
                </p>
                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = oIdx === q.correctAnswer;
                      return (
                        <div
                          key={oIdx}
                          className={`px-3 py-2 text-xs rounded-lg font-medium border flex items-center space-x-2 ${
                            isCorrect
                              ? 'bg-emerald-100 dark:bg-emerald-900/50 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center shrink-0">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span className="truncate">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ),
      });
    }

    // Slide 6: Slide Kết Thúc
    slides.push({
      id: slideId++,
      type: 'ending',
      title: 'CẢM ƠN CÁC EM ĐÃ THEO DÕI!',
      subtitle: 'HỌC ONLINE 2026-2027 • ÔN TẬP VÀ ĐẠT ĐIỂM TỐI ĐA',
      badge: 'Chúc Các Em Học Tốt',
    });

    return slides;
  }, []);

  const slides = doc ? generateSlides(doc) : [];

  // Reset slide index on document change or opening modal
  useEffect(() => {
    if (isOpen) {
      setCurrentSlideIndex(0);
      setViewMode('presentation');
    }
  }, [isOpen, doc]);

  // Keyboard navigation listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, slides.length, onClose]);

  if (!isOpen || !doc) return null;

  const currentSlide = slides[currentSlideIndex] || slides[0];

  const handlePrint = () => {
    window.print();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div
        className={`w-full bg-slate-900 text-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-700/60 transition-all duration-300 ${
          isFullscreen ? 'h-full max-w-full rounded-none' : 'max-w-6xl max-h-[92vh]'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3 truncate mr-2">
            <div className="p-2 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl shadow-md text-white font-bold shrink-0 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h2 className="text-base font-bold text-white truncate flex items-center space-x-2">
                <span>Xem Trước Slide PowerPoint</span>
                <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-md font-semibold border border-amber-500/30">
                  16:9 Widescreen
                </span>
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Tài liệu: <span className="text-teal-300 font-semibold">{doc.title}</span> • {slides.length} Trang Slide
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* View Mode Toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'presentation' ? 'grid' : 'presentation')}
              className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                viewMode === 'grid'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={viewMode === 'presentation' ? 'Xem lưới tất cả slide' : 'Xem dạng trình chiếu'}
            >
              {viewMode === 'presentation' ? (
                <>
                  <Grid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Lưới Slide</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Trình Chiếu</span>
                </>
              )}
            </button>

            {/* Print / Save PDF */}
            <button
              onClick={handlePrint}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
              title="In hoặc lưu Slide thành PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Download PPTX */}
            <button
              onClick={() => exportDocumentToPowerPointPptx(doc)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-lg shadow-md transition-all"
              title="Tải về file PowerPoint .pptx chuẩn"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải PPTX</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded-lg border border-slate-700 hover:border-rose-800 transition-colors"
              title="Đóng cửa sổ xem trước"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 flex flex-col items-center justify-center relative">
          {viewMode === 'presentation' ? (
            <div className="w-full max-w-4xl flex flex-col items-center">
              {/* Slide Screen Frame 16:9 */}
              <div className="w-full aspect-[16/9] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border-2 border-slate-700/80 flex flex-col justify-between relative transition-all duration-300 select-none">
                
                {/* Slide Background Accents */}
                {currentSlide.type === 'title' || currentSlide.type === 'ending' ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-emerald-800 to-slate-900 flex flex-col items-center justify-center text-center p-8 sm:p-12 text-white">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-6 shadow-inner border border-white/20">
                      <Sparkles className="w-8 h-8 text-amber-300 animate-pulse" />
                    </div>
                    <span className="px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-xs font-bold uppercase tracking-wider mb-3 border border-amber-400/30">
                      {currentSlide.badge}
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-tight max-w-2xl leading-tight mb-4 drop-shadow-md">
                      {currentSlide.title}
                    </h1>
                    <p className="text-sm sm:text-lg text-emerald-100/90 font-medium max-w-xl">
                      {currentSlide.subtitle}
                    </p>
                    <div className="mt-8 pt-4 border-t border-white/10 text-xs text-emerald-200/60 font-mono">
                      HỌC ONLINE 2026-2027 • Tự Động Biên Soạn AI
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Slide Top Header Bar */}
                    <div className="px-6 py-4 bg-gradient-to-r from-slate-50 via-teal-50/40 to-slate-50 dark:from-slate-800 dark:via-teal-950/20 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {currentSlide.icon}
                        <div>
                          <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">
                            {currentSlide.title}
                          </h2>
                          {currentSlide.subtitle && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {currentSlide.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-teal-700 dark:text-teal-400 px-2.5 py-1 bg-teal-100/80 dark:bg-teal-950/60 rounded-md border border-teal-200 dark:border-teal-800">
                        Trang {currentSlideIndex + 1} / {slides.length}
                      </span>
                    </div>

                    {/* Slide Body Content */}
                    <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-slate-900">
                      {currentSlide.content}
                    </div>

                    {/* Slide Footer */}
                    <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-teal-600 dark:text-teal-400 flex items-center space-x-1">
                        <Sparkles className="w-3 h-3" />
                        <span>HỌC ONLINE 2026-2027</span>
                      </span>
                      <span>{doc.title}</span>
                      <span>Trang {currentSlideIndex + 1}</span>
                    </div>
                  </>
                )}

              </div>

              {/* Navigation Controls Bar */}
              <div className="flex items-center justify-between w-full mt-4 px-2">
                <button
                  onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentSlideIndex === 0}
                  className="flex items-center space-x-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Trở về</span>
                </button>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400 font-semibold">
                    Slide <span className="text-amber-400 font-bold">{currentSlideIndex + 1}</span> / {slides.length}
                  </span>
                </div>

                <button
                  onClick={() => setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
                  disabled={currentSlideIndex === slides.length - 1}
                  className="flex items-center space-x-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-30 disabled:hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  <span>Tiếp theo</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Grid Overview Mode */
            <div className="w-full max-w-5xl">
              <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center space-x-2">
                <Grid className="w-4 h-4 text-amber-400" />
                <span>Danh Sách Tất Cả Các Slide ({slides.length} trang)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setCurrentSlideIndex(idx);
                      setViewMode('presentation');
                    }}
                    className={`aspect-[16/9] p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-md ${
                      idx === currentSlideIndex
                        ? 'bg-teal-900/40 border-amber-400 ring-2 ring-amber-400/50 scale-[1.02]'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full border-b border-slate-800 pb-2 mb-2">
                      <span className="text-xs font-bold text-amber-400">Trang #{idx + 1}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded uppercase font-semibold">
                        {s.type}
                      </span>
                    </div>

                    <h4 className="text-xs font-extrabold text-white truncate my-auto leading-snug">
                      {s.title}
                    </h4>

                    <div className="flex items-center justify-between w-full pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
                      <span className="truncate">{s.subtitle || doc.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Thumbnail Strip (Carousel) */}
        {viewMode === 'presentation' && (
          <div className="px-4 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center space-x-2 overflow-x-auto shrink-0 scrollbar-thin scrollbar-thumb-slate-700">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`flex-none w-28 h-16 rounded-lg border p-1.5 text-left transition-all flex flex-col justify-between relative overflow-hidden ${
                  idx === currentSlideIndex
                    ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/60 scale-105'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold ${idx === currentSlideIndex ? 'text-amber-300' : 'text-slate-400'}`}>
                    Slide {idx + 1}
                  </span>
                </div>
                <p className="text-[10px] font-medium text-slate-200 truncate leading-tight">
                  {s.title.replace(/^[📌🎯🧪❓]\s*\d+\.\s*/, '')}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
