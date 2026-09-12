import React, { useState, useEffect } from 'react';
import { StudentInfo } from '../types';
import { User, School, Users, ArrowRight, X, AlertCircle } from 'lucide-react';

interface StudentInfoModalProps {
  isOpen: boolean;
  subjectName: string;
  totalQuestions: number;
  onClose: () => void;
  onSubmit: (info: StudentInfo) => void;
}

export const StudentInfoModal: React.FC<StudentInfoModalProps> = ({
  isOpen,
  subjectName,
  totalQuestions,
  onClose,
  onSubmit,
}) => {
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Load saved info from previous attempt
      try {
        const saved = localStorage.getItem('last_student_info');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.fullName) setFullName(parsed.fullName);
          if (parsed.className) setClassName(parsed.className);
          if (parsed.groupName) setGroupName(parsed.groupName);
        }
      } catch (e) {
        // ignore
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Vui lòng nhập Họ và tên của bạn');
      return;
    }
    if (!className.trim()) {
      setError('Vui lòng nhập Lớp học (VD: 12A1, 10B2)');
      return;
    }
    if (!groupName.trim()) {
      setError('Vui lòng nhập Nhóm / Tổ (VD: Nhóm 1, Tổ 2)');
      return;
    }

    setError('');
    const studentInfo: StudentInfo = {
      fullName: fullName.trim(),
      className: className.trim(),
      groupName: groupName.trim(),
    };

    localStorage.setItem('last_student_info', JSON.stringify(studentInfo));
    onSubmit(studentInfo);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700 transition-all transform scale-100"
        id="student-info-modal"
      >
        {/* Header with Teal gradient */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
              📝
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">Thông Tin Thí Sinh</h3>
              <p className="text-teal-100 text-xs mt-0.5">Xác nhận để ghi danh & đồng bộ kết quả</p>
            </div>
          </div>
          <div className="mt-3 bg-white/15 backdrop-blur-xs rounded-lg px-3 py-2 text-xs flex justify-between items-center">
            <span>Môn: <strong>{subjectName}</strong></span>
            <span>Số lượng: <strong>{totalQuestions} câu hỏi</strong></span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl p-3 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Họ và tên học sinh <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(''); }}
                placeholder="Ví dụ: Nguyễn Văn An"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Lớp học <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <School className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => { setClassName(e.target.value); setError(''); }}
                  placeholder="VD: 12A1"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nhóm / Tổ <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Users className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => { setGroupName(e.target.value); setError(''); }}
                  placeholder="VD: Nhóm 1"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-700/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60 leading-relaxed">
              💡 <em>Kết quả làm bài (thời gian làm, số câu đúng, điểm số) sẽ được lưu trữ cục bộ và tự động đồng bộ về Google Sheets của giáo viên.</em>
            </p>

            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all transform active:scale-[0.99] text-sm"
              id="btn-start-exam"
            >
              <span>Bắt Đầu Làm Bài Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
