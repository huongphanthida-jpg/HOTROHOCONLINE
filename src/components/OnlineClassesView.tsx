import React, { useState, useMemo } from 'react';
import { OnlineClass, AppSettings, UserRole } from '../types';
import { 
  Tv, 
  Video, 
  Users, 
  Calendar, 
  Clock, 
  ExternalLink, 
  RefreshCw, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  Sparkles,
  Link as LinkIcon,
  ShieldCheck,
  Info
} from 'lucide-react';
import { fetchOnlineClassesFromGoogleSheets, APPS_SCRIPT_SAMPLE_CODE } from '../services/sheetSyncService';

interface OnlineClassesViewProps {
  onlineClasses: OnlineClass[];
  settings: AppSettings;
  onUpdateClasses: (classes: OnlineClass[]) => void;
  onOpenSettings: () => void;
  userRole?: UserRole;
}

export const OnlineClassesView: React.FC<OnlineClassesViewProps> = ({
  onlineClasses,
  settings,
  onUpdateClasses,
  onOpenSettings,
  userRole = 'teacher',
}) => {
  const isStudent = userRole === 'student';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncAlert, setSyncAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<OnlineClass | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<OnlineClass>>({
    className: '',
    grade: '10',
    subject: 'Toán học',
    teacher: '',
    schedule: '',
    meetingLink: '',
    platform: 'google_meet',
    roomCode: '',
    password: '',
    status: 'live',
    notes: '',
  });

  const isSheetsConnected = Boolean(
    (settings.onlineClassSheetUrl && settings.onlineClassSheetUrl.trim().length > 0) ||
    (settings.googleAppsScriptUrl && settings.googleAppsScriptUrl.trim().length > 0)
  );

  // Filtered List
  const filteredClasses = useMemo(() => {
    return onlineClasses.filter((cls) => {
      const matchesSearch =
        cls.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.schedule.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cls.notes && cls.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesGrade = selectedGrade === 'all' || cls.grade === selectedGrade;
      const matchesStatus = selectedStatus === 'all' || cls.status === selectedStatus;

      return matchesSearch && matchesGrade && matchesStatus;
    });
  }, [onlineClasses, searchTerm, selectedGrade, selectedStatus]);

  // Statistics
  const totalClasses = onlineClasses.length;
  const liveCount = onlineClasses.filter((c) => c.status === 'live').length;
  const upcomingCount = onlineClasses.filter((c) => c.status === 'upcoming').length;

  // Handle Sync from Google Sheets
  const handleSyncFromSheets = async () => {
    setIsSyncing(true);
    setSyncAlert(null);

    const sheetUrl = settings.onlineClassSheetUrl || settings.googleAppsScriptUrl;
    const res = await fetchOnlineClassesFromGoogleSheets(sheetUrl);

    setIsSyncing(false);

    if (res.success && res.classes) {
      onUpdateClasses(res.classes);
      setSyncAlert({ type: 'success', message: res.message });
    } else {
      setSyncAlert({ type: 'error', message: res.message });
    }
  };

  const handleOpenAddModal = () => {
    setEditingClass(null);
    setFormData({
      className: '',
      grade: '10',
      subject: 'Toán học',
      teacher: '',
      schedule: 'Thứ 2, 4, 6 - 08:00 - 09:30',
      meetingLink: '',
      platform: 'google_meet',
      roomCode: '',
      password: '',
      status: 'live',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cls: OnlineClass) => {
    setEditingClass(cls);
    setFormData({ ...cls });
    setIsModalOpen(true);
  };

  const handleDeleteClass = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa lớp học này khỏi danh sách?')) {
      const updated = onlineClasses.filter((c) => c.id !== id);
      onUpdateClasses(updated);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.className?.trim() || !formData.subject?.trim()) {
      alert('Vui lòng nhập đầy đủ Tên lớp và Môn học!');
      return;
    }

    if (editingClass) {
      // Update existing
      const updated = onlineClasses.map((c) =>
        c.id === editingClass.id
          ? ({
              ...c,
              ...formData,
              updatedAt: new Date().toISOString(),
            } as OnlineClass)
          : c
      );
      onUpdateClasses(updated);
    } else {
      // Add new
      const newCls: OnlineClass = {
        id: `cls-${Date.now()}`,
        className: formData.className.trim(),
        grade: formData.grade || '10',
        subject: formData.subject.trim(),
        teacher: formData.teacher?.trim() || 'Chưa phân công',
        schedule: formData.schedule?.trim() || 'Chưa cập nhật',
        meetingLink: formData.meetingLink?.trim() || '#',
        platform: (formData.platform as any) || 'google_meet',
        roomCode: formData.roomCode?.trim() || '',
        password: formData.password?.trim() || '',
        status: (formData.status as any) || 'live',
        notes: formData.notes?.trim() || '',
        updatedAt: new Date().toISOString(),
      };
      onUpdateClasses([newCls, ...onlineClasses]);
    }

    setIsModalOpen(false);
  };

  const handleCopyAppsScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_SAMPLE_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const getPlatformBadge = (platform?: string) => {
    switch (platform) {
      case 'zoom':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
            <i className="fa-solid fa-video text-xs"></i>
            <span>Zoom</span>
          </span>
        );
      case 'teams':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
            <i className="fa-solid fa-users text-xs"></i>
            <span>MS Teams</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
            <i className="fa-brands fa-google text-xs"></i>
            <span>Google Meet</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: 'live' | 'upcoming' | 'ended') => {
    switch (status) {
      case 'live':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500 text-white shadow-sm shadow-rose-500/30 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
            <span>ĐANG HỌC LIVE</span>
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
            <Clock className="w-3.5 h-3.5" />
            <span>SẮP DIỄN RA</span>
          </span>
        );
      case 'ended':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            <span>ĐÃ KẾT THÚC</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-6 md:p-8 text-white shadow-xl shadow-teal-700/10">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-white/20 backdrop-blur-md text-teal-100 tracking-wider">
                DATABASE HỌC ONLINE
              </span>
              <span className="flex items-center space-x-1 text-xs text-teal-100">
                <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                <span>Google Sheets Sync</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Danh Sách Lớp Học Trực Tuyến
            </h1>
            <p className="text-teal-100 text-xs sm:text-sm leading-relaxed">
              Quản lý thông tin lớp học, lịch học trực tuyến, link Google Meet / Zoom và tự động kết nối dữ liệu từ Google Sheets thời gian thực.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleSyncFromSheets}
              disabled={isSyncing}
              className="flex items-center space-x-2 px-4 py-2.5 bg-white text-teal-700 hover:bg-teal-50 rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
              id="btn-sync-classes-sheets"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Đang tải dữ liệu...' : 'Đồng bộ Google Sheets'}</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95"
              id="btn-add-online-class"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Lớp Mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync Status Alert Banner */}
      {syncAlert && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-medium ${
            syncAlert.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : syncAlert.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {syncAlert.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{syncAlert.message}</span>
          </div>
          <button
            onClick={() => setSyncAlert(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metrics Stat Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Tổng Số Lớp</span>
            <span className="text-xl font-bold text-slate-800 dark:text-white">{totalClasses} Lớp</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Đang Học Live</span>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400">{liveCount} Lớp</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Sắp Diễn Ra</span>
            <span className="text-xl font-bold text-teal-600 dark:text-teal-400">{upcomingCount} Lớp</span>
          </div>
        </div>

        <div 
          onClick={onOpenSettings}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between cursor-pointer hover:border-teal-500 transition-colors group"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSheetsConnected ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase truncate">Google Sheets</span>
              <span className={`text-xs font-bold truncate block ${isSheetsConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                {isSheetsConnected ? 'Đã kết nối Live' : 'Chưa cấu hình'}
              </span>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-teal-600 shrink-0 ml-1" />
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên lớp, môn học, giáo viên, lịch học..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Grade filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold">Khối:</span>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả khối</option>
              <option value="10">Khối 10</option>
              <option value="11">Khối 11</option>
              <option value="12">Khối 12</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold">Trạng thái:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả</option>
              <option value="live">Đang học Live</option>
              <option value="upcoming">Sắp diễn ra</option>
              <option value="ended">Đã kết thúc</option>
            </select>
          </div>

          {/* Guide toggle button */}
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors"
          >
            <Info className="w-3.5 h-3.5 text-teal-600" />
            <span>{showGuide ? 'Ẩn Hướng Dẫn' : 'Hướng Dẫn Sheets'}</span>
          </button>
        </div>
      </div>

      {/* Guide Box (Expandable) */}
      {showGuide && (
        <div className="p-5 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-teal-800 dark:text-teal-200 font-bold text-sm">
              <FileSpreadsheet className="w-5 h-5 text-teal-600" />
              <span>Hướng Dẫn 2 Bước Kết Nối Google Sheets Lớp Học Trực Tuyến</span>
            </div>
            <button
              onClick={handleCopyAppsScript}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Đã sao chép Code!' : 'Sao Chép Apps Script Mẫu'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-teal-100 dark:border-teal-900 space-y-1.5">
              <span className="font-bold text-teal-700 dark:text-teal-300">Cách 1: Sử dụng Google Apps Script Web App (Tự động 2 chiều)</span>
              <ol className="list-decimal list-inside space-y-1 text-slate-500 dark:text-slate-400">
                <li>Mở Google Sheet &gt; Tiện ích mở rộng &gt; Apps Script.</li>
                <li>Dán mã đã sao chép ở trên và nhấn <strong>Triển khai (Deploy)</strong>.</li>
                <li>Chọn loại: <strong>Ứng dụng web (Web App)</strong>, Quyền truy cập: <strong>Bất kỳ ai (Anyone)</strong>.</li>
                <li>Sao chép URL Web App thu được và dán vào phần Cài Đặt của ứng dụng.</li>
              </ol>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-teal-100 dark:border-teal-900 space-y-1.5">
              <span className="font-bold text-teal-700 dark:text-teal-300">Cách 2: Sử dụng Google Sheet Xuất Bản Công Khai CSV</span>
              <ol className="list-decimal list-inside space-y-1 text-slate-500 dark:text-slate-400">
                <li>Mở file Google Sheet chứa danh sách lớp học của nhà trường.</li>
                <li>Vào <strong>Tệp (File) &gt; Chia sẻ (Share) &gt; Xuất bản lên web (Publish to web)</strong>.</li>
                <li>Chọn định dạng <strong>CSV (Giá trị phân tách bằng dấu phẩy)</strong> và nhấn Xuất bản.</li>
                <li>Dán đường dẫn CSV đó vào ô Google Sheet trong Cài Đặt để app tự đọc dữ liệu!</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Online Classes Cards Grid */}
      {filteredClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((cls) => (
            <div
              key={cls.id}
              className={`rounded-2xl border transition-all hover:shadow-lg flex flex-col justify-between overflow-hidden bg-white dark:bg-slate-900 ${
                cls.status === 'live'
                  ? 'border-rose-300 dark:border-rose-800 ring-2 ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Card Header */}
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-xs">
                        Lớp {cls.className}
                      </span>
                      {cls.grade && (
                        <span className="text-[10px] font-bold text-slate-400">
                          Khối {cls.grade}
                        </span>
                      )}
                      {getPlatformBadge(cls.platform)}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {cls.subject}
                    </h3>
                  </div>

                  {/* Status Badge */}
                  <div>{getStatusBadge(cls.status)}</div>
                </div>

                {/* Info List */}
                <div className="space-y-2 pt-1 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="font-semibold">{cls.teacher || 'Chưa phân công'}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>{cls.schedule}</span>
                  </div>

                  {(cls.roomCode || cls.password) && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 font-mono text-[11px] flex items-center justify-between">
                      {cls.roomCode && (
                        <div>
                          <span className="text-slate-400">ID:</span>{' '}
                          <span className="font-bold text-slate-800 dark:text-slate-200">{cls.roomCode}</span>
                        </div>
                      )}
                      {cls.password && (
                        <div>
                          <span className="text-slate-400">Pass:</span>{' '}
                          <span className="font-bold text-slate-800 dark:text-slate-200">{cls.password}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {cls.notes && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2 bg-teal-50/50 dark:bg-teal-950/30 p-2 rounded-lg">
                      💬 {cls.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Card Actions Footer */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEditModal(cls)}
                    className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Chỉnh sửa thông tin lớp"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClass(cls.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Xóa lớp học"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <a
                  href={cls.meetingLink.startsWith('http') ? cls.meetingLink : `https://${cls.meetingLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 ${
                    cls.status === 'live'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                      : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-600/20'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Vào Phòng Học Ngay</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 flex items-center justify-center">
            <Tv className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Chưa Tìm Thấy Lớp Học Trực Tuyến Nào
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Không tìm thấy lớp học phù hợp với từ khóa hoặc bộ lọc của bạn. Hãy thử chọn lại hoặc nhấn đồng bộ từ Google Sheets.
            </p>
          </div>

          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={handleSyncFromSheets}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              Đồng Bộ Từ Google Sheets
            </button>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors"
            >
              Thêm Thủ Công
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Online Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-teal-700 to-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-base">
                <Video className="w-5 h-5" />
                <span>{editingClass ? 'Chỉnh Sửa Lớp Học Trực Tuyến' : 'Thêm Lớp Học Trực Tuyến Mới'}</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-teal-200 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveForm} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên Lớp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    placeholder="VD: 10A1, 11B2, 12C1"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Khối Lớp</label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="10">Khối 10</option>
                    <option value="11">Khối 11</option>
                    <option value="12">Khối 12</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Môn Học <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="VD: Toán học, Vật lý, Tiếng Anh"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Giáo Viên Dạy</label>
                  <input
                    type="text"
                    value={formData.teacher}
                    onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                    placeholder="VD: Thầy Nguyễn Văn An"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Lịch Học / Thời Gian</label>
                <input
                  type="text"
                  value={formData.schedule}
                  onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                  placeholder="VD: Thứ 2, 4, 6 - 08:00 - 09:30"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Đường Dẫn Phòng Học (Google Meet / Zoom / MS Teams) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={formData.meetingLink}
                  onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nền Tảng</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
                    className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="google_meet">Google Meet</option>
                    <option value="zoom">Zoom</option>
                    <option value="teams">MS Teams</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mã Phòng (ID)</label>
                  <input
                    type="text"
                    value={formData.roomCode}
                    onChange={(e) => setFormData({ ...formData, roomCode: e.target.value })}
                    placeholder="VD: 987 654"
                    className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Trạng Thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="live">Đang học Live</option>
                    <option value="upcoming">Sắp diễn ra</option>
                    <option value="ended">Đã kết thúc</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ghi Chú / Dặn Dò Bài Học</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Nội dung bài học chuẩn bị, tài liệu đính kèm..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-95"
                >
                  {editingClass ? 'Lưu Thay Đổi' : 'Tạo Lớp Học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineClassesView;
