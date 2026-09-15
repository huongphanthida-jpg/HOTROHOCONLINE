import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Trophy, 
  BookOpen, 
  Clock, 
  FolderDown, 
  Layers, 
  Trash2, 
  User, 
  Star,
  CornerDownRight,
  Undo2,
  Check,
  Award
} from 'lucide-react';
import { EducationalGame, DragDropItem, DragDropCategory, StudentInfo } from '../../types';
import { INITIAL_DATA } from '../../data/initialData';
import { soundEffects } from '../../utils/soundEffects';
import { GameSessionResult, syncGameResultToGoogleSheets } from '../../services/sheetSyncService';
import { GameSyncCard } from './GameSyncCard';

interface DragDropGamePlayerProps {
  game: EducationalGame;
  studentInfo: StudentInfo;
  onBack: () => void;
  onUpdateHighScore?: (newScore: number) => void;
  onDeleteGame?: (gameId: string) => void;
  onGameCompleted?: (result: GameSessionResult) => void;
  initialScriptUrl?: string;
}

export const DragDropGamePlayer: React.FC<DragDropGamePlayerProps> = ({
  game,
  studentInfo,
  onBack,
  onUpdateHighScore,
  onDeleteGame,
  onGameCompleted,
  initialScriptUrl,
}) => {
  // Safe student info guarantee
  const safeStudent: StudentInfo = {
    fullName: studentInfo?.fullName?.trim() || 'Học sinh',
    className: studentInfo?.className?.trim() || 'Lớp học',
    groupName: studentInfo?.groupName?.trim() || '',
  };

  // Resolve and normalize dragDropData with fallback
  const sampleDragDrop = INITIAL_DATA.games?.find((g) => g.id === 'game-sample-dragdrop')?.dragDropData;

  const resolvedData = useMemo(() => {
    let rawCats = game.dragDropData?.categories;
    let rawItems = game.dragDropData?.items;

    // Check if sample game was loaded without data or corrupted
    if ((!rawCats || rawCats.length === 0 || !rawItems || rawItems.length === 0) && sampleDragDrop) {
      if (game.id === 'game-sample-dragdrop' || !game.dragDropData) {
        rawCats = sampleDragDrop.categories;
        rawItems = sampleDragDrop.items;
      }
    }

    // Default categories if missing
    if (!rawCats || rawCats.length === 0) {
      rawCats = [
        { id: 'cat_1', title: 'Hộp 1: Mệnh đề Đúng / Đặc trưng', color: 'teal', description: 'Các khẳng định hoặc dấu hiệu chính xác' },
        { id: 'cat_2', title: 'Hộp 2: Mệnh đề Sai / Nhầm lẫn', color: 'rose', description: 'Các trường hợp vi phạm hoặc nhầm lẫn' },
      ];
    }

    const categories: DragDropCategory[] = rawCats.map((cat: any, idx: number) => ({
      id: String(cat?.id || `cat_${idx + 1}`),
      title: String(cat?.title || cat?.name || cat?.label || `Hộp ${idx + 1}`),
      description: cat?.description ? String(cat.description) : undefined,
      color: cat?.color || (idx === 0 ? 'teal' : idx === 1 ? 'indigo' : 'rose'),
    }));

    const validCatIds = new Set(categories.map((c) => c.id));
    const defaultCatId = categories[0]?.id || 'cat_1';

    let items: DragDropItem[] = [];
    if (rawItems && rawItems.length > 0) {
      items = rawItems.map((it: any, idx: number) => {
        const rawCatId = String(it?.categoryId || it?.category_id || it?.category || it?.targetCategoryId || '');
        return {
          id: String(it?.id || `item_${idx + 1}`),
          text: String(it?.text || it?.content || it?.label || it?.name || `Thẻ ${idx + 1}`),
          categoryId: validCatIds.has(rawCatId) ? rawCatId : defaultCatId,
        };
      });
    } else {
      items = [
        { id: 'item_1', text: `Định lý & tính chất đặc trưng của ${game.title}`, categoryId: categories[0]?.id || 'cat_1' },
        { id: 'item_2', text: 'Điều kiện đủ thỏa mãn nghiệm của bài toán', categoryId: categories[0]?.id || 'cat_1' },
        { id: 'item_3', text: 'Trường hợp ngoại lệ thiếu giả thiết ban đầu', categoryId: categories[1]?.id || categories[0]?.id || 'cat_1' },
        { id: 'item_4', text: 'Nhầm lẫn phổ biến khi xét dấu đạo hàm / biểu thức', categoryId: categories[1]?.id || categories[0]?.id || 'cat_1' },
      ];
    }

    return {
      instruction: game.dragDropData?.instruction || 'Hãy kéo các thẻ mệnh đề bên dưới (hoặc bấm chọn) vào đúng hộp phân loại!',
      categories,
      items,
    };
  }, [game, sampleDragDrop]);

  const { categories, items: initialItems, instruction } = resolvedData;

  // State: placements mapping item.id -> category.id
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Sync state for Google Sheets
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [gameResult, setGameResult] = useState<GameSessionResult | null>(null);

  // Timer
  useEffect(() => {
    if (isGameOver || isEvaluated) return;
    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isGameOver, isEvaluated]);

  // Listen for Escape key to exit cleanly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  // Restart / Reset
  const handleRestart = () => {
    setPlacements({});
    setSelectedItemId(null);
    setDraggedItemId(null);
    setDragOverZone(null);
    setIsEvaluated(false);
    setIsGameOver(false);
    setScore(0);
    setSeconds(0);
    setSyncStatus('idle');
    setSyncMessage('');
    setGameResult(null);
  };

  // Color styling helper
  const getCategoryColorStyles = (color?: string) => {
    switch (color) {
      case 'teal':
        return {
          border: 'border-teal-300 dark:border-teal-700',
          bg: 'bg-teal-50/70 dark:bg-teal-950/30',
          badge: 'bg-teal-600 text-white',
          text: 'text-teal-900 dark:text-teal-200',
          btnDirect: 'bg-teal-100 hover:bg-teal-600 hover:text-white text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 border-teal-200 dark:border-teal-800',
          highlight: 'ring-4 ring-teal-400/50 border-teal-500 bg-teal-100/40 dark:bg-teal-900/40',
        };
      case 'indigo':
        return {
          border: 'border-indigo-300 dark:border-indigo-700',
          bg: 'bg-indigo-50/70 dark:bg-indigo-950/30',
          badge: 'bg-indigo-600 text-white',
          text: 'text-indigo-900 dark:text-indigo-200',
          btnDirect: 'bg-indigo-100 hover:bg-indigo-600 hover:text-white text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800',
          highlight: 'ring-4 ring-indigo-400/50 border-indigo-500 bg-indigo-100/40 dark:bg-indigo-900/40',
        };
      case 'rose':
        return {
          border: 'border-rose-300 dark:border-rose-700',
          bg: 'bg-rose-50/70 dark:bg-rose-950/30',
          badge: 'bg-rose-600 text-white',
          text: 'text-rose-900 dark:text-rose-200',
          btnDirect: 'bg-rose-100 hover:bg-rose-600 hover:text-white text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border-rose-200 dark:border-rose-800',
          highlight: 'ring-4 ring-rose-400/50 border-rose-500 bg-rose-100/40 dark:bg-rose-900/40',
        };
      case 'amber':
        return {
          border: 'border-amber-300 dark:border-amber-700',
          bg: 'bg-amber-50/70 dark:bg-amber-950/30',
          badge: 'bg-amber-600 text-white',
          text: 'text-amber-900 dark:text-amber-200',
          btnDirect: 'bg-amber-100 hover:bg-amber-600 hover:text-white text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-200 dark:border-amber-800',
          highlight: 'ring-4 ring-amber-400/50 border-amber-500 bg-amber-100/40 dark:bg-amber-900/40',
        };
      case 'emerald':
        return {
          border: 'border-emerald-300 dark:border-emerald-700',
          bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
          badge: 'bg-emerald-600 text-white',
          text: 'text-emerald-900 dark:text-emerald-200',
          btnDirect: 'bg-emerald-100 hover:bg-emerald-600 hover:text-white text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
          highlight: 'ring-4 ring-emerald-400/50 border-emerald-500 bg-emerald-100/40 dark:bg-emerald-900/40',
        };
      default:
        return {
          border: 'border-slate-300 dark:border-slate-700',
          bg: 'bg-slate-50/70 dark:bg-slate-900/40',
          badge: 'bg-slate-700 text-white',
          text: 'text-slate-900 dark:text-slate-200',
          btnDirect: 'bg-slate-100 hover:bg-slate-700 hover:text-white text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
          highlight: 'ring-4 ring-slate-400/50 border-slate-500 bg-slate-100/40 dark:bg-slate-900/40',
        };
    }
  };

  // Standard Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    if (isEvaluated) return;
    setDraggedItemId(itemId);
    try {
      e.dataTransfer.setData('text/plain', itemId);
      e.dataTransfer.effectAllowed = 'move';
    } catch {}
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverZone(null);
  };

  const handleDragOver = (e: React.DragEvent, zoneId: string) => {
    e.preventDefault();
    try {
      e.dataTransfer.dropEffect = 'move';
    } catch {}
    if (dragOverZone !== zoneId) {
      setDragOverZone(zoneId);
    }
  };

  const handleDropToCategory = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    setDragOverZone(null);
    if (isEvaluated) return;

    let itemId = draggedItemId;
    try {
      const data = e.dataTransfer.getData('text/plain');
      if (data) itemId = data;
    } catch {}

    if (itemId) {
      soundEffects.playClick();
      setPlacements((prev) => ({ ...prev, [itemId!]: categoryId }));
      if (selectedItemId === itemId) setSelectedItemId(null);
    }
    setDraggedItemId(null);
  };

  const handleDropToUnplaced = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverZone(null);
    if (isEvaluated) return;

    let itemId = draggedItemId;
    try {
      const data = e.dataTransfer.getData('text/plain');
      if (data) itemId = data;
    } catch {}

    if (itemId) {
      soundEffects.playClick();
      setPlacements((prev) => {
        const next = { ...prev };
        delete next[itemId!];
        return next;
      });
      if (selectedItemId === itemId) setSelectedItemId(null);
    }
    setDraggedItemId(null);
  };

  // Direct 1-click assign button
  const handleAssignItem = (itemId: string, categoryId: string) => {
    if (isEvaluated) return;
    soundEffects.playClick();
    setPlacements((prev) => ({ ...prev, [itemId]: categoryId }));
    if (selectedItemId === itemId) setSelectedItemId(null);
  };

  // Remove item from bucket back to unplaced pool
  const handleUnplaceItem = (itemId: string) => {
    if (isEvaluated) return;
    soundEffects.playClick();
    setPlacements((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    if (selectedItemId === itemId) setSelectedItemId(null);
  };

  // Item click handling
  const handleItemClick = (itemId: string) => {
    if (isEvaluated) return;
    soundEffects.playClick();
    if (placements[itemId]) {
      // If already in a box, clicking it returns it to unplaced pool
      handleUnplaceItem(itemId);
    } else {
      // Toggle selection for click-to-place
      setSelectedItemId((prev) => (prev === itemId ? null : itemId));
    }
  };

  // Bucket click handling (when an item is currently selected)
  const handleCategoryBoxClick = (categoryId: string) => {
    if (isEvaluated || !selectedItemId) return;
    soundEffects.playClick();
    setPlacements((prev) => ({ ...prev, [selectedItemId]: categoryId }));
    setSelectedItemId(null);
  };

  // Evaluation & Results
  const handleCheckResults = () => {
    if (initialItems.length === 0) return;
    let correct = 0;
    initialItems.forEach((item) => {
      if (placements[item.id] === item.categoryId) {
        correct++;
      }
    });

    const calculatedScore = Math.round((correct / initialItems.length) * 1000);
    const score10 = Number(((correct / initialItems.length) * 10).toFixed(1));
    const timeSpentSec = Math.max(1, seconds);

    setScore(calculatedScore);
    setIsEvaluated(true);

    const resultObj: GameSessionResult = {
      gameId: game.id,
      gameTitle: game.title,
      gameType: 'drag_drop',
      subject: game.subject,
      studentInfo: safeStudent,
      score: score10,
      rawScore: calculatedScore,
      correctCount: correct,
      totalCount: initialItems.length,
      timeSpent: timeSpentSec,
      submittedAt: new Date().toLocaleString('vi-VN'),
      detailsSummary: `Đúng ${correct}/${initialItems.length} thẻ phân loại • Điểm: ${calculatedScore}đ • Thời gian: ${formatTime(timeSpentSec)}`,
    };

    setGameResult(resultObj);
    if (onGameCompleted) onGameCompleted(resultObj);

    if (correct === initialItems.length) {
      soundEffects.playCelebration();
      setIsGameOver(true);
      if (onUpdateHighScore) onUpdateHighScore(calculatedScore);
    } else if (correct > 0) {
      soundEffects.playMatch();
    } else {
      soundEffects.playWrong();
    }

    // Auto-sync with Google Sheets
    triggerSync(resultObj);
  };

  const triggerSync = async (resultObj?: GameSessionResult, customUrl?: string) => {
    const resToSync = resultObj || gameResult;
    if (!resToSync) return;

    setSyncStatus('syncing');
    setSyncMessage('Đang gửi kết quả kéo thả về Google Sheets của giáo viên...');

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

  const unplacedItems = initialItems.filter((it) => !placements[it.id]);
  const totalCorrect = initialItems.filter((it) => placements[it.id] === it.categoryId).length;
  const selectedItem = initialItems.find((it) => it.id === selectedItemId);

  // If Game Over / Perfect Win screen
  if (isGameOver) {
    const stars = totalCorrect === initialItems.length ? 3 : totalCorrect >= initialItems.length * 0.7 ? 2 : 1;
    const score10 = Number(((totalCorrect / initialItems.length) * 10).toFixed(1));

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
          Hoàn Thành Kéo Thả!
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {game.title} • {game.subject}
        </p>

        {/* Student identification badge */}
        <div className="mt-4 inline-flex items-center space-x-2 px-3.5 py-1.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl text-xs font-bold text-teal-800 dark:text-teal-200">
          <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Học sinh: {safeStudent.fullName}</span>
          <span className="text-teal-400">•</span>
          <span>Lớp: {safeStudent.className}</span>
          {safeStudent.groupName && (
            <>
              <span className="text-teal-400">•</span>
              <span>Tổ: {safeStudent.groupName}</span>
            </>
          )}
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-3 gap-3 my-6">
          <div className="bg-slate-50 dark:bg-slate-750 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-400 font-bold uppercase">Điểm số</div>
            <div className="text-2xl font-black text-amber-500 mt-1">
              {score}
              <span className="text-xs text-slate-400 font-normal ml-1">({score10}/10)</span>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-750 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-400 font-bold uppercase">Chính xác</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {totalCorrect}/{initialItems.length}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-750 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-400 font-bold uppercase">Thời gian</div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {formatTime(seconds)}
            </div>
          </div>
        </div>

        {/* Google Sheets Sync Card */}
        {gameResult && (
          <div className="my-6 text-left">
            <GameSyncCard
              result={gameResult}
              syncStatus={syncStatus}
              syncMessage={syncMessage}
              onRetrySync={(url) => triggerSync(undefined, url)}
              initialScriptUrl={initialScriptUrl}
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-center space-x-3 pt-2">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách</span>
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-colors shadow-md shadow-teal-600/20 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Chơi lại</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 sticky top-2 z-20 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            id="btn-dragdrop-back"
            title="Quay lại kho trò chơi"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>

          {onDeleteGame && (
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
              title="Xóa trò chơi này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Student Info Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl text-xs font-bold text-teal-800 dark:text-teal-200">
            <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="truncate max-w-[130px]">{safeStudent.fullName}</span>
            <span className="text-teal-300 dark:text-teal-600">•</span>
            <span>{safeStudent.className}</span>
          </div>
        </div>

        {/* Stats: Placed count & Timer */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Đã xếp: <strong className="text-teal-600 dark:text-teal-400">{Object.keys(placements).length}</strong> / {initialItems.length}</span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>{formatTime(seconds)}</span>
          </div>

          <button
            onClick={handleRestart}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Làm lại từ đầu"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Instructions Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2 mb-1.5">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
            KÉO THẢ PHÂN LOẠI
          </span>
          <span className="text-xs font-bold text-slate-400">
            {game.subject}
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
          {game.title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
          {instruction}
        </p>

        {/* Source citation */}
        {game.sourceCitations && game.sourceCitations.length > 0 && (
          <div className="mt-3 inline-flex items-center space-x-1.5 text-xs text-teal-700 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/30 px-2.5 py-1 rounded-lg border border-teal-200/50 dark:border-teal-800/50">
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>Nguồn SGK: {game.sourceCitations.join(' • ')}</span>
          </div>
        )}
      </div>

      {/* Active Selection Banner */}
      {selectedItem && !isEvaluated && (
        <div className="bg-teal-600 text-white p-3.5 rounded-2xl shadow-md border border-teal-500 flex flex-wrap items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center font-black text-xs">
              ✓
            </div>
            <div>
              <div className="text-[10px] font-bold text-teal-100 uppercase tracking-wide">
                ĐANG CHỌN THẺ:
              </div>
              <div className="text-xs sm:text-sm font-black line-clamp-1">
                "{selectedItem.text}"
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-teal-100 hidden sm:inline">
              👉 Bấm vào bất kỳ hộp nào bên dưới để chuyển thẻ vào!
            </span>
            <button
              type="button"
              onClick={() => setSelectedItemId(null)}
              className="px-3 py-1 bg-white/20 hover:bg-white text-teal-950 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95"
            >
              ✕ Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Unplaced Items Pool */}
      <div
        onDragOver={(e) => handleDragOver(e, 'unplaced')}
        onDrop={handleDropToUnplaced}
        className={`bg-slate-100/90 dark:bg-slate-850 p-4 sm:p-5 rounded-3xl border-2 transition-all ${
          dragOverZone === 'unplaced'
            ? 'border-teal-500 ring-4 ring-teal-400/40 bg-teal-50/50 dark:bg-teal-950/40'
            : selectedItemId
            ? 'border-dashed border-teal-300 dark:border-teal-700'
            : 'border-dashed border-slate-300 dark:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center space-x-2">
            <FolderDown className="w-4 h-4 text-teal-600" />
            <span>KHO THẺ CHƯA PHÂN LOẠI ({unplacedItems.length})</span>
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Kéo thả thẻ vào hộp, hoặc bấm chọn thẻ rồi chạm vào hộp
          </span>
        </div>

        {unplacedItems.length === 0 ? (
          <div className="p-6 text-center text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Đã phân loại hết tất cả {initialItems.length} thẻ! Bấm "Kiểm Tra Kết Quả" bên dưới để chấm điểm.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unplacedItems.map((item) => {
              const isSelected = selectedItemId === item.id;
              const isBeingDragged = draggedItemId === item.id;

              return (
                <div
                  key={item.id}
                  draggable={!isEvaluated}
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleItemClick(item.id)}
                  className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium shadow-xs transition-all select-none flex flex-col justify-between cursor-pointer ${
                    isBeingDragged
                      ? 'opacity-40 scale-95 border-dashed border-teal-500'
                      : isSelected
                      ? 'bg-teal-600 text-white border-teal-700 ring-4 ring-teal-500/40 scale-[1.02] shadow-md'
                      : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-teal-400 hover:shadow-sm'
                  }`}
                >
                  <div className="leading-snug font-semibold">{item.text}</div>

                  {isSelected && (
                    <div className="mt-3 pt-2 border-t border-white/20 text-[11px] font-bold text-teal-100 flex items-center justify-between">
                      <span>✓ Đang chọn thẻ</span>
                      <span>Chạm vào hộp bên dưới 👇</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Buckets */}
      <div className={`grid grid-cols-1 ${categories.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
        {categories.map((category, cIdx) => {
          const style = getCategoryColorStyles(category.color);
          const placedInThisCategory = initialItems.filter(
            (it) => placements[it.id] === category.id
          );
          const isZoneHovered = dragOverZone === category.id;

          return (
            <div
              key={category.id}
              onDragOver={(e) => handleDragOver(e, category.id)}
              onDrop={(e) => handleDropToCategory(e, category.id)}
              onClick={() => handleCategoryBoxClick(category.id)}
              className={`rounded-3xl border-2 transition-all p-4 sm:p-5 flex flex-col justify-between min-h-[260px] ${style.bg} ${style.border} ${
                isZoneHovered
                  ? style.highlight
                  : selectedItemId
                  ? 'ring-2 ring-teal-400 cursor-pointer hover:border-teal-500'
                  : ''
              }`}
            >
              <div>
                {/* Category Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-3 py-1 rounded-xl text-xs font-black shadow-xs ${style.badge}`}>
                    {category.title}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-800/60 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                    {placedInThisCategory.length} thẻ
                  </span>
                </div>

                {category.description && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-3 leading-tight">
                    {category.description}
                  </p>
                )}

                {/* If card is selected, show click-to-place prompt */}
                {selectedItemId && !isEvaluated && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCategoryBoxClick(category.id);
                    }}
                    className="w-full mb-3 py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-teal-600/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
                  >
                    <CornerDownRight className="w-4 h-4" />
                    <span>👉 ĐẶT THẺ ĐANG CHỌN VÀO HỘP NÀY</span>
                  </button>
                )}

                {/* Placed Items List */}
                <div className="space-y-2 mt-2">
                  {placedInThisCategory.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 italic border-2 border-dashed border-slate-300/80 dark:border-slate-700/80 rounded-2xl flex flex-col items-center justify-center space-y-1">
                      <span className="font-bold">Hộp chưa có thẻ</span>
                      <span className="text-[10px] text-slate-400">
                        (Kéo thẻ thả vào đây hoặc bấm chọn thẻ rồi chạm vào hộp)
                      </span>
                    </div>
                  ) : (
                    placedInThisCategory.map((item) => {
                      const isCorrect = item.categoryId === category.id;
                      let itemBorder = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800';

                      if (isEvaluated) {
                        if (isCorrect) {
                          itemBorder = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100';
                        } else {
                          itemBorder = 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-100';
                        }
                      }

                      return (
                        <div
                          key={item.id}
                          draggable={!isEvaluated}
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          onDragEnd={handleDragEnd}
                          className={`p-3 rounded-2xl border text-xs sm:text-sm font-medium shadow-xs transition-all flex flex-col justify-between ${itemBorder}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="leading-snug font-semibold">{item.text}</span>
                            {isEvaluated && (
                              isCorrect ? (
                                <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-xs font-black shrink-0">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Đúng</span>
                                </span>
                              ) : (
                                <span className="flex items-center space-x-1 text-rose-600 dark:text-rose-400 text-xs font-black shrink-0">
                                  <XCircle className="w-4 h-4" />
                                  <span>Sai</span>
                                </span>
                              )
                            )}
                          </div>

                          {/* Quick Return Button */}
                          {!isEvaluated && (
                            <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnplaceItem(item.id);
                                }}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 transition-all flex items-center space-x-1 cursor-pointer active:scale-95"
                                title="Đưa thẻ trở lại kho chưa phân loại"
                              >
                                <Undo2 className="w-3 h-3" />
                                <span>Trả về kho</span>
                              </button>

                              <span className="text-[10px] text-slate-400">
                                Có thể kéo sang hộp khác
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
        <div>
          {isEvaluated ? (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-500 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black text-slate-800 dark:text-white">
                  Đúng {totalCorrect} / {initialItems.length} thẻ ({score} điểm • {((totalCorrect / initialItems.length) * 10).toFixed(1)}/10đ)
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {totalCorrect === initialItems.length
                    ? '🎉 Xuất sắc! Phân loại chính xác 100%.'
                    : '💡 Bấm nút "Trả về kho" trên các thẻ [Sai] để điều chỉnh lại.'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {Object.keys(placements).length < initialItems.length
                ? `Đã xếp ${Object.keys(placements).length}/${initialItems.length} thẻ. Hãy phân loại hết trước khi kiểm tra!`
                : 'Tất cả thẻ đã được xếp vào hộp! Bấm "Kiểm Tra Kết Quả" để chấm điểm.'}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer active:scale-95"
            id="btn-dragdrop-footer-back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>

          {isEvaluated && (
            <button
              onClick={handleRestart}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer active:scale-95"
            >
              Làm lại
            </button>
          )}

          <button
            onClick={handleCheckResults}
            disabled={Object.keys(placements).length === 0}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-extrabold text-xs transition-all shadow-md shadow-teal-600/20 active:scale-95 flex items-center space-x-2 cursor-pointer"
            id="btn-dragdrop-check"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Kiểm Tra Kết Quả</span>
          </button>
        </div>
      </div>

      {/* Google Sheets Sync Card after Evaluation */}
      {isEvaluated && gameResult && (
        <GameSyncCard
          result={gameResult}
          syncStatus={syncStatus}
          syncMessage={syncMessage}
          onRetrySync={(url) => triggerSync(undefined, url)}
          initialScriptUrl={initialScriptUrl}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-center animate-scaleIn">
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

export default DragDropGamePlayer;
