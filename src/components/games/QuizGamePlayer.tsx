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
  Award,
  BookOpen,
  Trash2,
  User,
  School
} from 'lucide-react';
import { EducationalGame, QuizGameQuestion, StudentInfo } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
import { GameSessionResult, syncGameResultToGoogleSheets } from '../../services/sheetSyncService';
import { GameSyncCard } from './GameSyncCard';
import { FormattedMathText } from '../FormattedMathText';

import { GameStudentModal } from './GameStudentModal';

interface QuizGamePlayerProps {
  game: EducationalGame;
  studentInfo: StudentInfo;
  onBack: () => void;
  onUpdateHighScore?: (newScore: number) => void;
  onDeleteGame?: (gameId: string) => void;
  onGameCompleted?: (result: GameSessionResult) => void;
  initialScriptUrl?: string;
}

export const QuizGamePlayer: React.FC<QuizGamePlayerProps> = ({
  game,
  studentInfo,
  onBack,
  onUpdateHighScore,
  onDeleteGame,
  onGameCompleted,
  initialScriptUrl,
}) => {
  const questions: QuizGameQuestion[] = game.quizData?.questions || [];
  const baseTime = game.quizData?.timePerQuestion || 15;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
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
  const [userAnswers, setUserAnswers] = useState<
    { questionId: string; selected: number | null; isCorrect: boolean }[]
  >([]);

  // Student info state & Modal state for missing info before submission
  const [currentStudentInfo, setCurrentStudentInfo] = useState<StudentInfo>(studentInfo);
  const [showStudentInfoModal, setShowStudentInfoModal] = useState(false);
  const [pendingQuizFinish, setPendingQuizFinish] = useState<{ finalScore: number; finalCorrect: number } | null>(null);

  // Sync state for Google Sheets
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [gameResult, setGameResult] = useState<GameSessionResult | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQ = questions[currentIndex];

  const handleFinishQuiz = (finalScore: number, finalCorrect: number, customStudentInfo?: StudentInfo) => {
    const infoToUse = customStudentInfo || currentStudentInfo;

    // Check if student info is missing or guest defaults
    const isMissingInfo =
      !infoToUse?.fullName ||
      infoToUse.fullName === 'Học sinh' ||
      infoToUse.fullName === 'Học sinh khách' ||
      !infoToUse?.className ||
      infoToUse.className === 'Chưa xếp lớp' ||
      infoToUse.className === 'Lớp trải nghiệm';

    if (isMissingInfo && !customStudentInfo) {
      setPendingQuizFinish({ finalScore, finalCorrect });
      setShowStudentInfoModal(true);
      return;
    }

    setIsGameOver(true);
    soundEffects.playCelebration();
    const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    setTotalTimeSpent(duration);

    if (onUpdateHighScore) {
      onUpdateHighScore(finalScore);
    }

    const score10 = Number(((finalCorrect / questions.length) * 10).toFixed(1));
    const resultObj: GameSessionResult = {
      gameId: game.id,
      gameTitle: game.title,
      gameType: 'quiz',
      subject: game.subject,
      studentInfo: infoToUse,
      score: score10,
      rawScore: finalScore,
      correctCount: finalCorrect,
      totalCount: questions.length,
      timeSpent: duration,
      submittedAt: new Date().toLocaleString('vi-VN'),
      detailsSummary: `Đúng ${finalCorrect}/${questions.length} câu • Điểm số: ${finalScore}đ`,
    };

    setGameResult(resultObj);
    if (onGameCompleted) {
      onGameCompleted(resultObj);
    }

    // Auto-sync to Google Sheets
    triggerSync(resultObj);
  };

  const triggerSync = async (resultObj?: GameSessionResult, customUrl?: string) => {
    const resToSync = resultObj || gameResult;
    if (!resToSync) return;

    setSyncStatus('syncing');
    setSyncMessage('Đang gửi họ tên, lớp và điểm số về Google Sheets...');

    const res = await syncGameResultToGoogleSheets(resToSync, customUrl || initialScriptUrl);
    if (res.success) {
      setSyncStatus('success');
      setSyncMessage(res.message);
    } else {
      setSyncStatus('error');
      setSyncMessage(res.message);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (isGameOver || isAnswered || !currentQ) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time out
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isAnswered, isGameOver]);

  const handleTimeOut = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsAnswered(true);
    setSelectedOption(null);
    setStreak(0);
    soundEffects.playWrong();

    setUserAnswers((prev) => [
      ...prev,
      { questionId: currentQ.id, selected: null, isCorrect: false },
    ]);
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQ.correctAnswer;

    if (isCorrect) {
      soundEffects.playCorrect();
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
      setCorrectCount((c) => c + 1);

      // Score formula: Base points + Time bonus + Streak multiplier bonus
      const timeBonus = Math.floor(timeLeft * 10);
      const streakBonus = Math.min(newStreak, 5) * 20;
      const pointsGained = (currentQ.points || 100) + timeBonus + streakBonus;
      setScore((s) => s + pointsGained);
    } else {
      soundEffects.playWrong();
      setStreak(0);
    }

    setUserAnswers((prev) => [
      ...prev,
      { questionId: currentQ.id, selected: idx, isCorrect },
    ]);
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimeLeft(baseTime);
    } else {
      // Finished Game
      handleFinishQuiz(score, correctCount);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setTimeLeft(baseTime);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCorrectCount(0);
    setIsGameOver(false);
    setUserAnswers([]);
    setSyncStatus('idle');
    setSyncMessage('');
    setGameResult(null);
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm border border-slate-200 dark:border-slate-700">
        <p className="text-slate-600 dark:text-slate-300">Trò chơi chưa có câu hỏi nào. Vui lòng tạo lại trò chơi từ tài liệu.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-medium"
        >
          Quay lại
        </button>
      </div>
    );
  }

  // End Game Screen
  if (isGameOver) {
    const accuracy = Math.round((correctCount / questions.length) * 100);
    const isNewHighScore = (game.highScore || 0) < score;
    const score10 = Number(((correctCount / questions.length) * 10).toFixed(1));

    const fallbackResult: GameSessionResult = {
      gameId: game.id,
      gameTitle: game.title,
      gameType: 'quiz',
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
        <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-500 flex items-center justify-center mb-4">
          <Trophy className="w-10 h-10" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white">
          Hoàn Thành Thử Thách!
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          {game.title}
        </p>

        {/* Student Badge on Results */}
        <div className="mt-3 inline-flex items-center space-x-2 px-3.5 py-1.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-full text-xs font-bold text-teal-800 dark:text-teal-200">
          <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Học sinh: {studentInfo.fullName}</span>
          <span className="text-teal-300 dark:text-teal-600">•</span>
          <span>Lớp: {studentInfo.className}</span>
          {studentInfo.groupName && (
            <>
              <span className="text-teal-300 dark:text-teal-600">•</span>
              <span>{studentInfo.groupName}</span>
            </>
          )}
        </div>

        {isNewHighScore && (
          <div className="block mt-2">
            <div className="inline-flex items-center space-x-1.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold animate-bounce">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Kỷ Lục Điểm Mới!</span>
            </div>
          </div>
        )}

        {/* Big Score Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 my-8">
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

        {/* Source citation */}
        {game.sourceCitations && game.sourceCitations.length > 0 && (
          <div className="bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-xl p-3 text-xs text-teal-800 dark:text-teal-300 text-left mb-6">
            <div className="flex items-center space-x-1.5 font-bold mb-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Nguồn tài liệu SGK gốc:</span>
            </div>
            <p className="italic">{game.sourceCitations.join(' • ')}</p>
          </div>
        )}

        {/* Google Sheets Sync Card */}
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
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition-all shadow-md shadow-teal-600/20 active:scale-95"
            id="btn-quiz-replay"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Chơi Lại</span>
          </button>
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold transition-all active:scale-95"
            id="btn-quiz-back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kho Trò Chơi</span>
          </button>
        </div>
      </div>
    );
  }

  // Active Question View
  return (
    <div className="max-w-3xl mx-auto">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
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
              className="bg-teal-500 h-full rounded-full transition-all duration-300"
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
          <div className="flex items-center space-x-1 font-black text-teal-600 dark:text-teal-400 text-sm sm:text-base">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>{score}</span>
          </div>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
        {/* Animated Countdown indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="flex items-center space-x-1 text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Thời gian còn lại</span>
            </span>
            <span
              className={`font-black ${
                timeLeft <= 5 ? 'text-rose-600 dark:text-rose-400 animate-ping' : 'text-teal-600 dark:text-teal-400'
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
                  : 'bg-teal-500'
              }`}
              style={{ width: `${(timeLeft / baseTime) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Text */}
        {(() => {
          const currentQuestion = currentQ as any;
          const questionText =
            currentQuestion?.question ||
            currentQuestion?.content ||
            currentQuestion?.prompt ||
            currentQuestion?.text ||
            currentQuestion?.questionText ||
            currentQuestion?.title ||
            '';

          return (
            <div className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 md:p-6 mb-5 shadow-sm text-left">
              <div className="text-gray-900 dark:text-slate-100 font-bold text-base md:text-lg leading-relaxed text-left">
                {questionText ? <FormattedMathText text={questionText} /> : 'Đang tải câu hỏi...'}
              </div>
              {currentQ.sourceCitation && (
                <div className="inline-flex items-center space-x-1 text-[11px] font-medium text-teal-600 dark:text-teal-400 mt-2 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-md">
                  <BookOpen className="w-3 h-3" />
                  <span>{currentQ.sourceCitation}</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Options List */}
        <div className="grid grid-cols-1 gap-3 mt-6">
          {(currentQ.options && currentQ.options.length > 0
            ? currentQ.options
            : ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D']
          ).map((option, idx) => {
            const rawOpt = String(option || '');
            const cleanOpt = rawOpt.replace(/^[A-D][.:\)\s]\s*/i, '').trim();

            let buttonStyle =
              'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-gray-900 dark:text-slate-800';

            if (isAnswered) {
              if (idx === currentQ.correctAnswer) {
                buttonStyle =
                  'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/20';
              } else if (selectedOption === idx) {
                buttonStyle =
                  'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20';
              } else {
                buttonStyle =
                  'opacity-50 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(idx)}
                disabled={isAnswered}
                className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 ${buttonStyle} active:scale-[0.99]`}
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1 text-left">
                  <span className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-sm font-black text-gray-900 dark:text-slate-100 shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-base font-medium text-gray-900 dark:text-slate-100 leading-snug text-left flex-1 break-words">
                    <FormattedMathText text={cleanOpt} />
                  </span>
                </div>

                {isAnswered && idx === currentQ.correctAnswer && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                )}
                {isAnswered && selectedOption === idx && idx !== currentQ.correctAnswer && (
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation Footer when answered */}
        {isAnswered && (
          <div className="mt-6 p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 animate-fadeIn">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-teal-800 dark:text-teal-300 mb-1">
              <HelpCircle className="w-4 h-4" />
              <span>Giải thích chuẩn tài liệu:</span>
            </div>
            <div className="text-xs sm:text-sm text-gray-900 dark:text-slate-100 leading-relaxed font-medium">
              <FormattedMathText text={currentQ.explanation || ''} />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-all shadow-md shadow-teal-600/20 active:scale-95"
                id="btn-quiz-next"
              >
                {currentIndex + 1 < questions.length ? 'Câu Tiếp Theo →' : 'Xem Kết Quả 🏆'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Xóa trò chơi này?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Bạn có chắc muốn xóa "{game.title}"? Dữ liệu trò chơi sẽ bị xóa khỏi kho lưu trữ.
            </p>
            <div className="mt-5 flex items-center justify-center space-x-3">
              <button
                onClick={() => setIsConfirmingDelete(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (onDeleteGame) onDeleteGame(game.id);
                  setIsConfirmingDelete(false);
                  onBack();
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Info Modal when finishing quiz with missing info */}
      <GameStudentModal
        isOpen={showStudentInfoModal}
        game={game}
        gameTitle={game.title}
        subject={game.subject}
        gameType="quiz"
        initialScriptUrl={initialScriptUrl}
        onClose={() => {
          setShowStudentInfoModal(false);
          if (pendingQuizFinish) {
            handleFinishQuiz(pendingQuizFinish.finalScore, pendingQuizFinish.finalCorrect, currentStudentInfo);
          }
        }}
        onStartGame={(info) => {
          setCurrentStudentInfo(info);
          setShowStudentInfoModal(false);
          if (pendingQuizFinish) {
            handleFinishQuiz(pendingQuizFinish.finalScore, pendingQuizFinish.finalCorrect, info);
          }
        }}
      />
    </div>
  );
};
