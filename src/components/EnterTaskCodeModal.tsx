import React, { useState } from 'react';
import { Key, X, ArrowRight, Sparkles, AlertCircle, BookOpen, Gamepad2 } from 'lucide-react';
import { Subject, EducationalGame } from '../types';

interface EnterTaskCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCode: (code: string) => { success: boolean; message?: string };
  availableSubjects?: Subject[];
  availableGames?: EducationalGame[];
}

export const EnterTaskCodeModal: React.FC<EnterTaskCodeModalProps> = ({
  isOpen,
  onClose,
  onSubmitCode,
  availableSubjects = [],
  availableGames = [],
}) => {
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMessage('Vui lòng nhập Mã ID Bài tập!');
      return;
    }

    const result = onSubmitCode(code.trim());
    if (result.success) {
      setErrorMessage(null);
      setCode('');
      onClose();
    } else {
      setErrorMessage(result.message || `Không tìm thấy bài tập hoặc đề thi với Mã ID: "${code.trim()}"`);
    }
  };

  const handleQuickSelectCode = (selectedCode: string) => {
    setCode(selectedCode);
    setErrorMessage(null);
    const result = onSubmitCode(selectedCode);
    if (result.success) {
      setCode('');
      onClose();
    } else {
      setErrorMessage(result.message || `Không tìm thấy bài tập với Mã ID: "${selectedCode}"`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 relative overflow-hidden space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header decoration bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-500" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20 shrink-0">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-[11px] font-extrabold uppercase tracking-wider">
              <span>Học sinh làm bài thi riêng</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              Nhập Mã ID Bài Tập / Đề Thi
            </h3>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Nhập mã ID bài tập do giáo viên gửi qua Zalo (Ví dụ: <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono font-bold text-teal-600 dark:text-teal-400">toan-10t2</code>, <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono font-bold text-teal-600 dark:text-teal-400">toan-12d1</code>) để vào làm bài trực tiếp:
        </p>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Nhập Mã ID bài tập tại đây (VD: toan-10t2)..."
              autoFocus
              className="w-full px-4 py-3.5 pl-11 text-sm font-mono font-bold rounded-2xl border-2 border-teal-400 dark:border-teal-600 bg-teal-50/50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-500/30 shadow-inner uppercase tracking-wider"
            />
            <Key className="w-5 h-5 text-teal-600 dark:text-teal-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-start space-x-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-teal-500/20 active:scale-98 transition-all flex items-center justify-center space-x-2"
          >
            <span>Vào Làm Bài Tập Ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Available Subject ID Quick Tags */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <span className="flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Mã ID bài tập sẵn có (bấm để vào nhanh):</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 scrollbar-thin">
            {availableSubjects.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => handleQuickSelectCode(sub.id)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 dark:bg-slate-700 dark:hover:bg-teal-950/60 border border-slate-200 hover:border-teal-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition-all group shrink-0"
              >
                <BookOpen className="w-3 h-3 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform" />
                <span className="font-mono font-bold text-teal-800 dark:text-teal-200">{sub.id}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">({sub.name})</span>
              </button>
            ))}

            {availableGames.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => handleQuickSelectCode(game.id)}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 text-xs font-medium flex items-center space-x-1.5 transition-all group shrink-0"
              >
                <Gamepad2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="font-mono font-bold text-indigo-900 dark:text-indigo-100">{game.id}</span>
                <span className="text-[10px] text-indigo-500 dark:text-indigo-400">({game.title})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tip section */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
          <strong>💡 Mẹo:</strong> Bạn có thể hỏi giáo viên bộ môn mã ID bài tập (Ví dụ: <code>toan-10t2</code>, <code>toan-11a2</code>...) rồi dán vào đây để làm bài đúng phần được giao.
        </div>
      </div>
    </div>
  );
};

export default EnterTaskCodeModal;

