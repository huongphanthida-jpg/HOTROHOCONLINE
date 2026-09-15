import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Clock,
  Zap,
  RotateCcw,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles,
  HelpCircle,
  BookOpen,
  Trash2,
  User,
  Check,
  Edit3
} from 'lucide-react';
import { EducationalGame, FillBlankQuestion, FillBlankBlankItem, StudentInfo } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
import { GameSessionResult } from '../../services/sheetSyncService';
import { GameSyncCard } from './GameSyncCard';
import { FormattedMathText } from '../FormattedMathText';

interface FillBlankGamePlayerProps {
  game: EducationalGame;
  studentInfo: StudentInfo;
  onBack: () => void;
  onUpdateHighScore?: (newScore: number) => void;
  onDeleteGame?: (gameId: string) => void;
  onGameCompleted?: (result: GameSessionResult) => void;
  initialScriptUrl?: string;
}

// Utility for normalizing strings to compare answers safely
function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export const FillBlankGamePlayer: React.FC<FillBlankGamePlayerProps> = ({
  game,
  studentInfo,
  onBack,
  onUpdateHighScore,
  onDeleteGame,
  onGameCompleted,
  initialScriptUrl,
}) => {
  const questions: FillBlankQuestion[] = game.fillBlankData?.questions || [];
  const baseTime = game.fillBlankData?.timePerQuestion || 25;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(baseTime);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [startTime] = useState<number>(Date.now());
  const [totalTimeSpent, setTotalTimeSpent] = useState<number>(0);

  // Sync state for Google Sheets
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [gameResult, setGameResult] = useState<GameSessionResult | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQ = questions[currentIndex];

  const handleFinishGame = (finalScore: number, finalCorrect: number) => {
    setIsGameOver(true);
    soundEffects.playCelebration();
    const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    setTotalTimeSpent(duration);

    if (onUpdateHighScore) {
      onUpdateHighScore(finalScore);
    }

    const totalQs = questions.length || 1;
    const score10 = Number(((finalCorrect / totalQs) * 10).toFixed(1));
    const resultObj: GameSessionResult = {
      gameId: game.id,
      gameTitle: game.title,
      gameType: 'fill_blank',
      subject: game.subject,
      studentInfo,
      score: score10,
      rawScore: finalScore,
      correctCount: finalCorrect,
      totalCount: totalQs,
      timeSpent: duration,
      submittedAt: new Date().toLocaleString('vi-VN'),
      detailsSummary: `Đúng ${finalCorrect}/${totalQs} câu điền khuyết • Điểm số: ${finalScore}đ`,
    };

    setGameResult(resultObj);
    if (onGameCompleted) {
      onGameCompleted(resultObj);
    }

    triggerSync(resultObj);
  };

  const triggerSync = async (resultObj?: GameSessionResult, customUrl?: string) => {
    const resToSync = resultObj || gameResult;
    if (!resToSync) return;

    setSyncStatus('syncing');
    setSyncMessage('Đang kết nối gửi điểm số về Google Sheets...');

    const { syncGameResultToGoogleSheets } = await import('../../services/sheetSyncService');
    const res = await syncGameResultToGoogleSheets(resToSync, customUrl || initialScriptUrl);
    if (res.success) {
      setSyncStatus('success');
      setSyncMessage(res.message);
    } else {
      setSyncStatus('error');
      setSyncMessage(res.message);
    }
  };

  // Timer Countdown Effect
  useEffect(() => {
    if (isGameOver || isAnswered || !currentQ) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleCheckAnswer(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isAnswered, isGameOver]);

  // Reset input when question changes
  useEffect(() => {
    setUserInputs({});
    setIsAnswered(false);
    setTimeLeft(baseTime);
  }, [currentIndex]);

  const handleCheckAnswer = (isTimeOut = false) => {
    if (isAnswered) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setIsAnswered(true);

    if (!currentQ) return;

    const blanks = currentQ.blanks || [];
    let allBlanksCorrect = true;

    if (blanks.length === 0) {
      // Fallback if no explicit blanks defined
      allBlanksCorrect = false;
    } else {
      blanks.forEach((b, bIdx) => {
        const userVal = userInputs[b.id || `blank_${bIdx}`] || '';
        const targetCorrect = b.correctAnswer || '';
        const acceptable = b.acceptableAnswers || [];
        const isMatch =
          normalizeText(userVal) === normalizeText(targetCorrect) ||
          acceptable.some((acc) => normalizeText(userVal) === normalizeText(acc));

        if (!isMatch) {
          allBlanksCorrect = false;
        }
      });
    }

    if (!isTimeOut && allBlanksCorrect) {
      soundEffects.playCorrect();
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
      setCorrectCount((c) => c + 1);

      const timeBonus = Math.floor(timeLeft * 8);
      const streakBonus = Math.min(newStreak, 5) * 15;
      const pointsGained = (currentQ.points || 100) + timeBonus + streakBonus;
      setScore((s) => s + pointsGained);
    } else {
      soundEffects.playWrong();
      setStreak(0);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinishGame(score, correctCount);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setUserInputs({});
    setIsAnswered(false);
    setTimeLeft(baseTime);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCorrectCount(0);
    setIsGameOver(false);
    setSyncStatus('idle');
    setSyncMessage('');
    setGameResult(null);
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center max-w-lg mx-auto shadow-sm border border-slate-200 dark:border-slate-700">
        <p className="text-slate-600 dark:text-slate-300">Trò chơi chưa có câu hỏi điền khuyết nào. Vui lòng cập nhật hoặc tạo lại từ tài liệu.</p>
        <button
          onClick={onBack}
          className="mt-4 px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-bold text-xs"
        >
          Quay lại kho trò chơi
        </button>
      </div>
    );
  }

  // Finished Game View
  if (isGameOver) {
    const accuracy = Math.round((correctCount / questions.length) * 100);
    const score10 = Number(((correctCount / questions.length) * 10).toFixed(1));

    const fallbackResult: GameSessionResult = {
      gameId: game.id,
      gameTitle: game.title,
      gameType: 'fill_blank',
      subject: game.subject,
      studentInfo,
      score: score10,
      rawScore: score,
      correctCount,
      totalCount: questions.length,
      timeSpent: totalTimeSpent,
      submittedAt: new Date().toLocaleString('vi-VN'),
    };

    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200 dark:border-slate-700 text-center animate-fadeIn">
        <div className="w-20 h-20 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
          <Trophy className="w-10 h-10" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white">
          Hoàn Thành Điền Khuyết!
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs sm:text-sm">
          {game.title}
        </p>

        {/* Student Badge */}
        <div className="mt-3 inline-flex items-center space-x-2 px-3.5 py-1.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-full text-xs font-bold text-teal-800 dark:text-teal-200">
          <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Học sinh: {studentInfo.fullName}</span>
          <span className="text-teal-300 dark:text-teal-600">•</span>
          <span>Lớp: {studentInfo.className}</span>
        </div>

        {/* Score Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-8">
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <div className="text-xs text-slate-400 uppercase font-semibold">Điểm Thang 10</div>
            <div className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-400 mt-1">
              {score10}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{score} điểm game</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <div className="text-xs text-slate-400 uppercase font-semibold">Đúng/Tổng</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {correctCount}/{questions.length}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <div className="text-xs text-slate-400 uppercase font-semibold">Độ Chính Xác</div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {accuracy}%
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <div className="text-xs text-slate-400 uppercase font-semibold">Max Streak</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-500 mt-1 flex items-center justify-center space-x-1">
              <Zap className="w-5 h-5 fill-amber-500" />
              <span>{maxStreak}</span>
            </div>
          </div>
        </div>

        {/* Sync Card */}
        <GameSyncCard
          result={gameResult || fallbackResult}
          syncStatus={syncStatus}
          syncMessage={syncMessage}
          onRetrySync={(url) => triggerSync(undefined, url)}
          initialScriptUrl={initialScriptUrl}
        />

        <div className="flex items-center justify-center space-x-3 mt-6">
          <button
            onClick={handleRestart}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition-all shadow-md active:scale-95 text-xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Chơi Lại</span>
          </button>
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold transition-all active:scale-95 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kho Trò Chơi</span>
          </button>
        </div>
      </div>
    );
  }

  // Active Question Render Helpers
  const questionRaw = currentQ.question || currentQ.content || currentQ.prompt || currentQ.text || '';
  const blanks = currentQ.blanks || [];
  const wordOptions = currentQ.options || [];

  // Parse text containing [blank], [blank1], ___, or [...]
  const renderInteractiveText = () => {
    // Replace placeholders with input components
    const placeholderRegex = /(\[blank\d*\]|_{2,}|\[\.\.\.\])/gi;
    const parts = questionRaw.split(placeholderRegex);

    let blankCounter = 0;

    return (
      <div className="leading-relaxed text-slate-800 dark:text-slate-100 font-medium text-base sm:text-lg flex flex-wrap items-baseline gap-1.5">
        {parts.map((part, idx) => {
          if (placeholderRegex.test(part) || part.toLowerCase().includes('blank') || part.includes('___')) {
            const blankIndex = blankCounter;
            blankCounter++;
            const blankObj = blanks[blankIndex] || { id: `blank_${blankIndex}`, correctAnswer: '' };
            const blankKey = blankObj.id || `blank_${blankIndex}`;
            const userVal = userInputs[blankKey] || '';
            const targetAns = blankObj.correctAnswer || '';

            const isCorrect =
              isAnswered &&
              (normalizeText(userVal) === normalizeText(targetAns) ||
                (blankObj.acceptableAnswers || []).some((acc) => normalizeText(userVal) === normalizeText(acc)));

            return (
              <span key={idx} className="inline-flex items-center my-1">
                <input
                  type="text"
                  disabled={isAnswered}
                  value={userVal}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUserInputs((prev) => ({ ...prev, [blankKey]: val }));
                  }}
                  placeholder={`[Vị trí ${blankIndex + 1}]`}
                  className={`px-3 py-1 text-sm font-bold rounded-xl border transition-all text-center focus:outline-hidden min-w-[110px] max-w-[180px] ${
                    isAnswered
                      ? isCorrect
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-black'
                        : 'bg-rose-100 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-200 font-black'
                      : 'bg-white dark:bg-slate-900 border-teal-400 focus:ring-2 focus:ring-teal-500 text-teal-800 dark:text-teal-200'
                  }`}
                />
                {isAnswered && (
                  <span className="ml-1">
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                    ) : (
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 ml-1">
                        (Đáp án: <strong className="underline">{targetAns}</strong>)
                      </span>
                    )}
                  </span>
                )}
              </span>
            );
          }

          return (
            <span key={idx}>
              <FormattedMathText text={part} />
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={onBack}
            className="flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Thoát</span>
          </button>
          {onDeleteGame && (
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg transition-all"
              title="Xóa trò chơi này"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Student Info Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl text-xs font-bold text-teal-800 dark:text-teal-200 ml-2">
            <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="truncate max-w-[130px]">{studentInfo.fullName}</span>
            <span className="text-teal-300 dark:text-teal-600">•</span>
            <span>{studentInfo.className}</span>
          </div>
        </div>

        {/* Progress & Question Number */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Câu {currentIndex + 1} / {questions.length}
          </span>
          <div className="w-24 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Streak & Score */}
        <div className="flex items-center space-x-3">
          {streak > 1 && (
            <div className="flex items-center space-x-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full text-xs font-black animate-pulse">
              <Zap className="w-3.5 h-3.5 fill-amber-500" />
              <span>Combo x{streak}</span>
            </div>
          )}
          <div className="flex items-center space-x-1 font-black text-indigo-600 dark:text-indigo-400 text-sm sm:text-base">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>{score}</span>
          </div>
        </div>
      </div>

      {/* Main Question Box */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
        {/* Countdown Timer Bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="flex items-center space-x-1 text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Thời gian còn lại</span>
            </span>
            <span
              className={`font-black ${
                timeLeft <= 5 ? 'text-rose-600 dark:text-rose-400 animate-ping' : 'text-indigo-600 dark:text-indigo-400'
              }`}
            >
              {timeLeft}s
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-linear ${
                timeLeft <= 5
                  ? 'bg-rose-500'
                  : timeLeft <= 10
                  ? 'bg-amber-500'
                  : 'bg-indigo-500'
              }`}
              style={{ width: `${(timeLeft / baseTime) * 100}%` }}
            />
          </div>
        </div>

        {/* Interactive Fill-Blank Content Box */}
        <div className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 mb-5 shadow-xs text-left">
          {renderInteractiveText()}

          {currentQ.sourceCitation && (
            <div className="inline-flex items-center space-x-1 text-[11px] font-medium text-teal-600 dark:text-teal-400 mt-3 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-md">
              <BookOpen className="w-3 h-3" />
              <span>{currentQ.sourceCitation}</span>
            </div>
          )}
        </div>

        {/* Optional Word Bank (Words can be tapped to auto-fill active blank) */}
        {wordOptions.length > 0 && !isAnswered && (
          <div className="my-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
            <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-2">
              💡 Ngân hàng từ gợi ý (Bấm vào từ để điền nhanh vào ô khuyết):
            </div>
            <div className="flex flex-wrap gap-2">
              {wordOptions.map((word, wIdx) => (
                <button
                  key={wIdx}
                  type="button"
                  onClick={() => {
                    // Find first empty blank key or first blank key
                    const blankKey = blanks.find((b, idx) => !userInputs[b.id || `blank_${idx}`])?.id || blanks[0]?.id || 'blank_0';
                    setUserInputs((prev) => ({ ...prev, [blankKey]: word }));
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all shadow-2xs active:scale-95"
                >
                  <FormattedMathText text={word} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Check / Next Action Buttons */}
        <div className="mt-6 flex justify-end">
          {!isAnswered ? (
            <button
              onClick={() => handleCheckAnswer(false)}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md active:scale-95 flex items-center space-x-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Kiểm Tra Đáp Án</span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-all shadow-md active:scale-95"
            >
              {currentIndex + 1 < questions.length ? 'Câu Tiếp Theo →' : 'Xem Kết Quả 🏆'}
            </button>
          )}
        </div>

        {/* Explanation Footer when answered */}
        {isAnswered && (
          <div className="mt-5 p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 animate-fadeIn text-left">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-teal-800 dark:text-teal-300 mb-1">
              <HelpCircle className="w-4 h-4" />
              <span>Giải thích đáp án điền khuyết:</span>
            </div>
            <div className="text-xs sm:text-sm text-gray-900 dark:text-slate-100 leading-relaxed font-medium">
              <FormattedMathText text={currentQ.explanation || 'Đã hoàn thành lượt kiểm tra điền khuyết.'} />
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Xóa trò chơi này?
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Bạn có chắc muốn xóa "{game.title}"? Dữ liệu trò chơi sẽ bị xóa khỏi kho lưu trữ.
            </p>
            <div className="mt-5 flex items-center justify-center space-x-3">
              <button
                onClick={() => setIsConfirmingDelete(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (onDeleteGame) onDeleteGame(game.id);
                  setIsConfirmingDelete(false);
                  onBack();
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
