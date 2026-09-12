import React from 'react';
import { Settings, BookOpen, FileText, BarChart3, Bot, Sparkles, Moon, Sun, CloudCheck, CloudOff, Tv } from 'lucide-react';
import { NavigationTab } from './Sidebar';

interface NavbarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenSettings: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isSheetsConfigured: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
  theme,
  onToggleTheme,
  isSheetsConfigured,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand / Logo */}
          <div 
            onClick={() => onSelectTab('subjects')}
            className="flex items-center space-x-3 cursor-pointer group select-none"
            id="brand-logo"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 via-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <i className="fa-solid fa-graduation-cap text-lg"></i>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-lg font-extrabold bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-300 bg-clip-text text-transparent">
                  HỌC ONLINE
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                  2026-2027
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 -mt-0.5 hidden sm:block">
                Hệ thống Học tập & Thi cử Trực tuyến
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => onSelectTab('subjects')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'subjects'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400'
              }`}
              id="nav-tab-subjects"
            >
              <BookOpen className="w-4 h-4" />
              <span>Môn Học & Đề Thi</span>
            </button>

            <button
              onClick={() => onSelectTab('online_classes')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'online_classes'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400'
              }`}
              id="nav-tab-online-classes"
            >
              <Tv className="w-4 h-4" />
              <span>Lớp Học Trực Tuyến</span>
            </button>

            <button
              onClick={() => onSelectTab('documents')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'documents'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400'
              }`}
              id="nav-tab-documents"
            >
              <FileText className="w-4 h-4" />
              <span>Tài Liệu AI</span>
            </button>

            <button
              onClick={() => onSelectTab('progress')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'progress'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400'
              }`}
              id="nav-tab-progress"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Tiến Độ & Sheets</span>
            </button>

            <button
              onClick={() => onSelectTab('tutor')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'tutor'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400'
              }`}
              id="nav-tab-tutor"
            >
              <Bot className="w-4 h-4" />
              <span>Gia Sư AI</span>
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-2">
            {/* Google Sheets Status Badge */}
            <div 
              onClick={onOpenSettings}
              className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-colors bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              title={isSheetsConfigured ? "Google Sheets đã kết nối - Tự động đồng bộ điểm" : "Chưa cấu hình Google Sheets - Nhấn để thiết lập"}
              id="badge-sheets-status"
            >
              {isSheetsConfigured ? (
                <>
                  <i className="fa-brands fa-google-drive text-emerald-500"></i>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Sheets: Đã nối</span>
                </>
              ) : (
                <>
                  <i className="fa-brands fa-google-drive text-slate-400"></i>
                  <span>Nối Google Sheets</span>
                </>
              )}
            </div>

            {/* Dark/Light mode toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Chuyển chế độ sáng/tối"
              id="btn-toggle-theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Link lấy API key & Nút Settings */}
            <a
              href="https://aistudio.google.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center space-x-1 text-xs font-bold text-rose-600 hover:text-rose-700 underline animate-pulse px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900"
              title="Bấm để lấy Gemini API key miễn phí từ Google AI Studio"
            >
              <span>Lấy API key để sử dụng app</span>
            </a>

            {/* Settings button */}
            <button
              onClick={onOpenSettings}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-95"
              id="btn-open-settings"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings (API Key)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar navigation */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 py-2 px-1">
        <button
          onClick={() => onSelectTab('subjects')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium ${
            currentTab === 'subjects' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500'
          }`}
        >
          <BookOpen className="w-4 h-4 mb-0.5" />
          <span>Môn học</span>
        </button>

        <button
          onClick={() => onSelectTab('online_classes')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium ${
            currentTab === 'online_classes' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500'
          }`}
        >
          <Tv className="w-4 h-4 mb-0.5" />
          <span>Lớp học</span>
        </button>

        <button
          onClick={() => onSelectTab('documents')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium ${
            currentTab === 'documents' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500'
          }`}
        >
          <FileText className="w-4 h-4 mb-0.5" />
          <span>Tài liệu</span>
        </button>

        <button
          onClick={() => onSelectTab('progress')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium ${
            currentTab === 'progress' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500'
          }`}
        >
          <BarChart3 className="w-4 h-4 mb-0.5" />
          <span>Tiến độ</span>
        </button>

        <button
          onClick={() => onSelectTab('tutor')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium ${
            currentTab === 'tutor' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500'
          }`}
        >
          <Bot className="w-4 h-4 mb-0.5" />
          <span>Gia sư AI</span>
        </button>
      </div>
    </header>
  );
};

