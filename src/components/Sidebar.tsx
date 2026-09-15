import React from 'react';
import { 
  BookOpen, 
  FileText, 
  Gamepad2,
  BarChart3, 
  Bot, 
  Settings, 
  Sparkles, 
  Moon, 
  Sun, 
  Volume2, 
  VolumeX, 
  ChevronLeft, 
  ChevronRight, 
  GraduationCap,
  CloudOff,
  UserCheck,
  Tv,
  FlaskConical,
  ShieldCheck,
  User,
  Lock
} from 'lucide-react';
import { UserRole } from '../types';

export type NavigationTab = 'subjects' | 'documents' | 'games' | 'simulations' | 'progress' | 'tutor';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenSettings: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isSheetsConfigured: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  examInProgress?: boolean;
  userRole: UserRole;
  onSwitchRole: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
  theme,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
  isSheetsConfigured,
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
  examInProgress = false,
  userRole,
  onSwitchRole,
}) => {
  const isStudent = userRole === 'student';

  const navSections = [
    {
      groupTitle: 'PHÂN HIỆU HỌC TẬP & THI CỬ',
      items: [
        {
          id: 'subjects' as NavigationTab,
          label: 'Môn Học & Đề Thi',
          description: 'Luyện đề trắc nghiệm chuẩn SGK',
          icon: BookOpen,
          badge: 'SGK',
        },
        {
          id: 'documents' as NavigationTab,
          label: 'Học Lý Thuyết & Tài Liệu',
          description: 'Upload Word, PDF, ảnh & tạo đề AI',
          icon: FileText,
          badge: 'AI Ra Đề',
          isSpecial: true,
        },
        {
          id: 'games' as NavigationTab,
          label: 'Trò Chơi Học Tập',
          description: 'Quiz, Kéo thả & Ghép cặp từ tài liệu',
          icon: Gamepad2,
          badge: 'Tương tác',
          isSpecial: true,
        },
        {
          id: 'simulations' as NavigationTab,
          label: 'Phòng Thí Nghiệm Ảo',
          description: 'Mô phỏng p5.js Toán, Lý, Hóa 3D',
          icon: FlaskConical,
          badge: 'Mô Phỏng',
          isSpecial: true,
        },
      ],
    },
    {
      groupTitle: 'PHÂN HIỆU ĐÁNH GIÁ & HỖ TRỢ',
      items: [
        {
          id: 'progress' as NavigationTab,
          label: 'Tiến Độ & Google Sheets',
          description: 'Nhật ký điểm & đồng bộ bảng tính',
          icon: BarChart3,
          badge: isSheetsConfigured ? 'Live' : 'Chưa nối',
        },
        {
          id: 'tutor' as NavigationTab,
          label: 'Gia Sư Trực Tuyến 24/7',
          description: 'Hỏi đáp AI giải thích chi tiết',
          icon: Bot,
          badge: 'Gemini',
        },
      ],
    },
  ];

  const handleTabClick = (tab: NavigationTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Drawer / Column */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 select-none ${
          isCollapsed ? 'w-20' : 'w-72'
        } ${
          isOpenMobile
            ? 'translate-x-0 shadow-2xl'
            : '-translate-x-full lg:translate-x-0'
        }`}
        id="sidebar-navigation"
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div
            onClick={() => handleTabClick('subjects')}
            className="flex items-center space-x-3 cursor-pointer overflow-hidden group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 via-teal-500 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-300 bg-clip-text text-transparent truncate">
                    HỌC ONLINE
                  </span>
                </div>
                <div className="flex items-center space-x-1 mt-0.5">
                  <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
                    2026-2027
                  </span>
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                    SGK
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Collapse Button */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Role Switcher Pill Bar */}
        <div className="px-3 pt-3">
          {!isCollapsed ? (
            <div
              onClick={onSwitchRole}
              className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                isStudent
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 hover:bg-amber-100'
                  : 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 hover:bg-teal-100'
              }`}
              title={isStudent ? 'Bấm để đổi sang vai trò Giáo Viên (Cần nhập mã PIN)' : 'Bấm để đổi sang vai trò Học Sinh'}
            >
              <div className="flex items-center space-x-2 truncate">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 ${
                    isStudent ? 'bg-amber-500' : 'bg-teal-600'
                  }`}
                >
                  {isStudent ? <User className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                    Quyền sử dụng
                  </span>
                  <span className="text-xs font-bold truncate block">
                    {isStudent ? '🎓 Học Sinh' : '👨‍🏫 Giáo Viên'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-800/80 shadow-2xs border border-slate-200 dark:border-slate-700">
                Đổi
              </span>
            </div>
          ) : (
            <button
              onClick={onSwitchRole}
              className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center border text-white ${
                isStudent ? 'bg-amber-500 border-amber-600' : 'bg-teal-600 border-teal-700'
              }`}
              title={isStudent ? 'Quyền: Học Sinh (Bấm để đổi)' : 'Quyền: Giáo Viên (Bấm để đổi)'}
            >
              {isStudent ? <User className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </button>
          )}
        </div>

        {/* Navigation Categories & Branches */}
        <div className="flex-1 py-3 px-3 overflow-y-auto space-y-6 no-scrollbar">
          {examInProgress && !isCollapsed && (
            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl text-xs space-y-1 animate-pulse">
              <div className="flex items-center space-x-1.5 font-bold text-teal-700 dark:text-teal-300">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
                <span>Đang trong phòng thi!</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Hãy hoàn thành nộp bài ở khung bên phải trước khi chuyển tab.
              </p>
            </div>
          )}

          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1.5">
              {!isCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {section.groupTitle}
                </div>
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = currentTab === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center rounded-xl transition-all text-left group relative ${
                        isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5 space-x-3'
                      } ${
                        isActive
                          ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold shadow-md shadow-teal-600/20'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      id={`sidebar-tab-${item.id}`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon
                        className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400'
                        }`}
                      />

                      {!isCollapsed && (
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold truncate leading-tight">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0 ${
                                  isActive
                                    ? 'bg-white/20 text-white'
                                    : item.isSpecial
                                    ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[10px] truncate mt-0.5 ${
                              isActive ? 'text-teal-100' : 'text-slate-400'
                            }`}
                          >
                            {item.description}
                          </p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick Settings Action (Only for Teacher) */}
          {!isStudent && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
              {!isCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  HỆ THỐNG
                </div>
              )}

              <button
                onClick={() => {
                  onOpenSettings();
                  onCloseMobile();
                }}
                className={`w-full flex items-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white transition-all text-left ${
                  isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5 space-x-3'
                }`}
                id="sidebar-settings-btn"
                title="Cài đặt & Tích hợp"
              >
                <Settings className="w-5 h-5 text-slate-400 shrink-0" />
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold block leading-tight">
                      Cài Đặt & Kết Nối AI
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                      API Key, Apps Script & Mã PIN
                    </span>
                  </div>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Bottom Utility Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2 shrink-0">
          {/* Sheets sync status pill */}
          {!isCollapsed ? (
            <div className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-[11px]">
              <div className="flex items-center space-x-1.5 truncate">
                <i className="fa-brands fa-google-drive text-teal-600 text-xs shrink-0"></i>
                <span className="text-slate-600 dark:text-slate-300 truncate">Google Sheets</span>
              </div>
              {isSheetsConfigured ? (
                <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Đã nối</span>
                </span>
              ) : (
                <span className="text-slate-400 text-[10px]">Chưa cài</span>
              )}
            </div>
          ) : (
            <div 
              className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" 
              title={isSheetsConfigured ? 'Google Sheets: Đã kết nối' : 'Google Sheets: Chưa cấu hình'}
            >
              <i className={`fa-brands fa-google-drive ${isSheetsConfigured ? 'text-emerald-500' : 'text-slate-400'}`}></i>
            </div>
          )}

          {/* Quick switches (Theme & Sound) */}
          <div className={`flex items-center gap-1.5 ${isCollapsed ? 'flex-col' : 'justify-between'}`}>
            <button
              onClick={onToggleTheme}
              className="flex-1 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs flex items-center justify-center space-x-1.5 transition-colors"
              title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  {!isCollapsed && <span className="text-[11px] font-medium">Sáng</span>}
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  {!isCollapsed && <span className="text-[11px] font-medium">Tối</span>}
                </>
              )}
            </button>

            <button
              onClick={onToggleSound}
              className="flex-1 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs flex items-center justify-center space-x-1.5 transition-colors"
              title={soundEnabled ? 'Tắt âm thanh thông báo' : 'Bật âm thanh thông báo'}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-teal-600" />
                  {!isCollapsed && <span className="text-[11px] font-medium">Âm thanh</span>}
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  {!isCollapsed && <span className="text-[11px] font-medium">Tắt tiếng</span>}
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
