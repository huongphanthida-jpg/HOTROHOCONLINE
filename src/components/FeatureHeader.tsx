import React from 'react';
import { Menu, Sparkles, Settings, Sun, Moon, Bell, GraduationCap, ChevronRight } from 'lucide-react';
import { NavigationTab } from './Sidebar';

interface FeatureHeaderProps {
  currentTab: NavigationTab;
  onOpenMobileSidebar: () => void;
  onOpenSettings: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  examInProgress: boolean;
  activeExamTitle?: string;
}

export const FeatureHeader: React.FC<FeatureHeaderProps> = ({
  currentTab,
  onOpenMobileSidebar,
  onOpenSettings,
  theme,
  onToggleTheme,
  examInProgress,
  activeExamTitle,
}) => {
  const getTabInfo = () => {
    if (examInProgress) {
      return {
        title: activeExamTitle || 'Phòng Thi Đang Làm Bài',
        category: 'Khảo Thí Trực Tuyến',
        badge: 'Đang Tính Giờ',
        badgeColor: 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 animate-pulse',
      };
    }

    switch (currentTab) {
      case 'subjects':
        return {
          title: 'Kho Môn Học & Đề Thi Trắc Nghiệm',
          category: 'Phân Hiệu 1: Khảo Thí SGK',
          badge: 'Chuẩn 1đ/câu',
          badgeColor: 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300',
        };
      case 'online_classes':
        return {
          title: 'Danh Sách Lớp Học Trực Tuyến & Phòng Học',
          category: 'Phân Hiệu 1: Cơ Sở Dữ Liệu Lớp Học',
          badge: 'Google Sheets',
          badgeColor: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
        };
      case 'documents':
        return {
          title: 'Học Lý Thuyết & Biên Soạn Đề AI',
          category: 'Phân Hiệu 1: Học Liệu Số',
          badge: 'Word • PDF • Ảnh',
          badgeColor: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
        };
      case 'games':
        return {
          title: 'Trò Chơi Học Tập (Quiz • Kéo Thả • Ghép Cặp)',
          category: 'Phân Hiệu 1: Học Qua Trò Chơi',
          badge: 'AI Từ Tài Liệu',
          badgeColor: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
        };
      case 'simulations':
        return {
          title: 'Phòng Thí Nghiệm Ảo & Mô Phỏng Tương Tác',
          category: 'Phân Hiệu 1: Mô Phỏng STEM',
          badge: 'p5.js 3D',
          badgeColor: 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300',
        };
      case 'progress':
        return {
          title: 'Bảng Tiến Độ & Nhật Ký Đồng Bộ Google Sheets',
          category: 'Phân Hiệu 2: Quản Trị & Đánh Giá',
          badge: 'Google Apps Script',
          badgeColor: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
        };
      case 'tutor':
        return {
          title: 'Gia Sư Trực Tuyến AI 24/7',
          category: 'Phân Hiệu 2: Hỗ Trợ Sư Phạm',
          badge: 'Gemini AI',
          badgeColor: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
        };
      default:
        return {
          title: 'HỌC ONLINE 2026-2027',
          category: 'Hệ Thống',
          badge: 'Active',
          badgeColor: 'bg-slate-100 text-slate-700',
        };
    }
  };

  const info = getTabInfo();

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 h-16 flex items-center justify-between transition-colors">
      {/* Left: Mobile Toggle & Breadcrumb */}
      <div className="flex items-center space-x-3">
        {/* Mobile menu button */}
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          id="btn-open-sidebar-mobile"
          aria-label="Mở thanh điều hướng phân hiệu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb info */}
        <div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <span>{info.category}</span>
            <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${info.badgeColor}`}>
              {info.badge}
            </span>
          </div>
          <h1 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white truncate max-w-[240px] sm:max-w-md">
            {info.title}
          </h1>
        </div>
      </div>

      {/* Right: Actions & Indicators */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Gemini Active Badge */}
        <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80 text-teal-700 dark:text-teal-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>Gemini AI Active</span>
        </div>

        {/* Theme switch button */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'dark' ? 'Giao diện Sáng' : 'Giao diện Tối'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
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
          title="Cài đặt API Key, Model & Sheets"
          id="btn-header-settings"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings (API Key)</span>
        </button>
      </div>
    </header>
  );
};
