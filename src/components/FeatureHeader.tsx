import React from 'react';
import { Menu, Sparkles, Settings, Sun, Moon, Bell, GraduationCap, ChevronRight, User, ShieldCheck, Key } from 'lucide-react';
import { NavigationTab } from './Sidebar';
import { UserRole } from '../types';

interface FeatureHeaderProps {
  currentTab: NavigationTab;
  onOpenMobileSidebar: () => void;
  onOpenSettings: () => void;
  onOpenEnterCodeModal?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  examInProgress: boolean;
  activeExamTitle?: string;
  userRole?: UserRole;
  onSwitchRole?: () => void;
}

export const FeatureHeader: React.FC<FeatureHeaderProps> = ({
  currentTab,
  onOpenMobileSidebar,
  onOpenSettings,
  onOpenEnterCodeModal,
  theme,
  onToggleTheme,
  examInProgress,
  activeExamTitle,
  userRole = 'teacher',
  onSwitchRole,
}) => {
  const isStudent = userRole === 'student';

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
          <h1 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white truncate max-w-[200px] sm:max-w-md">
            {info.title}
          </h1>
        </div>
      </div>

      {/* Right: Actions & Indicators */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Role Switcher Badge Button */}
        {onSwitchRole && (
          <button
            type="button"
            onClick={onSwitchRole}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all shadow-2xs active:scale-95 ${
              isStudent
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100'
                : 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200 hover:bg-teal-100'
            }`}
            title={isStudent ? 'Đang ở vai trò Học Sinh (Bấm để đổi sang Giáo Viên)' : 'Đang ở vai trò Giáo Viên (Bấm để đổi sang Học Sinh)'}
          >
            {isStudent ? (
              <>
                <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden xs:inline">🎓 Học Sinh</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span className="hidden xs:inline">👨‍🏫 Giáo Viên</span>
              </>
            )}
          </button>
        )}

        {/* Nhập Mã ID Bài Tập button */}
        {onOpenEnterCodeModal && (
          <button
            type="button"
            onClick={onOpenEnterCodeModal}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-2xs transition-all active:scale-95 border border-amber-300/40"
            title="Nhập Mã ID Bài tập do giáo viên gửi để vào làm bài ngay"
            id="btn-header-enter-code"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">🔑 Nhập Mã ID</span>
          </button>
        )}

        {/* Gemini Active Badge */}
        <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80 text-teal-700 dark:text-teal-300 text-xs font-semibold">
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

        {!isStudent && (
          <>
            {/* Link lấy API key */}
            <a
              href="https://aistudio.google.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center space-x-1 text-xs font-bold text-rose-600 hover:text-rose-700 underline animate-pulse px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900"
              title="Bấm để lấy Gemini API key miễn phí từ Google AI Studio"
            >
              <span>Lấy API key</span>
            </a>

            {/* Settings button */}
            <button
              onClick={onOpenSettings}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-95"
              title="Cài đặt API Key, Model & Sheets"
              id="btn-header-settings"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cài Đặt</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
