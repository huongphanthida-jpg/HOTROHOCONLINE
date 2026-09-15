import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Send, 
  Link2, 
  Copy, 
  Check, 
  User, 
  School,
  Clock,
  Award
} from 'lucide-react';
import { GameSessionResult, syncGameResultToGoogleSheets, formatTimeSpent } from '../../services/sheetSyncService';

interface GameSyncCardProps {
  result: GameSessionResult;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncMessage: string;
  onRetrySync: (customUrl?: string) => Promise<void>;
  initialScriptUrl?: string;
}

export const GameSyncCard: React.FC<GameSyncCardProps> = ({
  result,
  syncStatus,
  syncMessage,
  onRetrySync,
  initialScriptUrl,
}) => {
  const [scriptUrl, setScriptUrl] = useState(
    initialScriptUrl || localStorage.getItem('google_apps_script_url') || ''
  );
  const [isRetrying, setIsRetrying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(syncStatus === 'error' || !scriptUrl);

  const handleManualSend = async () => {
    if (!scriptUrl.trim()) return;
    setIsRetrying(true);
    localStorage.setItem('google_apps_script_url', scriptUrl.trim());
    await onRetrySync(scriptUrl.trim());
    setIsRetrying(false);
  };

  const handleCopySummary = () => {
    const text = `KẾT QUẢ TRÒ CHƠI HỌC TẬP\n` +
      `- Trò chơi: ${result.gameTitle} (${result.subject})\n` +
      `- Học sinh: ${result.studentInfo.fullName}\n` +
      `- Lớp: ${result.studentInfo.className} ${result.studentInfo.groupName ? `(${result.studentInfo.groupName})` : ''}\n` +
      `- Điểm số (thang 10): ${result.score}/10\n` +
      `- Số câu/mục chính xác: ${result.correctCount}/${result.totalCount}\n` +
      `- Thời gian: ${formatTimeSpent(result.timeSpent)}\n` +
      `- Thời gian nộp: ${result.submittedAt || new Date().toLocaleString('vi-VN')}`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700/80 text-left my-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Đồng Bộ Kết Quả Về Google Sheets
            </h4>
            <div className="text-[11px] text-slate-400">
              Tự động lưu điểm, họ tên và lớp của học sinh vào trang tính của giáo viên
            </div>
          </div>
        </div>

        {/* Sync Status Badge */}
        <div>
          {syncStatus === 'syncing' || isRetrying ? (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Đang gửi kết quả...</span>
            </span>
          ) : syncStatus === 'success' ? (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Đã trả kết quả về Google Sheet</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Chưa đồng bộ lên Sheet</span>
            </span>
          )}
        </div>
      </div>

      {/* Row Data Preview Sent to Teacher */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <User className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Họ và tên</div>
            <div className="font-extrabold text-slate-800 dark:text-white truncate">
              {result.studentInfo.fullName}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <School className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Lớp học</div>
            <div className="font-extrabold text-slate-800 dark:text-white truncate">
              {result.studentInfo.className}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Award className="w-4 h-4 text-amber-500 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Điểm số</div>
            <div className="font-extrabold text-teal-600 dark:text-teal-400">
              {result.score}/10 điểm
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Thời gian làm</div>
            <div className="font-extrabold text-slate-700 dark:text-slate-200">
              {formatTimeSpent(result.timeSpent)}
            </div>
          </div>
        </div>
      </div>

      {/* Message and Status Details */}
      {syncMessage && (
        <div
          className={`text-xs px-3.5 py-2.5 rounded-xl border flex items-start space-x-2 ${
            syncStatus === 'success'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300'
          }`}
        >
          {syncStatus === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium leading-relaxed">{syncMessage}</span>
        </div>
      )}

      {/* Config URL & Retry Actions */}
      <div className="space-y-2 pt-1">
        {(!scriptUrl || showUrlInput || syncStatus === 'error') && (
          <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-200">
                URL Google Apps Script Web App của giáo viên:
              </label>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-[11px] text-slate-400 hover:text-slate-600 underline"
              >
                {showUrlInput ? 'Thu gọn' : 'Đổi URL'}
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Link2 className="w-3.5 h-3.5" />
                </div>
                <input
                  type="url"
                  value={scriptUrl}
                  onChange={(e) => setScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <button
                type="button"
                onClick={handleManualSend}
                disabled={!scriptUrl.trim() || isRetrying}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shrink-0 flex items-center space-x-1.5 transition-all shadow-sm active:scale-95"
                id="btn-retry-sync-sheets"
              >
                {isRetrying ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{syncStatus === 'success' ? 'Gửi lại' : 'Gửi về Sheet ngay'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              💡 Lưu ý: Cần quyền "Bất kỳ ai" (Anyone) khi triển khai Web App trên Google Apps Script để nhận dữ liệu từ học sinh.
            </p>
          </div>
        )}

        {/* Quick action bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopySummary}
            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã sao chép kết quả!' : 'Sao chép kết quả'}</span>
          </button>

          {syncStatus !== 'syncing' && (
            <button
              type="button"
              onClick={() => onRetrySync()}
              disabled={!scriptUrl.trim()}
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 flex items-center space-x-1 hover:underline"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Thử đồng bộ lại</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameSyncCard;
