import React, { useState } from 'react';
import { AppSettings, AppData, SessionRecord } from '../types';
import { X, Key, Eye, EyeOff, Sparkles, Database, FileSpreadsheet, Copy, Check, Volume2, VolumeX, Download, Upload, RotateCcw, AlertCircle, Info, CloudUpload, CloudDownload, RefreshCw } from 'lucide-react';
import { AVAILABLE_MODELS } from '../services/aiService';
import * as sheetSyncService from '../services/sheetSyncService';
import { 
  APPS_SCRIPT_SAMPLE_CODE, 
  syncSessionToGoogleSheets, 
  validateAppsScriptUrl
} from '../services/sheetSyncService';
import { soundEffects } from '../utils/soundEffects';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  appData: AppData;
  onClose: () => void;
  onSaveSettings: (newSettings: AppSettings) => void;
  onImportData: (data: AppData) => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  appData,
  onClose,
  onSaveSettings,
  onImportData,
  onResetData,
}) => {
  const [apiKey, setApiKey] = useState(settings.geminiApiKey);
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => {
    const model = settings.selectedModel || 'gemini-3-flash-preview';
    if (
      model === 'gemini-3.8-flash' ||
      model === 'gemini-3.6-flash' || 
      model === 'gemini-2.0-flash'
    ) {
      return 'gemini-3-flash-preview';
    }
    return model;
  });
  const [scriptUrl, setScriptUrl] = useState(settings.googleAppsScriptUrl || '');
  const [onlineClassSheetUrl, setOnlineClassSheetUrl] = useState(settings.onlineClassSheetUrl || '');
  const [teacherPin, setTeacherPin] = useState(settings.teacherPin || '1234');
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [copiedCode, setCopiedCode] = useState(false);
  const [testSyncStatus, setTestSyncStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testSyncMsg, setTestSyncMsg] = useState('');
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [cloudSyncMsg, setCloudSyncMsg] = useState('');

  if (!isOpen) return null;

  const handlePushAppDataCloud = async () => {
    setCloudSyncStatus('syncing');
    setCloudSyncMsg('Đang tải toàn bộ môn học, đề thi, tài liệu & trò chơi lên Google Sheets...');
    const pushFn = (sheetSyncService as any).pushFullAppDataToGoogleSheets;
    if (typeof pushFn !== 'function') {
      setCloudSyncStatus('error');
      setCloudSyncMsg('Chưa bổ sung hàm pushFullAppDataToGoogleSheets trong sheetSyncService.');
      return;
    }
    const res = await pushFn(appData, scriptUrl.trim());
    if (res.success) {
      setCloudSyncStatus('success');
      setCloudSyncMsg(res.message);
    } else {
      setCloudSyncStatus('error');
      setCloudSyncMsg(res.message);
    }
  };

  const handlePullAppDataCloud = async () => {
    setCloudSyncStatus('syncing');
    setCloudSyncMsg('Đang tải bản sao lưu dữ liệu mới nhất từ Google Sheets...');
    const pullFn = (sheetSyncService as any).pullFullAppDataFromGoogleSheets;
    if (typeof pullFn !== 'function') {
      setCloudSyncStatus('error');
      setCloudSyncMsg('Chưa bổ sung hàm pullFullAppDataFromGoogleSheets trong sheetSyncService.');
      return;
    }
    const res = await pullFn(scriptUrl.trim());
    if (res.success && res.data) {
      const merged: AppData = {
        ...appData,
        ...res.data,
        subjects: res.data.subjects || appData.subjects,
        questions: res.data.questions || appData.questions,
        documents: res.data.documents || appData.documents,
        games: res.data.games || appData.games,
        onlineClasses: res.data.onlineClasses || appData.onlineClasses,
      };
      onImportData(merged);
      setCloudSyncStatus('success');
      setCloudSyncMsg('Đã khôi phục và đồng bộ dữ liệu mới nhất từ Google Sheets thành công!');
    } else {
      setCloudSyncStatus('error');
      setCloudSyncMsg(res.message);
    }
  };

  const handleSave = () => {
    const updated: AppSettings = {
      ...settings,
      geminiApiKey: apiKey.trim(),
      selectedModel,
      googleAppsScriptUrl: scriptUrl.trim(),
      onlineClassSheetUrl: onlineClassSheetUrl.trim(),
      teacherPin: teacherPin.trim() || '1234',
      soundEnabled,
    };

    localStorage.setItem('gemini_api_key', apiKey.trim());
    localStorage.setItem('selected_model', selectedModel);
    localStorage.setItem('google_apps_script_url', scriptUrl.trim());
    localStorage.setItem('online_class_sheet_url', onlineClassSheetUrl.trim());
    localStorage.setItem('teacher_pin', teacherPin.trim() || '1234');
    localStorage.setItem('sound_enabled', String(soundEnabled));
    soundEffects.enabled = soundEnabled;

    onSaveSettings(updated);
    onClose();
  };

  const handleCopyAppsScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_SAMPLE_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleTestGoogleSheets = async () => {
    const validation = validateAppsScriptUrl(scriptUrl);
    if (!validation.isValid) {
      setTestSyncStatus('error');
      setTestSyncMsg(validation.message || 'URL Google Apps Script không hợp lệ.');
      return;
    }

    setTestSyncStatus('testing');
    setTestSyncMsg('Đang gửi dữ liệu kiểm tra kết nối...');

    const mockSession: SessionRecord = {
      id: `test-${Date.now()}`,
      subjectId: 'test-conn',
      subjectName: 'Kiểm Tra Kết Nối Google Sheets',
      studentInfo: {
        fullName: 'Hệ Thống Kiểm Tra',
        className: 'Lớp Demo',
        groupName: 'Tổ 1',
      },
      score: 10,
      totalQuestions: 1,
      correctAnswers: 1,
      timeSpent: 15,
      date: new Date().toLocaleString('vi-VN'),
      syncedToGoogleSheets: false,
    };

    const res = await syncSessionToGoogleSheets(mockSession, scriptUrl.trim());

    if (res.success) {
      setTestSyncStatus('success');
      setTestSyncMsg(res.message || 'Kết nối Google Sheets thành công! Dòng dữ liệu mẫu đã được ghi vào bảng tính.');
    } else {
      setTestSyncStatus('error');
      setTestSyncMsg(res.message);
    }
  };

  const handleExportBackup = () => {
    const jsonStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EduExam_Backup_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.subjects && imported.questions) {
          onImportData(imported);
          alert('Khôi phục dữ liệu ứng dụng thành công!');
          onClose();
        } else {
          alert('File JSON không đúng cấu trúc EduExam!');
        }
      } catch (err) {
        alert('File JSON không hợp lệ!');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 overflow-hidden"
        id="settings-modal"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Cấu Hình & Tích Hợp AI</h3>
              <p className="text-teal-100 text-xs mt-0.5">Quản lý Gemini AI API, Google Sheets & Dữ liệu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          {/* Section 1: Gemini AI API Key */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>Gemini API Key (Tùy chọn bổ sung)</span>
              </label>
              <a
                href="https://aistudio.google.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center space-x-1 animate-pulse"
              >
                <span>Lấy API key để sử dụng app (https://aistudio.google.com/api-keys)</span>
                <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
              </a>
            </div>

            <div className="bg-teal-50/60 dark:bg-teal-950/30 p-3 rounded-xl border border-teal-100 dark:border-teal-900/40 text-xs text-teal-800 dark:text-teal-200 flex items-start space-x-2">
              <Info className="w-4 h-4 shrink-0 text-teal-600 mt-0.5" />
              <span>
                Trong môi trường Google AI Studio, ứng dụng đã được tích hợp sẵn kết nối AI bảo mật trên máy chủ. Bạn có thể nhập thêm khóa cá nhân để tăng hạn mức hoặc sử dụng khi chạy độc lập!
              </span>
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy... (Để trống để sử dụng cấu hình mặc định của hệ thống)"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Section 2: AI Model Selection */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 dark:text-white flex items-center space-x-2">
              <i className="fa-solid fa-microchip text-teal-600"></i>
              <span>Mô Hình AI (Tự Động Fallback Khi Có Lỗi)</span>
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} [{m.tag}]
                </option>
              ))}
            </select>
          </div>

          {/* Section 3: Google Sheets Apps Script Sync & Class Database */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Google Apps Script Web App URL (Kết Quả Thi & Lớp Học)</span>
              </label>
            </div>

            <div className="space-y-2">
              <input
                type="url"
                value={scriptUrl}
                onChange={(e) => {
                  setScriptUrl(e.target.value);
                  setTestSyncStatus('idle');
                }}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
              />

              {scriptUrl.includes('docs.google.com/spreadsheets') && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed font-semibold">
                  ⚠️ BẠN ĐÃ DÁN NHẦM LINK GOOGLE SHEET! Ô này yêu cầu dán link <strong>Web App Google Apps Script</strong> (bắt đầu bằng <code>https://script.google.com/macros/s/.../exec</code>), không phải link chỉnh sửa file Google Sheet. Hãy mở menu <em>Tiện ích mở rộng &gt; Apps Script &gt; Triển khai</em> để lấy link chuẩn!
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  URL Google Sheet / Link CSV Công Khai Danh Sách Lớp Học Trực Tuyến (Tùy chọn riêng)
                </label>
                <input
                  type="url"
                  value={onlineClassSheetUrl}
                  onChange={(e) => setOnlineClassSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/... hoặc URL Apps Script riêng"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleTestGoogleSheets}
                  disabled={testSyncStatus === 'testing'}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  <i className={`fa-solid fa-satellite-dish text-xs ${testSyncStatus === 'testing' ? 'animate-pulse text-teal-600' : ''}`}></i>
                  <span>{testSyncStatus === 'testing' ? 'Đang thử nghiệm...' : 'Kiểm tra kết nối'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyAppsScript}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Đã chép Code.gs!' : 'Sao chép mã Google Apps Script mẫu'}</span>
                </button>
              </div>

              {testSyncStatus !== 'idle' && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                    testSyncStatus === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                      : testSyncStatus === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                      : 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-300'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{testSyncMsg}</span>
                </div>
              )}
            </div>

            {/* Expandable Apps Script Guide */}
            <details className="group mt-2">
              <summary className="text-xs font-semibold text-slate-500 hover:text-teal-600 cursor-pointer list-none flex items-center space-x-1.5">
                <span>📖 Xem hướng dẫn cài đặt Google Sheets trong 1 phút</span>
                <span className="group-open:rotate-180 transition-transform text-[10px]">▼</span>
              </summary>
              <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs space-y-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>1. Mở một trang Google Sheet mới của bạn.</p>
                <p>2. Vào menu <strong>Tiện ích mở rộng (Extensions)</strong> &gt; <strong>Apps Script</strong>.</p>
                <p>3. Xóa code cũ, nhấn nút <em>"Sao chép mã Google Apps Script mẫu"</em> ở trên và dán vào.</p>
                <p>4. Nhấn <strong>Triển khai (Deploy)</strong> &gt; <strong>Tùy chọn triển khai mới (New deployment)</strong>.</p>
                <p>5. Chọn loại: <strong>Ứng dụng web (Web app)</strong>, quyền truy cập: <strong>Bất kỳ ai (Anyone)</strong>.</p>
                <p>6. Sao chép đường link Web App kết thúc bằng <code>/exec</code> và dán vào ô trên!</p>
              </div>
            </details>
          </div>

          {/* Section 4: Security PIN Code for Role Switching */}
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <label className="font-bold text-slate-800 dark:text-white flex items-center space-x-2">
              <i className="fa-solid fa-lock text-amber-500"></i>
              <span>Mã PIN Giáo Viên (Bảo vệ chuyển đổi quyền hạn)</span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Mã PIN này được dùng để xác minh khi bấm đổi từ vai trò <strong>Học Sinh</strong> sang <strong>Giáo Viên</strong>. (Mặc định: <code>1234</code>)
            </p>
            <input
              type="text"
              maxLength={10}
              value={teacherPin}
              onChange={(e) => setTeacherPin(e.target.value)}
              placeholder="VD: 1234, 6868"
              className="w-full sm:w-48 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Section 5: Preferences & Data Backup */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                {soundEnabled ? <Volume2 className="w-4 h-4 text-teal-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                <span>Hiệu Ứng Âm Thanh Khi Làm Bài</span>
              </span>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  soundEnabled ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`block w-4 h-4 bg-white rounded-full shadow-xs transform transition-transform absolute top-1 ${
                    soundEnabled ? 'left-6' : 'left-1'
                  }`}
                ></span>
              </button>
            </div>

            {/* Cloud Data Sync Block */}
            <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 rounded-xl border border-teal-200/80 dark:border-teal-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-800 dark:text-teal-200 flex items-center space-x-1.5">
                  <CloudUpload className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Đồng Bộ Dữ Liệu Ứng Dụng Với Google Sheets</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                  Cloud Live Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Tải toàn bộ môn học, đề thi, tài liệu & trò chơi bạn vừa tạo lên Google Sheets để các thiết bị khác hoặc học sinh luôn có dữ liệu mới nhất.
              </p>
              
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePushAppDataCloud}
                  disabled={cloudSyncStatus === 'syncing'}
                  className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-all active:scale-95"
                  title="Tải toàn bộ môn học, đề thi, tài liệu mới tạo lên Google Sheets"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>{cloudSyncStatus === 'syncing' ? 'Đang đồng bộ Cloud...' : 'Đẩy Dữ Liệu Mới Lên Cloud'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullAppDataCloud}
                  disabled={cloudSyncStatus === 'syncing'}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-all active:scale-95"
                  title="Tải dữ liệu mới nhất được cập nhật từ Google Sheets về ứng dụng"
                >
                  <CloudDownload className="w-4 h-4" />
                  <span>{cloudSyncStatus === 'syncing' ? 'Đang tải...' : 'Tải Dữ Liệu Mới Từ Cloud'}</span>
                </button>
              </div>

              {cloudSyncMsg && (
                <div
                  className={`p-2 rounded-lg text-xs font-medium ${
                    cloudSyncStatus === 'success'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : cloudSyncStatus === 'error'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 animate-pulse'
                  }`}
                >
                  {cloudSyncMsg}
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-teal-600" />
                <span>Sao Lưu File (JSON)</span>
              </button>

              <label className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>Khôi Phục Dữ Liệu</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Khôi phục toàn bộ câu hỏi và môn học về dữ liệu mẫu mặc định?')) {
                    onResetData();
                    onClose();
                  }
                }}
                className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                <span>Đặt Lại Dữ Liệu Mẫu</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-700/40 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 rounded-xl shadow-md transition-all"
            id="btn-save-settings"
          >
            Lưu Cấu Hình
          </button>
        </div>
      </div>
    </div>
  );
};
