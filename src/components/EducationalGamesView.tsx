import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, 
  Plus, 
  Search, 
  Zap, 
  Layers, 
  Sparkles, 
  Trophy, 
  Clock, 
  BookOpen, 
  Play, 
  Trash2, 
  Filter,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Check,
  QrCode,
  Key,
  Copy,
  Edit3
} from 'lucide-react';
import { EducationalGame, GameType, DocumentLearning, StudentInfo, UserRole } from '../types';
import { GameSessionResult } from '../services/sheetSyncService';
import { QuizGamePlayer } from './games/QuizGamePlayer';
import { DragDropGamePlayer } from './games/DragDropGamePlayer';
import { MatchingGamePlayer } from './games/MatchingGamePlayer';
import { CreateGameModal } from './games/CreateGameModal';
import { EditGameModal } from './games/EditGameModal';
import { GameStudentModal } from './games/GameStudentModal';
import { QRCodeShareModal } from './QRCodeShareModal';

interface EducationalGamesViewProps {
  games: EducationalGame[];
  documents: DocumentLearning[];
  initialGameId?: string | null;
  onSaveGame: (newGame: EducationalGame) => void;
  onUpdateGameHighScore: (gameId: string, newScore: number) => void;
  onDeleteGame?: (gameId: string) => void;
  onClearAllGames?: () => void;
  onRestoreDefaultGames?: () => void;
  onRecordGameSession?: (result: GameSessionResult) => void;
  googleScriptUrl?: string;
  userRole?: UserRole;
  isDirectSingleTaskMode?: boolean;
}

export const EducationalGamesView: React.FC<EducationalGamesViewProps> = ({
  games,
  documents,
  initialGameId,
  onSaveGame,
  onUpdateGameHighScore,
  onDeleteGame,
  onClearAllGames,
  onRestoreDefaultGames,
  onRecordGameSession,
  googleScriptUrl,
  userRole = 'teacher',
  isDirectSingleTaskMode = false,
}) => {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<GameType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [gameToEdit, setGameToEdit] = useState<EducationalGame | null>(null);
  const [gameToDelete, setGameToDelete] = useState<EducationalGame | null>(null);
  const [qrGame, setQrGame] = useState<EducationalGame | null>(null);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Student info modal & mandatory registration before playing
  const [selectedGameForPlay, setSelectedGameForPlay] = useState<EducationalGame | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [currentStudentInfo, setCurrentStudentInfo] = useState<StudentInfo | null>(() => {
    try {
      const saved = localStorage.getItem('last_student_info');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });
  const [scriptUrl, setScriptUrl] = useState<string>(() => {
    return googleScriptUrl || localStorage.getItem('google_apps_script_url') || '';
  });

  // Handle direct access via QR Code or URL param
  useEffect(() => {
    if (initialGameId && games.length > 0) {
      const matchedGame = games.find((g) => g.id === initialGameId);
      if (matchedGame) {
        setSelectedGameForPlay(matchedGame);
        setIsStudentModalOpen(true);
      }
    }
  }, [initialGameId, games]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3200);
  };

  const handleConfirmDeleteSingle = () => {
    if (gameToDelete && onDeleteGame) {
      const title = gameToDelete.title;
      onDeleteGame(gameToDelete.id);
      showToast(`Đã xóa trò chơi "${title}" thành công!`);
    }
    setGameToDelete(null);
  };

  const handleConfirmClearAll = () => {
    if (onClearAllGames) {
      onClearAllGames();
      showToast('Đã xóa tất cả dữ liệu trò chơi học tập!');
    }
    setIsConfirmingClearAll(false);
  };

  const handleRestoreDefaults = () => {
    if (onRestoreDefaultGames) {
      onRestoreDefaultGames();
      showToast('Đã khôi phục các trò chơi mẫu SGK thành công!');
    }
  };

  const handleStartGameClick = (game: EducationalGame) => {
    setSelectedGameForPlay(game);
    setIsStudentModalOpen(true);
  };

  const handleConfirmStudent = (info: StudentInfo, customUrl?: string) => {
    setCurrentStudentInfo(info);
    if (customUrl) {
      setScriptUrl(customUrl);
    }
    setIsStudentModalOpen(false);
    const targetGameId = selectedGameForPlay?.id || activeGameId;
    if (targetGameId) {
      setActiveGameId(targetGameId);
    }
  };

  // Active game
  const activeGame = games.find((g) => g.id === activeGameId);

  // Filtered games
  const filteredGames = games.filter((g) => {
    const matchesType = filterType === 'all' || g.type === filterType;
    const matchesSearch =
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.sourceDocTitle && g.sourceDocTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      g.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Calculate statistics
  const totalGames = games.length;
  const totalPlays = games.reduce((acc, g) => acc + (g.playCount || 0), 0);
  const highestScore = games.reduce((max, g) => Math.max(max, g.highScore || 0), 0);

  // Handle high score updates
  const handleHighScore = (score: number) => {
    if (activeGameId) {
      onUpdateGameHighScore(activeGameId, score);
    }
  };

  // If in an active game, render the specific player
  if (activeGame) {
    if (!currentStudentInfo) {
      return (
        <GameStudentModal
          isOpen={true}
          game={activeGame}
          gameTitle={activeGame.title}
          subject={activeGame.subject}
          gameType={activeGame.type}
          initialScriptUrl={scriptUrl}
          defaultScriptUrl={scriptUrl}
          onClose={() => setActiveGameId(null)}
          onSubmit={handleConfirmStudent}
          onStartGame={handleConfirmStudent}
        />
      );
    }

    if (activeGame.type === 'quiz') {
      return (
        <QuizGamePlayer
          game={activeGame}
          studentInfo={currentStudentInfo}
          initialScriptUrl={scriptUrl}
          onBack={() => setActiveGameId(null)}
          onUpdateHighScore={handleHighScore}
          onGameCompleted={onRecordGameSession}
          onDeleteGame={(id) => {
            if (onDeleteGame) onDeleteGame(id);
            setActiveGameId(null);
            showToast('Đã xóa trò chơi thành công!');
          }}
        />
      );
    } else if (activeGame.type === 'drag_drop') {
      return (
        <DragDropGamePlayer
          game={activeGame}
          studentInfo={currentStudentInfo}
          initialScriptUrl={scriptUrl}
          onBack={() => setActiveGameId(null)}
          onUpdateHighScore={handleHighScore}
          onGameCompleted={onRecordGameSession}
          onDeleteGame={(id) => {
            if (onDeleteGame) onDeleteGame(id);
            setActiveGameId(null);
            showToast('Đã xóa trò chơi thành công!');
          }}
        />
      );
    } else if (activeGame.type === 'matching') {
      return (
        <MatchingGamePlayer
          game={activeGame}
          studentInfo={currentStudentInfo}
          initialScriptUrl={scriptUrl}
          onBack={() => setActiveGameId(null)}
          onUpdateHighScore={handleHighScore}
          onGameCompleted={onRecordGameSession}
          onDeleteGame={(id) => {
            if (onDeleteGame) onDeleteGame(id);
            setActiveGameId(null);
            showToast('Đã xóa trò chơi thành công!');
          }}
        />
      );
    }
  }

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-xl border border-slate-700 dark:border-slate-200 flex items-center space-x-2.5 text-xs font-bold animate-fadeIn backdrop-blur-md">
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
            <Check className="w-3 h-3 stroke-[3]" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Quick Action */}
      <div className="bg-gradient-to-r from-amber-500 via-teal-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <Gamepad2 className="w-64 h-64" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gamification & Học Qua Trò Chơi</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Kho Trò Chơi Học Tập Tương Tác
          </h1>
          <p className="text-white/90 text-xs sm:text-sm mt-2 leading-relaxed">
            Học sâu, nhớ lâu bằng các trò chơi QUIZ tốc độ, KÉO THẢ phân loại khái niệm và GHÉP CẶP thuật ngữ được sinh tự động bằng AI từ nguồn sách giáo khoa và tài liệu bạn tải lên.
          </p>

          {userRole !== 'student' && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-white hover:bg-slate-50 text-teal-800 font-extrabold px-5 py-2.5 rounded-2xl shadow-md transition-all active:scale-95 flex items-center space-x-2 text-sm"
                id="btn-create-game-top"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Trò Chơi Mới Từ Nguồn Tài Liệu</span>
              </button>

              {games.length > 0 && onClearAllGames && (
                <button
                  onClick={() => setIsConfirmingClearAll(true)}
                  className="bg-rose-500/25 hover:bg-rose-500/40 text-white font-bold px-4 py-2.5 rounded-2xl border border-rose-300/40 backdrop-blur-md transition-all active:scale-95 flex items-center space-x-2 text-sm shadow-sm"
                  id="btn-clear-all-games-top"
                  title="Xóa toàn bộ dữ liệu trò chơi"
                >
                  <Trash2 className="w-4 h-4 text-rose-200" />
                  <span>Xóa Hết Dữ Liệu</span>
                </button>
              )}

              {onRestoreDefaultGames && (
                <button
                  onClick={handleRestoreDefaults}
                  className="bg-white/15 hover:bg-white/25 text-white font-bold px-4 py-2.5 rounded-2xl border border-white/30 backdrop-blur-md transition-all active:scale-95 flex items-center space-x-2 text-sm"
                  id="btn-restore-games-top"
                  title="Khôi phục danh sách trò chơi chuẩn SGK ban đầu"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Khôi Phục Mẫu SGK</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Quick Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tổng Số Trò Chơi
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
              {totalGames}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Điểm Kỷ Lục Cao Nhất
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
              {highestScore > 0 ? `${highestScore}đ` : '---'}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Lượt Đã Tham Gia
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
              {totalPlays} lượt
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Type Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'all'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Tất cả ({games.length})
          </button>
          <button
            onClick={() => setFilterType('quiz')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              filterType === 'quiz'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>QUIZ ({games.filter((g) => g.type === 'quiz').length})</span>
          </button>
          <button
            onClick={() => setFilterType('drag_drop')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              filterType === 'drag_drop'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-300" />
            <span>KÉO THẢ ({games.filter((g) => g.type === 'drag_drop').length})</span>
          </button>
          <button
            onClick={() => setFilterType('matching')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              filterType === 'matching'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5 text-teal-300" />
            <span>GHÉP CẶP ({games.filter((g) => g.type === 'matching').length})</span>
          </button>
        </div>

        {/* Search Box & Actions */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm trò chơi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {userRole !== 'student' && (
            <>
              {games.length > 0 && onClearAllGames && (
                <button
                  onClick={() => setIsConfirmingClearAll(true)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/50 transition-all flex items-center space-x-1 shrink-0"
                  title="Xóa toàn bộ trò chơi học tập"
                  id="btn-clear-all-games-toolbar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Xóa Hết Dữ Liệu</span>
                </button>
              )}

              {onRestoreDefaultGames && (
                <button
                  onClick={handleRestoreDefaults}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center space-x-1 shrink-0"
                  title="Khôi phục các trò chơi mẫu chuẩn SGK"
                  id="btn-restore-games-toolbar"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Khôi Phục Mẫu</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Game Cards Grid */}
      {filteredGames.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-xs">
          <Gamepad2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            {games.length === 0 ? 'Hiện tại chưa có trò chơi nào trong kho lưu trữ' : 'Không tìm thấy trò chơi nào phù hợp'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {games.length === 0
              ? 'Kho trò chơi đang trống (hoặc bạn vừa xóa hết dữ liệu). Bạn có thể bấm "Tạo trò chơi ngay" hoặc bấm "Khôi phục mẫu SGK" để nạp lại.'
              : 'Hãy thử đổi từ khóa tìm kiếm hoặc bấm nút "Tạo Trò Chơi Mới" để AI trích xuất trò chơi từ tài liệu của bạn.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-all inline-flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo trò chơi ngay</span>
            </button>
            {onRestoreDefaultGames && (
              <button
                onClick={handleRestoreDefaults}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all inline-flex items-center space-x-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Khôi phục mẫu SGK</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGames.map((game) => {
            let badgeInfo = {
              label: 'QUIZ',
              bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
              icon: Zap,
              countText: `${game.quizData?.questions?.length || 0} câu hỏi`,
            };

            if (game.type === 'drag_drop') {
              badgeInfo = {
                label: 'KÉO THẢ PHÂN LOẠI',
                bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
                icon: Layers,
                countText: `${game.dragDropData?.categories?.length || 0} danh mục • ${game.dragDropData?.items?.length || 0} thẻ`,
              };
            } else if (game.type === 'matching') {
              badgeInfo = {
                label: 'GHÉP CẶP THUẬT NGỮ',
                bg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
                icon: Gamepad2,
                countText: `${game.matchingData?.pairs?.length || 0} cặp tương ứng`,
              };
            }

            const BadgeIcon = badgeInfo.icon;

            return (
              <div
                key={game.id}
                className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Tags */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeInfo.bg}`}
                    >
                      <BadgeIcon className="w-3 h-3" />
                      <span>{badgeInfo.label}</span>
                    </span>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            navigator.clipboard.writeText(game.id);
                          } catch {
                            const input = document.createElement('input');
                            input.value = game.id;
                            document.body.appendChild(input);
                            input.select();
                            document.execCommand('copy');
                            document.body.removeChild(input);
                          }
                          showToast(`Đã chép Mã ID trò chơi: "${game.id}"`);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 text-[10px] font-mono font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                        title="Bấm để sao chép duy nhất Mã ID trò chơi này"
                      >
                        <Key className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        <span>ID: {game.id}</span>
                      </button>

                      <span className="text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-lg">
                        {game.subject}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-800 dark:text-white line-clamp-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {game.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {game.description}
                  </p>

                  {/* Document badge if exists */}
                  {game.sourceDocTitle && (
                    <div className="mt-3 flex items-center space-x-1 text-[11px] text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800">
                      <BookOpen className="w-3 h-3 shrink-0" />
                      <span className="truncate">Nguồn: {game.sourceDocTitle}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Meta & Play Button */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-[11px] text-slate-400 font-semibold">
                      {badgeInfo.countText}
                    </div>
                    {game.highScore !== undefined && game.highScore > 0 && (
                      <div className="text-xs font-extrabold text-amber-500 flex items-center space-x-1">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>Kỷ lục: {game.highScore}đ</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* QR Code Share button for game */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQrGame(game);
                      }}
                      className="p-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 rounded-xl transition-all shadow-2xs active:scale-95 flex items-center justify-center shrink-0"
                      title={`Tạo mã QR & copy link chia sẻ trò chơi "${game.title}" cho Zalo`}
                      aria-label={`Mã QR trò chơi ${game.title}`}
                      id={`btn-qr-game-${game.id}`}
                    >
                      <QrCode className="w-4 h-4" />
                    </button>

                    {/* Edit Game Button for Teachers */}
                    {userRole !== 'student' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGameToEdit(game);
                        }}
                        className="px-3 py-2 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-600 hover:text-white dark:hover:bg-teal-600 dark:hover:text-white border border-teal-200 dark:border-teal-800 rounded-xl transition-all shadow-2xs active:scale-95 flex items-center space-x-1 text-xs font-bold shrink-0"
                        title={`Chỉnh sửa nội dung trò chơi "${game.title}"`}
                        aria-label={`Chỉnh sửa trò chơi ${game.title}`}
                        id={`btn-edit-game-${game.id}`}
                      >
                        <Edit3 className="w-3.5 h-3.5 shrink-0" />
                        <span>Sửa</span>
                      </button>
                    )}

                    {onDeleteGame && userRole !== 'student' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGameToDelete(game);
                        }}
                        className="px-3 py-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white border border-rose-200 dark:border-rose-900/50 rounded-xl transition-all shadow-2xs active:scale-90 flex items-center space-x-1 text-xs font-bold"
                        title={`Xóa trò chơi "${game.title}"`}
                        id={`btn-delete-game-${game.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Xóa</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartGameClick(game);
                      }}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center space-x-1.5 cursor-pointer"
                      id={`btn-play-game-${game.id}`}
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Chơi ngay</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Single Game Deletion */}
      {gameToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-center animate-scaleIn">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Xác Nhận Xóa Trò Chơi?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Bạn có chắc chắn muốn xóa trò chơi <strong className="text-slate-700 dark:text-slate-200">"{gameToDelete.title}"</strong> ({gameToDelete.subject})?
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Thao tác này sẽ gỡ bỏ trò chơi khỏi danh mục lưu trữ.
            </p>
            <div className="mt-5 flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() => setGameToDelete(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all flex items-center space-x-1.5"
                id="btn-confirm-delete-single-game"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác Nhận Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clearing All Games */}
      {isConfirmingClearAll && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-center animate-scaleIn">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Xóa Toàn Bộ Dữ Liệu Trò Chơi?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Thao tác này sẽ xóa sạch tất cả <strong className="text-slate-700 dark:text-slate-200">{games.length} trò chơi</strong> hiện có trong phân hiệu "Trò chơi học tập".
            </p>
            <p className="text-[11px] text-teal-600 dark:text-teal-400 mt-2 bg-teal-50 dark:bg-teal-950/30 p-2 rounded-xl border border-teal-100 dark:border-teal-900/40">
              💡 Lưu ý: Bạn luôn có thể bấm nút "Khôi phục trò chơi mẫu" bất cứ lúc nào để nạp lại các trò chơi SGK tiêu chuẩn.
            </p>
            <div className="mt-5 flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() => setIsConfirmingClearAll(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all flex items-center space-x-1.5"
                id="btn-confirm-clear-all-games"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác Nhận Xóa Hết</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for creating a new game */}
      <CreateGameModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        documents={documents}
        onGameCreated={(newGame) => {
          onSaveGame(newGame);
          showToast(`Đã tạo trò chơi "${newGame.title}" thành công!`);
          // Automatically display QR modal for teacher to share directly to Zalo!
          setQrGame(newGame);
        }}
      />

      {/* Modal for editing an existing game */}
      {gameToEdit && (
        <EditGameModal
          isOpen={Boolean(gameToEdit)}
          onClose={() => setGameToEdit(null)}
          game={gameToEdit}
          onSaveGame={(updatedGame) => {
            onSaveGame(updatedGame);
            setGameToEdit(null);
            showToast(`Đã cập nhật nội dung trò chơi "${updatedGame.title}" thành công!`);
          }}
        />
      )}

      {/* Mandatory Student Information Modal before Playing Game */}
      {isStudentModalOpen && (
        <GameStudentModal
          isOpen={isStudentModalOpen}
          game={selectedGameForPlay}
          gameTitle={selectedGameForPlay?.title}
          subject={selectedGameForPlay?.subject}
          gameType={selectedGameForPlay?.type}
          initialScriptUrl={scriptUrl}
          defaultScriptUrl={scriptUrl}
          onClose={() => {
            setIsStudentModalOpen(false);
            setSelectedGameForPlay(null);
          }}
          onSubmit={handleConfirmStudent}
          onStartGame={handleConfirmStudent}
        />
      )}

      {/* QR Code Share Modal for Games */}
      {qrGame && (
        <QRCodeShareModal
          isOpen={Boolean(qrGame)}
          onClose={() => setQrGame(null)}
          title={qrGame.title}
          subtitle={qrGame.description}
          type="game"
          targetId={qrGame.id}
          game={qrGame}
          metaInfo={{
            gameTypeLabel:
              qrGame.type === 'quiz'
                ? 'QUIZ Tốc Độ'
                : qrGame.type === 'drag_drop'
                ? 'Kéo Thả Phân Loại'
                : 'Ghép Cặp Thuật Ngữ',
          }}
        />
      )}
    </div>
  );
};
