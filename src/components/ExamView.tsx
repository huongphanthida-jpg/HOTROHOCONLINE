import React, { useState, useEffect, useMemo } from 'react';
import { Question, StudentInfo, SessionRecord, QuestionResult } from '../types';
import { Clock, Flag, CheckCircle, ArrowLeft, ArrowRight, Send, AlertTriangle, HelpCircle, Hash, FileText, CheckCircle2, Award } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface ExamViewProps {
  subjectName: string;
  subjectId: string;
  questions: Question[];
  studentInfo: StudentInfo;
  onFinishExam: (session: SessionRecord) => void;
  onCancelExam: () => void;
}

export const ExamView: React.FC<ExamViewProps> = ({
  subjectName,
  subjectId,
  questions,
  studentInfo,
  onFinishExam,
  onCancelExam,
}) => {
  // Current active question index
  const [currentIndex, setCurrentIndex] = useState(0);

  // User answers map: questionId -> selectedOptionIndex (number) or text response (string)
  const [answers, setAnswers] = useState<Record<string, number | string>>({});

  // Flagged questions set
  const [flagged, setFlagged] = useState<Set<string>>(new Set());

  // Timer: 1.5 minutes per question
  const totalSeconds = useMemo(() => Math.max(questions.length * 90, 300), [questions.length]);
  const [timeLeft, setTimeLeft] = useState(totalSeconds);

  // Submission confirm modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const safeIndex = questions && questions.length > 0 ? Math.max(0, Math.min(currentIndex, questions.length - 1)) : 0;
  const currentQ = questions?.[safeIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = (questions?.length || 0) - answeredCount;

  // Format time MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // If questions list is empty or current question is not found, render a friendly fallback
  if (!questions || questions.length === 0 || !currentQ) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm text-center space-y-4 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-2xl">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
          Chưa Có Câu Hỏi Trong Đề Thi Này
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Đề thi môn "{subjectName}" hiện chưa có câu hỏi trắc nghiệm trong ngân hàng đề. Bạn có thể quay lại danh sách môn học hoặc khôi phục dữ liệu gốc chuẩn SGK.
        </p>
        <button
          type="button"
          onClick={onCancelExam}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors inline-flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay Lại Danh Sách Môn Học</span>
        </button>
      </div>
    );
  }

  const handleSelectOption = (optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionIndex,
    }));
  };

  const handleToggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentQ.id)) {
        next.delete(currentQ.id);
      } else {
        next.add(currentQ.id);
      }
      return next;
    });
  };

  const handleAutoSubmit = () => {
    finalizeSubmission();
  };

  const finalizeSubmission = () => {
    let correctCount = 0;
    let earnedPoints = 0;

    const defaultPoints = Number((10 / questions.length).toFixed(2));
    const totalMaxPoints = questions.reduce((sum, q) => {
      const qPt = typeof q.points === 'number' && q.points > 0 ? q.points : defaultPoints;
      return sum + qPt;
    }, 0);

    const details: QuestionResult[] = questions.map((q) => {
      const userAns = answers[q.id] !== undefined ? answers[q.id] : null;
      let isCorrect = false;
      const maxPoints = typeof q.points === 'number' && q.points > 0 ? q.points : defaultPoints;

      if (q.type === 'short_answer') {
        const expected = (q.expectedShortAnswer || q.sampleAnswer || '').trim();
        if (typeof userAns === 'string' && userAns.trim().length > 0) {
          const normUser = userAns.trim().toLowerCase().replace(/,/g, '.');
          const normExp = expected.toLowerCase().replace(/,/g, '.');
          const numUser = parseFloat(normUser);
          const numExp = parseFloat(normExp);

          if (!isNaN(numUser) && !isNaN(numExp)) {
            // numeric comparison with tolerance
            isCorrect = Math.abs(numUser - numExp) < 0.0001;
          } else {
            // text matching or keyword containment
            isCorrect = normUser === normExp || normExp.includes(normUser) || normUser.includes(normExp);
          }
        }
      } else if (q.type === 'essay') {
        // Essay is graded upon submission with sample barem comparison
        isCorrect = typeof userAns === 'string' && userAns.trim().length > 0;
      } else {
        isCorrect = userAns === q.correctAnswer;
      }

      const pointsAwarded = isCorrect ? maxPoints : 0;
      earnedPoints += pointsAwarded;
      if (isCorrect) correctCount++;

      return {
        questionId: q.id,
        questionContent: q.content,
        questionType: q.type,
        userAnswer: userAns,
        correctAnswer: q.correctAnswer,
        sampleAnswer: q.sampleAnswer,
        expectedShortAnswer: q.expectedShortAnswer,
        pointsAwarded,
        maxPoints,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const timeSpent = totalSeconds - timeLeft;
    // Scale strictly 10.0
    const rawScore = (earnedPoints / (totalMaxPoints || 10)) * 10;
    const score = Number(Math.min(10.0, Math.max(0, rawScore)).toFixed(1));

    const session: SessionRecord = {
      id: `ses-${Date.now()}`,
      subjectId,
      subjectName,
      studentInfo,
      score,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      timeSpent,
      date: new Date().toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      details,
    };

    onFinishExam(session);
  };

  const isLowTime = timeLeft < 120; // under 2 minutes

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-fadeIn" id="exam-container">
      {/* Top Bar: Student Info & Timer Widget */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (window.confirm('Bạn có chắc muốn thoát bài làm? Tiến trình hiện tại sẽ không được lưu.')) {
                onCancelExam();
              }
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Hủy bài làm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-800 dark:text-white text-base">
                {subjectName}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-xs font-semibold">
                {questions.length} câu trắc nghiệm
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Thí sinh: <strong className="text-slate-700 dark:text-slate-200">{studentInfo.fullName}</strong> — Lớp: <strong>{studentInfo.className}</strong> ({studentInfo.groupName})
            </p>
          </div>
        </div>

        {/* Timer Widget */}
        <div className="flex items-center space-x-4">
          <div
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all ${
              isLowTime
                ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 animate-pulse'
                : 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300'
            }`}
            id="timer-widget"
          >
            <Clock className={`w-4 h-4 ${isLowTime ? 'animate-spin' : ''}`} />
            <span className="font-mono font-bold text-lg tracking-wider">
              {formatTime(timeLeft)}
            </span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all text-xs"
            id="btn-submit-exam-trigger"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Nộp Bài</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Question Card + Navigator */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Columns: Active Question Card */}
        <div className="lg:col-span-3 space-y-4">
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 transition-all relative"
            id={`question-card-${currentIndex + 1}`}
          >
            {/* Question Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-700/60 mb-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-teal-500 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {currentIndex + 1}
                </span>
                <span className="text-xs font-semibold uppercase text-slate-400">
                  Câu hỏi {currentIndex + 1} / {questions.length}
                </span>

                {/* Question Type Badge */}
                <span className="text-[11px] px-2.5 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {currentQ?.type === 'multiple_choice'
                    ? 'Trắc nghiệm ABCD'
                    : currentQ?.type === 'short_answer'
                    ? 'Trả lời ngắn'
                    : currentQ?.type === 'true_false'
                    ? 'Đúng / Sai'
                    : 'Tự luận'}
                </span>

                {/* Allocated Point Badge */}
                <span className="inline-flex items-center space-x-1 text-[11px] px-2.5 py-0.5 rounded-md font-extrabold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <Award className="w-3 h-3" />
                  <span>+{currentQ?.points !== undefined ? currentQ.points : (10 / questions.length).toFixed(2)} điểm</span>
                </span>

                {currentQ?.topic && (
                  <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 font-medium">
                    {currentQ.topic}
                  </span>
                )}
              </div>

              <button
                onClick={handleToggleFlag}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  flagged.has(currentQ.id)
                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Đánh dấu câu này để xem lại trước khi nộp"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{flagged.has(currentQ.id) ? 'Đã đánh dấu' : 'Đánh dấu'}</span>
              </button>
            </div>

            {/* Question Content */}
            <div className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-100 leading-relaxed mb-6 whitespace-pre-wrap break-words overflow-wrap-anywhere h-auto min-h-min">
              {currentQ.content}
            </div>

            {/* Question Type & Options List */}
            {currentQ.type === 'true_false' ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 p-2.5 rounded-xl border border-teal-200 dark:border-teal-800">
                  <CheckCircle className="w-4 h-4" />
                  <span>Dạng câu hỏi: Xác định mệnh đề ĐÚNG hay SAI (Chuẩn Bộ GD&ĐT 2025-2026)</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleSelectOption(0)}
                    className={`p-5 rounded-2xl border-2 font-bold text-base flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-3 transition-all h-auto min-h-min ${
                      answers[currentQ.id] === 0
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20 scale-[1.02]'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20'
                    }`}
                    id={`opt-${currentIndex}-true`}
                  >
                    <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                    <span>Mệnh đề ĐÚNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectOption(1)}
                    className={`p-5 rounded-2xl border-2 font-bold text-base flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-3 transition-all h-auto min-h-min ${
                      answers[currentQ.id] === 1
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-500/20 scale-[1.02]'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-rose-400 hover:bg-rose-50/40 dark:hover:bg-rose-950/20'
                    }`}
                    id={`opt-${currentIndex}-false`}
                  >
                    <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                    <span>Mệnh đề SAI</span>
                  </button>
                </div>
              </div>
            ) : currentQ.type === 'short_answer' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 p-3 rounded-xl border border-sky-200 dark:border-sky-800">
                  <span className="flex items-center space-x-1.5">
                    <Hash className="w-4 h-4 text-sky-600" />
                    <span>Dạng câu hỏi: Trả lời ngắn (Chuẩn Bộ GD&ĐT 2025-2026)</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                    Thí sinh tự tính toán &amp; điền đáp số
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Đáp số / Kết quả của bạn:
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Hash className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={typeof answers[currentQ.id] === 'string' ? (answers[currentQ.id] as string) : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAnswers((prev) => ({
                          ...prev,
                          [currentQ.id]: val,
                        }));
                      }}
                      placeholder="Nhập số nguyên, số thập phân hoặc từ khóa (Ví dụ: 15, -3.5, H2SO4...)"
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/60 text-slate-800 dark:text-white font-mono text-base font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-inner"
                      id={`short-answer-${currentIndex}`}
                    />
                    {typeof answers[currentQ.id] === 'string' && (answers[currentQ.id] as string).length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAnswers((prev) => {
                            const copy = { ...prev };
                            delete copy[currentQ.id];
                            return copy;
                          });
                        }}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
                        title="Xóa câu trả lời"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    * Lưu ý: Gõ chính xác đáp số (hệ thống tự chuẩn hóa dấu phẩy ',' hoặc chấm '.' cho số thập phân).
                  </p>
                </div>
              </div>
            ) : currentQ.type === 'essay' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 p-2.5 rounded-xl border border-purple-200 dark:border-purple-800">
                  <span className="flex items-center space-x-1.5">
                    <FileText className="w-4 h-4" />
                    <span>Dạng câu hỏi: Tự luận &amp; Barem điểm</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                    Hệ thống sẽ đối chiếu với barem mẫu sau khi nộp
                  </span>
                </div>

                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phần trình bày bài làm của học sinh:
                </label>
                <textarea
                  rows={6}
                  value={typeof answers[currentQ.id] === 'string' ? (answers[currentQ.id] as string) : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQ.id]: val,
                    }));
                  }}
                  placeholder="Nhập lời giải chi tiết, các bước biến đổi, công thức áp dụng hoặc đáp số của bạn vào đây..."
                  className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/60 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed shadow-inner"
                  id={`essay-answer-${currentIndex}`}
                />
              </div>
            ) : (
              /* Options List (Multiple Choice) */
              <div className="space-y-3">
                {currentQ.options.map((opt, optIdx) => {
                  const isSelected = answers[currentQ.id] === optIdx;
                  const optionLetter = String.fromCharCode(65 + optIdx); // A, B, C, D

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start space-x-3.5 group h-auto min-h-min ${
                        isSelected
                          ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-500 text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/20 shadow-xs'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                      id={`opt-${currentIndex}-${optIdx}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors mt-0.5 ${
                          isSelected
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/40 group-hover:text-teal-700'
                        }`}
                      >
                        {optionLetter}
                      </div>
                      <span className="text-sm sm:text-base font-normal flex-1 leading-relaxed break-words whitespace-pre-wrap overflow-wrap-anywhere">
                        {opt.replace(/^[A-D]\.\s*/, '')}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Navigation Bottom Controls */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100 dark:border-slate-700/60">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                id="btn-prev-question"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Câu Trước</span>
              </button>

              <span className="text-xs text-slate-400">
                {answeredCount}/{questions.length} đã trả lời
              </span>

              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs"
                  id="btn-next-question"
                >
                  <span>Câu Tiếp Theo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
                  id="btn-final-submit"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Hoàn Thành & Nộp</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Question Grid Palette */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Danh Sách Câu Hỏi
            </h4>

            {/* Quick status summary */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block"></span>
                <span>Đã làm: <strong>{answeredCount}</strong></span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-600 inline-block"></span>
                <span>Chưa: <strong>{unansweredCount}</strong></span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                <span>Đánh dấu: <strong>{flagged.size}</strong></span>
              </span>
            </div>

            {/* Grid of question buttons */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = answers[q.id] !== undefined;
                const isFlagged = flagged.has(q.id);

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center relative transition-all ${
                      isCurrent
                        ? 'ring-2 ring-teal-500 ring-offset-2 dark:ring-offset-slate-800'
                        : ''
                    } ${
                      isAnswered
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                    id={`palette-btn-${idx + 1}`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white dark:ring-slate-800"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Submit button */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setShowSubmitModal(true)}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Nộp bài chấm điểm</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center space-x-3 text-teal-600 dark:text-teal-400">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-600 dark:text-teal-300">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white text-base">Xác Nhận Nộp Bài</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Hệ thống sẽ chấm điểm tự động</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/50 p-3.5 rounded-xl text-xs space-y-2 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Đã trả lời:</span>
                <strong className="text-teal-600 dark:text-teal-400">{answeredCount} / {questions.length} câu</strong>
              </div>
              {unansweredCount > 0 && (
                <div className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Còn {unansweredCount} câu chưa chọn đáp án!</span>
                </div>
              )}
              {flagged.size > 0 && (
                <div className="text-slate-500">
                  <span>Còn <strong>{flagged.size}</strong> câu đang đánh dấu xem lại.</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Làm Tiếp
              </button>
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  finalizeSubmission();
                }}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 rounded-xl shadow-md transition-all"
                id="btn-confirm-submit"
              >
                Nộp Bài Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
