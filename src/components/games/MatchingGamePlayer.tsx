import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  RotateCcw, 
  Sparkles, 
  Trophy, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  HelpCircle,
  Flame,
  Star,
  Trash2,
  User,
  School
} from 'lucide-react';
import { EducationalGame, MatchingPair, StudentInfo } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
import { GameSessionResult, syncGameResultToGoogleSheets } from '../../services/sheetSyncService';
import { GameSyncCard } from './GameSyncCard';

interface MatchingGamePlayerProps {
  game: EducationalGame;
  studentInfo: StudentInfo;
  onBack: () => void;
  onUpdateHighScore?: (newScore: number) => void;
  onDeleteGame?: (gameId: string) => void;
  onGameCompleted?: (result: GameSessionResult) => void;
  initialScriptUrl?: string;
}

export const MatchingGamePlayer: React.FC<MatchingGamePlayerProps> = ({
  game,
  studentInfo,
  onBack,
  onUpdateHighScore,
  onDeleteGame,
  onGameCompleted,
  initialScriptUrl,
}) => {
  const originalPairs: MatchingPair[] = game.matchingData?.pairs || [];

  const [leftCards, setLeftCards] = useState<{ id: string; term: string; pairId: string }[]>([]);
  const [rightCards, setRightCards] = useState<{ id: string; definition: string; pairId: string }[]>([]);
  
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [wrongSelection, setWrongSelection] = useState<{ leftId: string; rightId: string } | null>(null);
  
  const [mistakes, setMistakes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Sync state for Google Sheets
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [gameResult, setGameResult] = useState<GameSessionResult | null>(null);

  // Initialize & shuffle
  useEffect(() => {
    initializeGame();
  }, [game]);

  // Timer
  useEffect(() => {
    if (isGameOver || matchedPairIds.length === originalPairs.length) return;
    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isGameOver, matchedPairIds.length, originalPairs.length]);

  const initializeGame = () => {
    // Left column: terms
    const left = originalPairs.map((p) => ({
      id: `left-${p.id}`,
      term: p.term,
      pairId: p.id,
    }));

    // Right column: definitions, shuffled
    const right = originalPairs.map((p) => ({
      id: `right-${p.id}`,
      definition: p.definition,
      pairId: p.id,
    })).sort(() => Math.random() - 0.5);

    setLeftCards(left);
    setRightCards(right);
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatchedPairIds([]);
    setWrongSelection(null);
    setMistakes(0);
    setSeconds(0);
    setIsGameOver(false);
    setScore(0);
  };

  const handleSelectLeft = (cardId: string, pairId: string) => {
    if (matchedPairIds.includes(pairId) || wrongSelection) return;
    soundEffects.playClick();
    setSelectedLeft(cardId);

    if (selectedRight) {
      checkMatch(pairId, getPairIdFromRight(selectedRight));
    }
  };

  const handleSelectRight = (cardId: string, pairId: string) => {
    if (matchedPairIds.includes(pairId) || wrongSelection) return;
    soundEffects.playClick();
    setSelectedRight(cardId);

    if (selectedLeft) {
      checkMatch(getPairIdFromLeft(selectedLeft), pairId);
    }
  };

  const getPairIdFromLeft = (leftId: string) => {
    return leftCards.find((c) => c.id === leftId)?.pairId || '';
  };

  const getPairIdFromRight = (rightId: string) => {
    return rightCards.find((c) => c.id === rightId)?.pairId || '';
  };

  const checkMatch = (leftPairId: string, rightPairId: string) => {
    if (leftPairId === rightPairId) {
      // MATCH!
      soundEffects.playMatch();
      const updatedMatches = [...matchedPairIds, leftPairId];
      setMatchedPairIds(updatedMatches);
      setSelectedLeft(null);
      setSelectedRight(null);

      // Check if finished
      if (updatedMatches.length === originalPairs.length) {
        finishGame(updatedMatches.length, mistakes, seconds);
      }
    } else {
      // MISMATCH
      soundEffects.playWrong();
      setMistakes((m) => m + 1);
      setWrongSelection({ leftId: selectedLeft || '', rightId: selectedRight || '' });

      setTimeout(() => {
        setWrongSelection(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 700);
    }
  };

  const finishGame = (totalPairs: number, totalMistakes: number, totalSeconds: number) => {
    soundEffects.playCelebration();
    // Scoring: 1000 base - (seconds * 4) - (mistakes * 60)
    const calculatedScore = Math.max(100, 1000 - totalSeconds * 4 - totalMistakes * 60);
    const score10 = Math.max(5.0, Number((10 - totalMistakes * 0.5).toFixed(1)));
    setScore(calculatedScore);
    setIsGameOver(true);
    if (onUpdateHighScore) onUpdateHighScore(calculatedScore);

    const resultObj: GameSessionResult = {
      gameId: game.id,
      gameTitle: game.title,
      gameType: 'matching',
      subject: game.subject,
      studentInfo,
      score: score10,
      rawScore: calculatedScore,
      correctCount: totalPairs,
      totalCount: totalPairs,
      timeSpent: totalSeconds,
      submittedAt: new Date().toLocaleString('vi-VN'),
      detailsSummary: `Ghép đúng ${totalPairs}/${totalPairs} cặp • ${totalMistakes} lỗi sai • Thời gian: ${formatTime(totalSeconds)}`,
    };

    setGameResult(resultObj);
    if (onGameCompleted) onGameCompleted(resultObj);

    // Auto sync to Google Sheets
    triggerSync(resultObj);
  };

  const triggerSync = async (resultObj?: GameSessionResult, customUrl?: string) => {
    const resToSync = resultObj || gameResult;
    if (!resToSync) return;

    setSyncStatus('syncing');
    setSyncMessage('Đang gửi kết quả ghép cặp về Google Sheets của giáo viên...');

    const res = await syncGameResultToGoogleSheets(resToSync, customUrl || initialScriptUrl);
    if (res.success) {
      setSyncStatus('success');
      setSyncMessage(res.message);
    } else {
      setSyncStatus('error');
      setSyncMessage(res.message);
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isGameOver) {
    const stars = mistakes === 0 && seconds <= 40 ? 3 : mistakes <= 2 ? 2 : 1;
    const score10 = Math.max(5.0, Number((10 - mistakes * 0.5).toFixed(1)));

    const fallbackResult: GameSessionResult = {
      gameId: game.id,
      gameTitle: game.title,
      gameType: 'matching',
      subject: game.subject,
      studentInfo,
      score: score10,
      rawScore: score,
      correctCount: originalPairs.length,
      totalCount: originalPairs.length,
      timeSpent: seconds,
      submittedAt: new Date().toLocaleString('vi-VN'),
    };

    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200 dark:border-slate-700 text-center animate-fadeIn">
        <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-500 flex items-center justify-center mb-4">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="flex items-center justify-center space-x-1.5 mb-2">
          {[1, 2, 3].map((st) => (
            <Star
              key={st}
              className={`w-7 h-7 ${
                st <= stars
                  ? 'text-amber-400 fill-amber-400 animate-pulse'
                  : 'text-slate-200 dark:text-slate-700'
              }`}
            />
          ))}
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white">
          Ghép Cặp Hoàn Tất!
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-8">
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <div className="text-xs text-slate-400 uppercase font-semibold">Điểm Thang 10</div>
            <div className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-400 mt-1">
              {score10}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{score} điểm game</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <div className="text-xs text-slate-400 uppercase font-semibold">Thời Gian</div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {formatTime(seconds)}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <div className="text-xs text-slate-400 uppercase font-semibold">Số Lần Sai</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-500 mt-1">
              {mistakes}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <div className="text-xs text-slate-400 uppercase font-semibold">Đã Ghép</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {originalPairs.length}/{originalPairs.length}
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
            onClick={initializeGame}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition-all shadow-md shadow-teal-600/20 active:scale-95"
            id="btn-matching-replay"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Chơi Lại</span>
          </button>
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold transition-all active:scale-95"
            id="btn-matching-back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kho Trò Chơi</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Top Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Thoát Trò Chơi</span>
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
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl text-xs font-bold text-teal-800 dark:text-teal-200 ml-1">
            <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="truncate max-w-[130px]">{studentInfo.fullName}</span>
            <span className="text-teal-300 dark:text-teal-600">•</span>
            <span>{studentInfo.className}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Clock className="w-4 h-4 text-teal-600" />
            <span>{formatTime(seconds)}</span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Đã ghép: {matchedPairIds.length} / {originalPairs.length}</span>
          </div>
        </div>

        <button
          onClick={initializeGame}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold flex items-center space-x-1"
          title="Chơi lại ván mới"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Trộn lại</span>
        </button>
      </div>

      {/* Instruction Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
        <h2 className="text-xl font-black text-slate-800 dark:text-white">
          {game.title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {game.matchingData?.instruction || game.description}
        </p>
      </div>

      {/* Dual Column Card Matching Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Column Left: Terms */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 flex items-center justify-between">
            <span>CỘT A: THUẬT NGỮ / KHÁI NIỆM</span>
            <span>{matchedPairIds.length}/{originalPairs.length}</span>
          </div>

          {leftCards.map((card) => {
            const isMatched = matchedPairIds.includes(card.pairId);
            const isSelected = selectedLeft === card.id;
            const isWrong = wrongSelection?.leftId === card.id;

            let cardStyle = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-400 text-slate-800 dark:text-slate-100 shadow-xs';

            if (isMatched) {
              cardStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 opacity-60 pointer-events-none';
            } else if (isWrong) {
              cardStyle = 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20 animate-shake';
            } else if (isSelected) {
              cardStyle = 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-100 ring-4 ring-teal-500/20 scale-[1.02] shadow-md';
            }

            return (
              <div
                key={card.id}
                onClick={() => handleSelectLeft(card.id, card.pairId)}
                className={`p-4 rounded-2xl border text-sm sm:text-base font-bold transition-all cursor-pointer select-none flex items-center justify-between ${cardStyle}`}
              >
                <span>{card.term}</span>
                {isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
              </div>
            );
          })}
        </div>

        {/* Column Right: Definitions */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 flex items-center justify-between">
            <span>CỘT B: ĐỊNH NGHĨA / Ý NGHĨA</span>
            <span>Trộn ngẫu nhiên</span>
          </div>

          {rightCards.map((card) => {
            const isMatched = matchedPairIds.includes(card.pairId);
            const isSelected = selectedRight === card.id;
            const isWrong = wrongSelection?.rightId === card.id;

            let cardStyle = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-400 text-slate-800 dark:text-slate-100 shadow-xs';

            if (isMatched) {
              cardStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 opacity-60 pointer-events-none';
            } else if (isWrong) {
              cardStyle = 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20 animate-shake';
            } else if (isSelected) {
              cardStyle = 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-100 ring-4 ring-teal-500/20 scale-[1.02] shadow-md';
            }

            return (
              <div
                key={card.id}
                onClick={() => handleSelectRight(card.id, card.pairId)}
                className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium transition-all cursor-pointer select-none flex items-center justify-between ${cardStyle}`}
              >
                <span className="leading-relaxed">{card.definition}</span>
                {isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
              </div>
            );
          })}
        </div>
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
    </div>
  );
};
