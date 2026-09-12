import React, { useState, useEffect } from 'react';
import { EducationalGame, StudentInfo } from '../../types';
import { 
  Gamepad2, 
  User, 
  School, 
  Users, 
  Play, 
  X, 
  AlertCircle, 
  FileSpreadsheet, 
  Check, 
  Link2, 
  Settings2,
  Zap,
  Layers
} from 'lucide-react';

interface GameStudentModalProps {
  isOpen: boolean;
  game?: EducationalGame | null;
  gameTitle?: string;
  subject?: string;
  gameType?: 'quiz' | 'drag_drop' | 'matching' | string;
  onClose: () => void;
  onStartGame?: (info: StudentInfo, customScriptUrl?: string) => void;
  onSubmit?: (info: StudentInfo, customScriptUrl?: string) => void;
  defaultScriptUrl?: string;
  initialScriptUrl?: string;
}

export const GameStudentModal: React.FC<GameStudentModalProps> = ({
  isOpen,
  game,
  gameTitle,
  subject,
  gameType,
  onClose,
  onStartGame,
  onSubmit,
  defaultScriptUrl,
  initialScriptUrl,
}) => {
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  
  // Google Sheet Web App URL state
  const effectiveDefaultUrl = defaultScriptUrl || initialScriptUrl;
  const [scriptUrl, setScriptUrl] = useState('');
  const [showConfigSheet, setShowConfigSheet] = useState(false);
  const [saveUrlSuccess, setSaveUrlSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load saved info from last attempt
      try {
        const saved = localStorage.getItem('last_student_info');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.fullName) setFullName(parsed.fullName);
          if (parsed.className) setClassName(parsed.className);
          if (parsed.groupName) setGroupName(parsed.groupName);
        }
      } catch {
        // ignore
      }

      // Load sheet URL from props or localStorage
      const savedUrl = effectiveDefaultUrl || localStorage.getItem('google_apps_script_url') || '';
      setScriptUrl(savedUrl);
      setShowConfigSheet(!savedUrl); // Auto-open config if no URL is set yet
    }
  }, [isOpen, effectiveDefaultUrl]);

  if (!isOpen) return null;

  const resolvedTitle = game?.title || gameTitle || 'Trò Chơi Học Tập';
  const resolvedSubject = game?.subject || subject || 'Kiến Thức SGK';
  const resolvedType = (game?.type || gameType || 'quiz') as string;

  const handleSaveSheetUrl = () => {
    if (scriptUrl.trim()) {
      localStorage.setItem('google_apps_script_url', scriptUrl.trim());
      setSaveUrlSuccess(true);
      setTimeout(() => setSaveUrlSuccess(false), 2500);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Vui lòng nhập Họ và tên của bạn trước khi chơi!');
      return;
    }
    if (!className.trim()) {
      setError('Vui lòng nhập Lớp học của bạn (ví dụ: 10A1, 11B2, 12D1)');
      return;
    }

    setError('');
    const studentInfo: StudentInfo = {
      fullName: fullName.trim(),
      className: className.trim(),
      groupName: groupName.trim(),
    };

    // Save info for subsequent plays
    localStorage.setItem('last_student_info', JSON.stringify(studentInfo));
    if (scriptUrl.trim()) {
      localStorage.setItem('google_apps_script_url', scriptUrl.trim());
    }

    if (onStartGame) {
      onStartGame(studentInfo, scriptUrl.trim() || undefined);
    } else if (onSubmit) {
      onSubmit(studentInfo, scriptUrl.trim() || undefined);
    }
  };

  const handleQuickPlayGuest = () => {
    const guestStudentInfo: StudentInfo = {
      fullName: fullName.trim() || 'Học sinh khách',
      className: className.trim() || 'Lớp trải nghiệm',
      groupName: groupName.trim() || '',
    };
    if (onStartGame) {
      onStartGame(guestStudentInfo, scriptUrl.trim() || undefined);
    } else if (onSubmit) {
      onSubmit(guestStudentInfo, scriptUrl.trim() || undefined);
    }
  };

  const gameTypeInfo = {
    quiz: { label: 'QUIZ Trắc Nghiệm Tốc Độ', icon: Zap, color: 'from-amber-500 to-orange-600' },
    drag_drop: { label: 'KÉO THẢ Phân Loại Khái Niệm', icon: Layers, color: 'from-indigo-600 to-teal-600' },
    matching: { label: 'GHÉP CẶP Thuật Ngữ & Định Nghĩa', icon: Gamepad2, color: 'from-teal-600 to-emerald-600' },
  }[resolvedType as 'quiz' | 'drag_drop' | 'matching'] || { label: 'Trò Chơi Học Tập', icon: Gamepad2, color: 'from-teal-600 to-indigo-600' };

  const TypeIcon = gameTypeInfo.icon;
  const isSheetConnected = Boolean(scriptUrl && scriptUrl.trim().startsWith('http'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-700 transition-all text-left"
        id="game-student-info-modal"
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${gameTypeInfo.color} p-6 text-white relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <TypeIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/85">
                {gameTypeInfo.label}
              </div>
              <h3 className="text-xl font-black tracking-tight leading-tight">
                {resolvedTitle}
              </h3>
            </div>
          </div>

          <div className="mt-3 bg-black/15 backdrop-blur-xs rounded-xl px-3.5 py-2 text-xs flex items-center justify-between">
            <span>Môn: <strong className="font-bold">{resolvedSubject}</strong></span>
            <span className="text-white/90">Yêu cầu: <strong>Ghi danh trước khi chơi</strong></span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-2xl p-3 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Full Name Field (Mandatory) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              Họ và tên người chơi <span className="text-rose-500 font-extrabold">* (Bắt buộc)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(''); }}
                placeholder="Ví dụ: Nguyễn Thị Mai"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium transition-all"
                autoFocus
                required
                id="input-game-player-name"
              />
            </div>
          </div>

          {/* Class & Group Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Lớp học <span className="text-rose-500 font-extrabold">* (Bắt buộc)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <School className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => { setClassName(e.target.value); setError(''); }}
                  placeholder="VD: 10A2, 11B1, 12T3"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium transition-all"
                  required
                  id="input-game-player-class"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Nhóm / Tổ <span className="text-slate-400 font-normal">(Tùy chọn)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Users className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="VD: Tổ 1, Nhóm Sao Vàng"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium transition-all"
                  id="input-game-player-group"
                />
              </div>
            </div>
          </div>

          {/* Google Sheets Sync Box */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Trả kết quả về Google Sheet của giáo viên</span>
              </div>

              <button
                type="button"
                onClick={() => setShowConfigSheet(!showConfigSheet)}
                className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1"
              >
                <Settings2 className="w-3 h-3" />
                <span>{showConfigSheet ? 'Thu gọn' : isSheetConnected ? 'Xem URL Sheet' : 'Cấu hình URL Sheet'}</span>
              </button>
            </div>

            {isSheetConnected ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-2.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <span className="font-semibold">Đã kết nối: Kết quả chơi sẽ tự động gửi về Google Sheet!</span>
                </div>
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 text-xs text-amber-800 dark:text-amber-200">
                💡 <span className="font-semibold">Chưa có URL Google Sheets:</span> Bạn vẫn có thể chơi bình thường, hoặc dán URL Web App Google Apps Script bên dưới để gửi điểm.
              </div>
            )}

            {/* Expandable URL Config Input */}
            {showConfigSheet && (
              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <label className="block font-semibold text-slate-600 dark:text-slate-300">
                  URL Google Apps Script Web App (Triển khai từ Google Sheets):
                </label>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Link2 className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="url"
                      value={scriptUrl}
                      onChange={(e) => setScriptUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveSheetUrl}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs shrink-0 transition-all active:scale-95"
                  >
                    {saveUrlSuccess ? 'Đã lưu!' : 'Lưu URL'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  URL này dùng chung cho toàn bộ hệ thống kiểm tra và trò chơi của lớp.
                </p>
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-2 space-y-2.5">
            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold rounded-2xl shadow-lg shadow-teal-600/20 hover:shadow-xl transition-all transform active:scale-[0.99] text-sm cursor-pointer"
              id="btn-confirm-start-game"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>BẮT ĐẦU CHƠI VỚI TÊN ĐÃ ĐIỀN</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleQuickPlayGuest}
                className="flex-1 py-2.5 px-3 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer text-center"
                title="Bỏ qua nhập tên và chơi trực tiếp"
                id="btn-quick-play-guest"
              >
                ⚡ Chơi thử nhanh (Khách)
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
                id="btn-cancel-game-modal"
              >
                ← Quay lại
              </button>
            </div>

            <p className="text-center text-[11px] text-slate-400 mt-1">
              Họ tên và Lớp sẽ được ghi nhận cùng kết quả đạt được sau khi kết thúc trò chơi.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
