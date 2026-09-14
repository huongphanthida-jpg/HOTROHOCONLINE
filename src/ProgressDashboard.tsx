import React, { useState, useMemo } from 'react';
import { ProgressData, SessionRecord, UserRole } from '../types';
import { BarChart3, TrendingUp, Award, Users, AlertCircle, Search, RefreshCw, CheckCircle2, XCircle, FileSpreadsheet, Eye, Trash2, Gamepad2, GraduationCap, Filter, Trophy } from 'lucide-react';
import { syncSessionToGoogleSheets, formatTimeSpent } from '../services/sheetSyncService';

interface ProgressDashboardProps {
  progress: ProgressData;
  sessions: SessionRecord[];
  onViewSessionDetails: (session: SessionRecord) => void;
  onUpdateSession: (updated: SessionRecord) => void;
  onDeleteSession?: (sessionId: string) => void;
  onClearAllSessions?: () => void;
  userRole?: UserRole;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  progress,
  sessions,
  onViewSessionDetails,
  onUpdateSession,
  onDeleteSession,
  onClearAllSessions,
  userRole = 'teacher',
}) => {
  const isStudent = userRole === 'student';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'exam' | 'game'>('all');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<SessionRecord | null>(null);
  const [isConfirmClearAllOpen, setIsConfirmClearAllOpen] = useState(false);

  const examSessions = sessions.filter((s) => s.category !== 'game');
  const gameSessions = sessions.filter((s) => s.category === 'game');

  const uniqueStudentsCount = useMemo(() => {
    const studentKeys = new Set(
      sessions
        .map((s) => {
          const name = (s.studentInfo?.fullName || '').trim().toLowerCase();
          const cls = (s.studentInfo?.className || '').trim().toLowerCase();
          const grp = (s.studentInfo?.groupName || '').trim().toLowerCase();
          return name ? `${name}__${cls}__${grp}` : '';
        })
        .filter(Boolean)
    );
    return studentKeys.size;
  }, [sessions]);

  const filteredSessions = sessions.filter((s) => {
    const matchesCategory =
      filterCategory === 'all'
        ? true
        : filterCategory === 'exam'
        ? s.category !== 'game'
        : s.category === 'game';

    const matchesSearch =
      s.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentInfo.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentInfo.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.gameTitle && s.gameTitle.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const handleManualSync = async (session: SessionRecord) => {
    setSyncingId(session.id);
    const res = await syncSessionToGoogleSheets(session);
    setSyncingId(null);

    if (res.success) {
      const updated: SessionRecord = {
        ...session,
        syncedToGoogleSheets: true,
        syncTimestamp: new Date().toLocaleTimeString('vi-VN'),
      };
      onUpdateSession(updated);
      alert(res.message);
    } else {
      alert(res.message);
    }
  };

  const handleExportCSV = () => {
    if (sessions.length === 0) return;
    const headers = [
      'Thời gian nộp',
      'Họ và tên',
      'Lớp',
      'Nhóm / Tổ',
      'Phân loại',
      'Tên bài / Trò chơi',
      'Điểm số (thang 10)',
      'Số câu/thẻ đúng',
      'Tổng số câu/thẻ',
      'Thời gian làm bài',
      'Google Sheets',
    ];
    const rows = sessions.map((s) => [
      `"${s.date}"`,
      `"${s.studentInfo.fullName}"`,
      `"${s.studentInfo.className}"`,
      `"${s.studentInfo.groupName || ''}"`,
      `"${s.category === 'game' ? 'Trò chơi học tập' : 'Bài thi khảo thí SGK'}"`,
      `"${s.subjectName}"`,
      s.score,
      s.correctAnswers,
      s.totalQuestions,
      `"${formatTimeSpent(s.timeSpent)}"`,
      `"${s.syncedToGoogleSheets ? 'Đã đồng bộ' : 'Chưa đồng bộ'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HoTroHocOnline_2026_2027_BaoCao_KetQua_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fadeIn" id="progress-dashboard">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Attempts */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-300 flex items-center justify-center text-xl font-bold">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Tổng Hoạt Động</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white font-mono">
              {sessions.length}
            </h3>
            <span className="text-[11px] text-slate-400">
              {examSessions.length} bài thi • {gameSessions.length} trò chơi
            </span>
          </div>
        </div>

        {/* Card 2: Average Score */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-xl font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Điểm Trung Bình</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white font-mono">
              {sessions.length > 0
                ? (sessions.reduce((acc, curr) => acc + curr.score, 0) / sessions.length).toFixed(1)
                : '0.0'}{' '}
              <span className="text-xs font-normal text-slate-400">/ 10</span>
            </h3>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
              Thang điểm 10 quy chuẩn
            </span>
          </div>
        </div>

        {/* Card 3: Số Học Sinh Làm Bài */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 flex items-center justify-center text-xl font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Số Học Sinh Làm Bài</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white font-mono">
              {uniqueStudentsCount} <span className="text-xs font-normal text-slate-400">học sinh</span>
            </h3>
            <span className="text-[11px] text-amber-600 dark:text-amber-400">
              Phân biệt theo Tên, Lớp & Nhóm
            </span>
          </div>
        </div>

        {/* Card 4: Weak Topics Count */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 flex items-center justify-center text-xl font-bold">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Chủ Đề Cần Ôn Lại</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white font-mono">
              {progress.weakTopics.length}
            </h3>
            <span className="text-[11px] text-rose-600 dark:text-rose-400">
              Phân tích qua Gemini AI
            </span>
          </div>
        </div>
      </div>

      {/* GAMIFICATION BADGES SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Bảng Thành Tích & Huy Hiệu Đạt Được (Gamification)
            </h3>
          </div>
          <span className="text-xs text-slate-400">Tự động mở khóa khi luyện tập</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Badge 1 */}
          <div className={`p-4 rounded-2xl border text-center space-y-1.5 transition-all ${sessions.length >= 1 ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 text-amber-900 dark:text-amber-200 shadow-sm' : 'bg-slate-50 opacity-40 border-slate-200 text-slate-400'}`}>
            <div className="text-2xl">🏆</div>
            <div className="font-bold text-xs">Vua Trắc Nghiệm</div>
            <div className="text-[10px]">Hoàn thành bài thi đầu tiên</div>
          </div>

          {/* Badge 2 */}
          <div className={`p-4 rounded-2xl border text-center space-y-1.5 transition-all ${sessions.length >= 5 ? 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-300 text-teal-900 dark:text-teal-200 shadow-sm' : 'bg-slate-50 opacity-40 border-slate-200 text-slate-400'}`}>
            <div className="text-2xl">⚡</div>
            <div className="font-bold text-xs">Siêu Tốc Độ</div>
            <div className="text-[10px]">Làm 5+ bài tập/trò chơi</div>
          </div>

          {/* Badge 3 */}
          <div className={`p-4 rounded-2xl border text-center space-y-1.5 transition-all ${sessions.some(s => s.score >= 9) ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 text-emerald-900 dark:text-emerald-200 shadow-sm' : 'bg-slate-50 opacity-40 border-slate-200 text-slate-400'}`}>
            <div className="text-2xl">🎓</div>
            <div className="font-bold text-xs">Thần Đồng 9+</div>
            <div className="text-[10px]">Đạt điểm giỏi &gt;= 9.0</div>
          </div>

          {/* Badge 4 */}
          <div className={`p-4 rounded-2xl border text-center space-y-1.5 transition-all ${sessions.some(s => s.syncedToGoogleSheets) ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300 text-indigo-900 dark:text-indigo-200 shadow-sm' : 'bg-slate-50 opacity-40 border-slate-200 text-slate-400'}`}>
            <div className="text-2xl">📊</div>
            <div className="font-bold text-xs">Chuyên Gia Sheets</div>
            <div className="text-[10px]">Đồng bộ dữ liệu bảng tính</div>
          </div>
        </div>
      </div>

      {/* Weak Topics Warning Banner */}
      {progress.weakTopics.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-5 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Khuyến nghị ôn tập từ Trợ giảng AI:</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Bạn có một số câu sai ở các phần:{' '}
              {progress.weakTopics
                .filter((w) => w && typeof w.topic === 'string')
                .map((w, idx, arr) => (
                  <strong key={idx} className="text-amber-700 dark:text-amber-400">
                    {w.topic} ({w.wrongCount || 1} lần)
                    {idx < arr.length - 1 ? ', ' : '.'}
                  </strong>
                ))}
            </p>
          </div>
        </div>
      )}

      {/* Sessions History Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Table header with Search, Category Filter & CSV Export */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
              <span>Nhật Ký Làm Bài & Đồng Bộ Google Sheets</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                {sessions.length} kết quả
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tự động lưu & đồng bộ điểm thi trắc nghiệm và trò chơi học tập về Google Sheets
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter Pills */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-700/60 border border-slate-200/80 dark:border-slate-600/60 text-xs font-semibold">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterCategory === 'all'
                    ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Tất cả ({sessions.length})
              </button>
              <button
                onClick={() => setFilterCategory('exam')}
                className={`px-3 py-1 rounded-lg flex items-center space-x-1 transition-all ${
                  filterCategory === 'exam'
                    ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3 h-3" />
                <span>Bài thi ({examSessions.length})</span>
              </button>
              <button
                onClick={() => setFilterCategory('game')}
                className={`px-3 py-1 rounded-lg flex items-center space-x-1 transition-all ${
                  filterCategory === 'game'
                    ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Gamepad2 className="w-3 h-3" />
                <span>Trò chơi ({gameSessions.length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm học sinh, lớp, môn, trò chơi..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-teal-500 w-48 sm:w-56"
              />
            </div>

            {/* CSV Export Button */}
            <button
              onClick={handleExportCSV}
              disabled={sessions.length === 0}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50 transition-colors"
              title="Xuất danh sách điểm ra file Excel/CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Xuất CSV</span>
            </button>

            {onClearAllSessions && (
              <button
                type="button"
                onClick={() => setIsConfirmClearAllOpen(true)}
                disabled={sessions.length === 0}
                className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50 transition-colors"
                title="Xóa toàn bộ lịch sử thi"
                id="btn-clear-all-sessions"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">Xóa Lịch Sử</span>
              </button>
            )}
          </div>
        </div>

        {/* Table data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-5 py-3">Thí Sinh</th>
                <th className="px-5 py-3">Lớp & Nhóm</th>
                <th className="px-5 py-3">Nội Dung Hoạt Động</th>
                <th className="px-5 py-3 text-center">Điểm Số</th>
                <th className="px-5 py-3 text-center">Số Câu / Thẻ Đúng</th>
                <th className="px-5 py-3">Thời Gian</th>
                <th className="px-5 py-3">Google Sheets</th>
                <th className="px-5 py-3 text-right">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    {sessions.length === 0
                      ? 'Chưa có lượt làm bài hoặc trò chơi nào. Hãy chọn môn học hoặc trò chơi để bắt đầu!'
                      : 'Không tìm thấy kết quả phù hợp với bộ lọc hiện tại.'}
                  </td>
                </tr>
              ) : (
                filteredSessions.map((ses) => (
                  <tr
                    key={ses.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                      {ses.studentInfo.fullName}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-teal-600 dark:text-teal-400">{ses.studentInfo.className}</span>{' '}
                      <span className="text-slate-400">({ses.studentInfo.groupName})</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          {ses.category === 'game' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 shrink-0">
                              <Gamepad2 className="w-3 h-3" />
                              <span>
                                {ses.gameType === 'quiz'
                                  ? 'Trò chơi Quiz'
                                  : ses.gameType === 'drag_drop'
                                  ? 'Kéo thả'
                                  : ses.gameType === 'matching'
                                  ? 'Ghép cặp'
                                  : 'Trò chơi'}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 shrink-0">
                              <GraduationCap className="w-3 h-3" />
                              <span>Bài thi SGK</span>
                            </span>
                          )}
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {ses.gameTitle || ses.subjectName}
                          </span>
                        </div>
                        {ses.category === 'game' && ses.details && ses.details[0]?.explanation && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-400 truncate max-w-sm">
                            {ses.details[0].explanation}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full font-bold font-mono text-xs ${
                          ses.score >= 8
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : ses.score >= 5
                            ? 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {ses.score} / 10
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-600 dark:text-slate-300 font-mono">
                      {ses.correctAnswers} / {ses.totalQuestions}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                      <div>{formatTimeSpent(ses.timeSpent)}</div>
                      <div className="text-[10px] text-slate-400">{ses.date}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      {ses.syncedToGoogleSheets ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đã đồng bộ</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleManualSync(ses)}
                          disabled={syncingId === ses.id}
                          className="inline-flex items-center space-x-1 text-teal-600 dark:text-teal-400 hover:underline text-[11px] font-semibold"
                          title="Bấm để đồng bộ ngay"
                        >
                          <RefreshCw className={`w-3 h-3 ${syncingId === ses.id ? 'animate-spin' : ''}`} />
                          <span>Đồng bộ ngay</span>
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => onViewSessionDetails(ses)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Xem lại bài thi & kết quả"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {onDeleteSession && (
                          <button
                            type="button"
                            onClick={() => setSessionToDelete(ses)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Xóa lượt làm bài này"
                            aria-label={`Xóa kết quả của ${ses.studentInfo.fullName}`}
                          >
                            <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal: Delete Single Session */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Xác Nhận Xóa Kết Quả Thi</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Thao tác này không thể hoàn tác</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <div>Thí sinh: <strong className="text-slate-900 dark:text-white">{sessionToDelete.studentInfo.fullName}</strong> ({sessionToDelete.studentInfo.className})</div>
              <div>Môn: <strong className="text-slate-900 dark:text-white">{sessionToDelete.subjectName}</strong> - Điểm: <strong className="text-teal-600 dark:text-teal-400">{sessionToDelete.score}/10</strong></div>
              <div>Ngày thi: {sessionToDelete.date}</div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSession) {
                    onDeleteSession(sessionToDelete.id);
                  }
                  setSessionToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
                id="btn-confirm-delete-session"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác Nhận Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Clear All Sessions */}
      {isConfirmClearAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Xóa Toàn Bộ Lịch Sử Thi?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tất cả {sessions.length} lượt thi sẽ bị xóa khỏi bộ nhớ</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300">
              Lưu ý: Hành động này sẽ đặt lại điểm trung bình và số lượt thi của bạn. Bạn nên bấm <strong>Xuất CSV</strong> để lưu trữ trước khi xóa nếu cần!
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmClearAllOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllSessions) {
                    onClearAllSessions();
                  }
                  setIsConfirmClearAllOpen(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
                id="btn-confirm-clear-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa Toàn Bộ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
