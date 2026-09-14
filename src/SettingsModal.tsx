import React, { useState } from 'react';
import { X, Settings, Database, RefreshCw, CheckCircle2, AlertCircle, Globe, ShieldCheck } from 'lucide-react';
import {
  AppData,
  AppSettings,
  Student,
  UserRole,
  ClassInfo,
  TeacherInfo,
  BghInfo,
  GoogleSheetConfig,
} from '../types';
import {
  validateAppsScriptUrl,
  pushFullAppDataToGoogleSheets,
  pullFullAppDataFromGoogleSheets,
  syncSessionToGoogleSheets,
  encodeSimulationPayload,
  decodeSimulationPayload,
} from '../services/sheetSyncService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  role?: UserRole;
  students?: Student[];
  classInfo?: ClassInfo;
  teacherInfo?: TeacherInfo;
  bghInfo?: BghInfo;
  googleSheetConfig?: GoogleSheetConfig;
  appSettings?: AppSettings;
  onSaveSettings?: (newSettings: AppSettings) => void;
  onSyncAppData?: (data: AppData) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  role = 'gvcn',
  students = [],
  classInfo,
  teacherInfo,
  bghInfo,
  googleSheetConfig,
  appSettings,
  onSaveSettings,
  onSyncAppData,
}) => {
  const [scriptUrl, setScriptUrl] = useState(
    appSettings?.googleAppsScriptUrl || googleSheetConfig?.sheetUrl || ''
  );
  const [geminiApiKey, setGeminiApiKey] = useState(appSettings?.geminiApiKey || '');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (scriptUrl && !validateAppsScriptUrl(scriptUrl)) {
      setStatusMsg({ type: 'error', text: 'URL Google Apps Script không đúng định dạng chuẩn!' });
      return;
    }

    const updatedSettings: AppSettings = {
      ...appSettings,
      googleAppsScriptUrl: scriptUrl.trim(),
      geminiApiKey: geminiApiKey.trim(),
    };

    if (onSaveSettings) {
      onSaveSettings(updatedSettings);
    }

    setStatusMsg({ type: 'success', text: 'Lưu cài đặt hệ thống thành công!' });
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handlePushData = async () => {
    if (!scriptUrl || !validateAppsScriptUrl(scriptUrl)) {
      setStatusMsg({ type: 'error', text: 'Vui lòng nhập URL Google Apps Script hợp lệ!' });
      return;
    }

    setIsSyncing(true);
    setStatusMsg({ type: 'info', text: 'Đang kết nối và đẩy dữ liệu lên Google Sheets...' });

    const payload: Partial<AppData> = {
      students,
      classInfo,
      teacherInfo,
      bghInfo,
    };

    const res = await pushFullAppDataToGoogleSheets(payload, scriptUrl);
    setIsSyncing(false);

    if (res.success) {
      setStatusMsg({ type: 'success', text: res.message || 'Đồng bộ đẩy dữ liệu thành công!' });
    } else {
      setStatusMsg({ type: 'error', text: res.message || 'Lỗi khi đẩy dữ liệu lên Google Sheets.' });
    }
  };

  const handlePullData = async () => {
    if (!scriptUrl || !validateAppsScriptUrl(scriptUrl)) {
      setStatusMsg({ type: 'error', text: 'Vui lòng nhập URL Google Apps Script hợp lệ!' });
      return;
    }

    setIsSyncing(true);
    setStatusMsg({ type: 'info', text: 'Đang tải dữ liệu từ Google Sheets về ứng dụng...' });

    const res = await pullFullAppDataFromGoogleSheets(scriptUrl);
    setIsSyncing(false);

    if (res.success && res.data) {
      if (onSyncAppData) {
        onSyncAppData(res.data);
      }
      setStatusMsg({ type: 'success', text: 'Đã tải và đồng bộ toàn bộ dữ liệu thành công!' });
    } else {
      setStatusMsg({ type: 'error', text: res.message || 'Không tải được dữ liệu từ Google Sheets.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#003366] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base sm:text-lg">Cấu Hình & Cài Đặt Đồng Bộ Hệ Thống</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : statusMsg.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              {statusMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {statusMsg.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
              {statusMsg.type === 'info' && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Google Apps Script Integration */}
          <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#003366] uppercase flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>URL Google Apps Script (Web App Exec)</span>
              </label>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Khuyến nghị
              </span>
            </div>
            <input
              type="text"
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#003366] bg-white"
            />
            <p className="text-[11px] text-slate-500">
              Nhập Web App Exec URL từ Google Apps Script để kết nối và tự động sao lưu dữ liệu toàn diện.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handlePushData}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Đẩy Dữ Liệu Lên Sheet</span>
              </button>
              <button
                type="button"
                onClick={handlePullData}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Tải Dữ Liệu Từ Sheet</span>
              </button>
            </div>
          </div>

          {/* Gemini AI API Key */}
          <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-200 space-y-3">
            <label className="text-xs font-bold text-[#003366] uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Khóa API Google Gemini AI</span>
            </label>
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#003366] bg-white"
            />
            <p className="text-[11px] text-slate-500">
              Khóa API hỗ trợ Trợ lý AI tư vấn chủ nhiệm, chấm điểm và tạo ngân hàng câu hỏi tự động.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Lưu Cài Đặt
          </button>
        </div>
      </div>
    </div>
  );
};
export default SettingsModal;
