import React, { useState, useEffect } from 'react';
import { SessionRecord, QuestionResult } from '../types';
import { CheckCircle2, XCircle, Clock, Trophy, Download, RotateCcw, Home, Sparkles, Bot, Share2, Check, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEffects } from '../utils/soundEffects';
import { syncSessionToGoogleSheets, formatTimeSpent } from '../services/sheetSyncService';
import { explainQuestionDeeply } from '../services/aiService';

interface ExamResultViewProps {
  session: SessionRecord;
  onRetake: () => void;
  onBackToSubjects: () => void;
  onOpenAITutorWithContext: (context: string) => void;
}

export const ExamResultView: React.FC<ExamResultViewProps> = ({
  session,
  onRetake,
  onBackToSubjects,
  onOpenAITutorWithContext,
}) => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>(
    session.syncedToGoogleSheets ? 'success' : 'idle'
  );
  const [syncMessage, setSyncMessage] = useState(
    session.syncedToGoogleSheets ? 'Đã lưu và đồng bộ lên Google Sheets' : ''
  );

  // Deep AI explanation states
  const [aiAnalysisQuestion, setAiAnalysisQuestion] = useState<QuestionResult | null>(null);
  const [aiAnalysisContent, setAiAnalysisContent] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Trigger celebration & auto sync on mount
  useEffect(() => {
    if (session.score >= 8) {
      soundEffects.playCelebration();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0d9488', '#10b981', '#f59e0b', '#3b82f6'],
        });
      } catch (e) {
        // ignore
      }
    } else {
      soundEffects.playCorrect();
    }

    // Auto sync to Google Sheets
    handleSync();
  }, []);

  const handleSync = async () => {
    setSyncStatus('syncing');
    setSyncMessage('Đang đồng bộ kết quả lên Google Sheets...');
    const res = await syncSessionToGoogleSheets(session);
    if (res.success) {
      setSyncStatus('success');
      setSyncMessage(res.message);
    } else {
      setSyncStatus('error');
      setSyncMessage(res.message);
    }
  };

  const handleDeepAIExplain = async (q: QuestionResult) => {
    setAiAnalysisQuestion(q);
    setAiAnalysisContent('');
    setIsAiLoading(true);

    try {
      const formattedQ = {
        id: q.questionId,
        subjectId: session.subjectId,
        content: q.questionContent,
        type: 'multiple_choice' as const,
        options: [
          'Đáp án A',
          'Đáp án B',
          'Đáp án C',
          'Đáp án D',
        ],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: 'medium' as const,
      };

      const result = await explainQuestionDeeply(formattedQ, q.userAnswer);
      setAiAnalysisContent(result);
    } catch (err: any) {
      setAiAnalysisContent(`Lỗi phân tích AI: ${err.message || 'Không thể kết nối đến AI. Vui lòng kiểm tra API Key.'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleExportPDF = () => {
    const element = document.getElementById('printable-exam-result');
    if (!element) return;

    if (typeof (window as any).html2pdf !== 'undefined') {
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `HoTroHocOnline_2026_2027_${session.studentInfo.fullName.replace(/\s+/g, '_')}_${session.subjectName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      (window as any).html2pdf().set(opt).from(element).save();
    } else {
      window.print();
    }
  };

  const getScoreBadge = () => {
    if (session.score >= 9) return { label: 'Xuất Sắc 🏆', color: 'from-amber-400 to-orange-500' };
    if (session.score >= 8) return { label: 'Giỏi ⭐', color: 'from-teal-500 to-emerald-600' };
    if (session.score >= 6.5) return { label: 'Khá 👍', color: 'from-blue-500 to-indigo-600' };
    if (session.score >= 5) return { label: 'Trung Bình 📚', color: 'from-slate-500 to-slate-700' };
    return { label: 'Cần Ôn Lại 💡', color: 'from-rose-500 to-pink-600' };
  };

  const badge = getScoreBadge();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fadeIn" id="exam-result-view">
      {/* Printable Area Wrapper */}
      <div id="printable-exam-result" className="space-y-6">
        {/* Score Board Header */}
        <div className="bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold">
                <Trophy className="w-3.5 h-3.5 text-amber-300" />
                <span>KẾT QUẢ BÀI ĐÁNH GIÁ TRỰC TUYẾN</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {session.subjectName}
              </h2>
              <div className="text-teal-100 text-xs sm:text-sm space-y-0.5">
                <p>Thí sinh: <strong>{session.studentInfo.fullName}</strong> — Lớp: <strong>{session.studentInfo.className}</strong></p>
                <p>Nhóm / Tổ: <strong>{session.studentInfo.groupName}</strong> — Ngày thi: <strong>{session.date}</strong></p>
              </div>
            </div>

            {/* Score circle badge */}
            <div className="flex flex-col items-center justify-center p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
              <div className="text-5xl sm:text-6xl font-black tracking-tight text-white drop-shadow-sm font-mono">
                {session.score}
              </div>
              <span className="text-xs uppercase tracking-wider text-teal-200 font-semibold mt-1">
                Thang điểm 10.0
              </span>
              <div className={`mt-2 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${badge.color} shadow-sm`}>
                {badge.label}
              </div>
            </div>
          </div>

          {/* Stat metrics row */}
          <div className="mt-8 pt-6 border-t border-white/20 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono">
                {session.correctAnswers} / {session.totalQuestions}
              </div>
              <div className="text-[11px] text-teal-200">Câu trả lời đúng</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono">
                {formatTimeSpent(session.timeSpent)}
              </div>
              <div className="text-[11px] text-teal-200">Thời gian làm bài</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono">
                {Math.round((session.correctAnswers / session.totalQuestions) * 100)}%
              </div>
              <div className="text-[11px] text-teal-200">Tỷ lệ chính xác</div>
            </div>
          </div>
        </div>

        {/* Google Sheets Sync Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3 text-left">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              syncStatus === 'success'
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                : syncStatus === 'error'
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                : 'bg-teal-100 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400'
            }`}>
              <i className="fa-brands fa-google-drive text-lg"></i>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  Đồng Bộ Google Sheets (Apps Script)
                </span>
                {syncStatus === 'success' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 font-semibold flex items-center space-x-1">
                    <Check className="w-2.5 h-2.5" />
                    <span>Đã ghi nhận</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {syncMessage || 'Tự động gửi thông tin thí sinh, điểm và thời gian làm về Google Sheets'}
              </p>
            </div>
          </div>

          <button
            onClick={handleSync}
            disabled={syncStatus === 'syncing'}
            className="shrink-0 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            id="btn-retry-sheets-sync"
          >
            <i className={`fa-solid fa-arrows-rotate text-xs ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}></i>
            <span>{syncStatus === 'syncing' ? 'Đang đồng bộ...' : 'Đồng bộ lại'}</span>
          </button>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={onRetake}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              id="btn-retake-exam"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Làm Lại Đề Này</span>
            </button>
            <button
              onClick={onBackToSubjects}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
              id="btn-back-to-subjects"
            >
              <Home className="w-4 h-4" />
              <span>Đổi Môn Khác</span>
            </button>
          </div>

          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-colors"
            id="btn-export-pdf"
          >
            <Download className="w-4 h-4 text-teal-600" />
            <span>Xuất Phiếu Điểm (PDF)</span>
          </button>
        </div>

        {/* Detailed Question Review List */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
              <span>Lời Giải Chi Tiết Chuẩn Sách Giáo Khoa</span>
              <span className="text-xs font-normal text-slate-400">
                ({session.details?.length || session.totalQuestions} câu)
              </span>
            </h3>
          </div>

          <div className="space-y-4">
            {session.details?.map((q, idx) => {
              const isShortAnswer = q.questionType === 'short_answer';
              const isEssay = q.questionType === 'essay';
              const isTrueFalse = q.questionType === 'true_false';

              const maxPts = q.maxPoints !== undefined ? q.maxPoints : Number((10 / session.totalQuestions).toFixed(2));
              const awardedPts = q.pointsAwarded !== undefined ? q.pointsAwarded : (q.isCorrect ? maxPts : 0);

              const userChoice = (() => {
                if (q.userAnswer === null || q.userAnswer === undefined || q.userAnswer === '') return 'Chưa chọn / Chưa làm';
                if (isShortAnswer || isEssay) return String(q.userAnswer);
                if (isTrueFalse) return q.userAnswer === 0 ? 'ĐÚNG' : 'SAI';
                if (typeof q.userAnswer === 'number') return String.fromCharCode(65 + q.userAnswer);
                return String(q.userAnswer);
              })();

              const correctChoice = (() => {
                if (isShortAnswer) return q.expectedShortAnswer || q.sampleAnswer || 'Đáp số chính xác từ tài liệu';
                if (isEssay) return q.sampleAnswer || 'Đối chiếu thang điểm barem';
                if (isTrueFalse) return q.correctAnswer === 0 ? 'ĐÚNG' : 'SAI';
                return String.fromCharCode(65 + q.correctAnswer);
              })();

              return (
                <div
                  key={idx}
                  className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border transition-all ${
                    q.isCorrect
                      ? 'border-emerald-200 dark:border-emerald-800/60'
                      : 'border-rose-200 dark:border-rose-800/60'
                  }`}
                  id={`review-question-${idx + 1}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          q.isCorrect
                            ? 'bg-emerald-500 text-white'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold uppercase text-slate-400">
                        Câu {idx + 1}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {isShortAnswer
                          ? 'Trả lời ngắn'
                          : isTrueFalse
                          ? 'Đúng / Sai'
                          : isEssay
                          ? 'Tự luận'
                          : 'Trắc nghiệm ABCD'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {q.isCorrect ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đúng (+{awardedPts} đ)</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Sai (0 / {maxPts} đ)</span>
                        </span>
                      )}

                      <button
                        onClick={() => handleDeepAIExplain(q)}
                        className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-medium flex items-center space-x-1 transition-colors"
                        title="Yêu cầu AI giải thích sâu và phân tích bẫy đề thi"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Hỏi AI</span>
                      </button>
                    </div>
                  </div>

                  {/* Question text */}
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-3">
                    {q.questionContent}
                  </div>

                  {/* Comparison */}
                  <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3 text-xs flex flex-wrap items-center gap-4 mb-3 border border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <span className="text-slate-500">Bạn đã điền/chọn: </span>
                      <strong className={q.isCorrect ? 'text-emerald-600 dark:text-emerald-400 font-mono' : 'text-rose-600 dark:text-rose-400 font-mono'}>
                        {userChoice}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Đáp án chuẩn: </span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                        {correctChoice}
                      </strong>
                    </div>
                  </div>

                  {/* Textbook Explanation */}
                  <div className="bg-teal-50/50 dark:bg-teal-950/20 rounded-xl p-3.5 border border-teal-100 dark:border-teal-900/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    <div className="font-semibold text-teal-800 dark:text-teal-300 mb-1 flex items-center space-x-1">
                      <i className="fa-solid fa-book-bookmark text-xs"></i>
                      <span>Lời giải chi tiết chuẩn Sách Giáo Khoa:</span>
                    </div>
                    <p>{q.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Deep Analysis Modal */}
      {aiAnalysisQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base">Gia Sư AI: Phân Tích Chuyên Sâu SGK</h4>
                  <p className="text-teal-100 text-xs">Bản chất định lý, mẹo làm nhanh & bẫy đề thi</p>
                </div>
              </div>
              <button
                onClick={() => setAiAnalysisQuestion(null)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              <div className="bg-slate-50 dark:bg-slate-700/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Câu hỏi:
                </span>
                <p className="text-slate-800 dark:text-slate-200">{aiAnalysisQuestion.questionContent}</p>
              </div>

              {isAiLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-500">
                  <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs animate-pulse">Thầy/Cô AI đang phân tích logic SGK và các lỗi thường gặp...</p>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {aiAnalysisContent}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-700/40 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setAiAnalysisQuestion(null)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl"
              >
                Đã Hiểu Kiến Thức
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
