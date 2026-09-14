import React from 'react';
import { Subject, Question } from '../types';
import { Play, Key, Sparkles, BookOpen, ArrowRight } from 'lucide-react';

interface StudentSingleTaskViewProps {
  pendingSubject: { name: string; id: string; questions: Question[] } | null;
  examIdFromUrl?: string | null;
  onStartExam: () => void;
  onOpenEnterCodeModal: () => void;
  availableSubjects: Subject[];
  onSelectSubjectToExam: (subject: Subject) => void;
}

export const StudentSingleTaskView: React.FC<StudentSingleTaskViewProps> = ({
  pendingSubject,
  examIdFromUrl,
  onStartExam,
  onOpenEnterCodeModal,
  availableSubjects,
  onSelectSubjectToExam,
}) => {
  if (pendingSubject) {
    return (
      <div className="max-w-xl mx-auto my-6 sm:my-10 p-6 sm:p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-teal-200 dark:border-teal-900/60 text-center space-y-6 animate-fadeIn">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-600 via-teal-500 to-emerald-500 text-white flex items-center justify-center mx-auto text-2xl shadow-lg shadow-teal-500/20">
          📝
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Đã Chọn Đề Kiểm Tra Định Kỳ</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-snug break-words whitespace-pre-wrap overflow-wrap-anywhere">
            {pendingSubject.name}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Số lượng: <strong className="text-teal-600 dark:text-teal-400">{pendingSubject.questions.length} câu hỏi trắc nghiệm</strong> • Chuẩn SGK 2026-2027
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80 text-xs text-teal-900 dark:text-teal-200 leading-relaxed text-left space-y-1.5">
          <p className="font-bold flex items-center space-x-1">
            <span>💡 Hướng dẫn làm bài:</span>
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
            <li>Nhập Họ tên, Lớp và Nhóm/Tổ của em trước khi bắt đầu.</li>
            <li>Sau khi chọn đáp án xong, bấm nút <strong>"Nộp Bài"</strong> để xem kết quả và điểm số ngay lập tức.</li>
            <li>Điểm số sẽ tự động ghi nhận và chuyển về giáo viên bộ môn.</li>
          </ul>
        </div>

        <div className="pt-2 space-y-3">
          <button
            type="button"
            onClick={onStartExam}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-base shadow-xl shadow-teal-500/20 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Bắt Đầu Làm Bài Thi Ngay</span>
          </button>

          <button
            type="button"
            onClick={onOpenEnterCodeModal}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-amber-500" />
            <span>Đổi Sang Nhập Mã ID Bài Tập Khác</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto my-6 sm:my-10 p-6 sm:p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 text-center space-y-6 animate-fadeIn">
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center mx-auto text-2xl shadow-lg shadow-amber-500/20">
        🔑
      </div>

      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
          Chưa Chọn Bài Kiểm Tra
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {examIdFromUrl ? (
            <>
              Hệ thống đang chờ nhận dữ liệu đề thi cho mã ID: <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono font-bold text-teal-600">{examIdFromUrl}</code>. Vui lòng bấm nút bên dưới để chọn bài tập:
            </>
          ) : (
            'Vui lòng nhập Mã ID do Giáo viên cung cấp hoặc chọn bài tập từ danh sách bên dưới:'
          )}
        </p>
      </div>

      <div className="pt-2 space-y-3">
        <button
          type="button"
          onClick={onOpenEnterCodeModal}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Key className="w-4 h-4" />
          <span>Nhập Mã ID Bài Tập (Zalo)</span>
        </button>

        {availableSubjects.length > 0 && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700/80 text-left space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <BookOpen className="w-4 h-4 text-teal-600" />
              <span>Hoặc chọn một bài tập sẵn có trong hệ thống:</span>
            </h4>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
              {availableSubjects.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSelectSubjectToExam(sub)}
                  className="w-full p-3 rounded-xl bg-slate-50 hover:bg-teal-50 dark:bg-slate-700/50 dark:hover:bg-teal-950/50 border border-slate-200 dark:border-slate-600 text-left flex items-center justify-between transition-colors group cursor-pointer"
                >
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-teal-600 transition-colors">
                      {sub.name}
                    </h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {sub.questionsCount} câu hỏi • Mã ID: <span className="font-mono font-bold text-teal-600">{sub.id}</span>
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
