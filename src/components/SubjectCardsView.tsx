import React, { useState, useMemo } from 'react';
import { Subject, ProgressData, Question, DocumentLearning, UserRole } from '../types';
import { CreateExamFromSourceModal } from './CreateExamFromSourceModal';
import { QRCodeShareModal } from './QRCodeShareModal';
import {
  BookOpen,
  Search,
  Award,
  Flame,
  Target,
  Play,
  Trash2,
  RotateCcw,
  PlusCircle,
  AlertTriangle,
  X,
  BookMarked,
  Sparkles,
  RefreshCw,
  Layers,
  GraduationCap,
  Filter,
  CheckCircle2,
  QrCode,
  Download,
  Edit3,
  Pencil,
  Check,
  Key,
  Copy,
} from 'lucide-react';
import { exportExamToWordDocx } from '../utils/exportUtils';
import { generateFallbackQuestionsBySubject } from '../utils/sharePayloadUtils';

interface SubjectCardsViewProps {
  subjects: Subject[];
  questions?: Question[];
  progress: ProgressData;
  documents?: DocumentLearning[];
  onSelectSubjectToExam: (subject: Subject) => void;
  onDeleteSubject?: (subjectId: string) => void;
  onUpdateSubject?: (updatedSubject: Subject) => void;
  onClearAllSubjects?: () => void;
  onRestoreDefaultSubjects?: () => void;
  onAddSubject?: (newSub: Subject, generatedQuestions?: Question[]) => void;
  onSyncFromDocuments?: () => void;
  onOpenEnterCodeModal?: () => void;
  hasUnsyncedDocuments?: boolean;
  userRole?: UserRole;
}

export const SubjectCardsView: React.FC<SubjectCardsViewProps> = ({
  subjects,
  questions = [],
  progress,
  documents = [],
  onSelectSubjectToExam,
  onDeleteSubject,
  onUpdateSubject,
  onClearAllSubjects,
  onRestoreDefaultSubjects,
  onAddSubject,
  onSyncFromDocuments,
  onOpenEnterCodeModal,
  hasUnsyncedDocuments,
  userRole = 'teacher',
}) => {
  const isStudent = userRole === 'student';
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'all' | '10' | '11' | '12' | 'document_ai'>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  // Modals state
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  const [editSubId, setEditSubId] = useState('');
  const [editSubName, setEditSubName] = useState('');
  const [editSubDesc, setEditSubDesc] = useState('');
  const [editSubClassName, setEditSubClassName] = useState('');
  const [editSubGrade, setEditSubGrade] = useState('');
  const [qrSubject, setQrSubject] = useState<Subject | null>(null);
  const [qrQuestions, setQrQuestions] = useState<Question[]>([]);
  const [isConfirmClearAllOpen, setIsConfirmClearAllOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState(false);
  const [copiedIdMap, setCopiedIdMap] = useState<Record<string, boolean>>({});

  const handleCopySubId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      const input = document.createElement('input');
      input.value = id;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopiedIdMap((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedIdMap((prev) => ({ ...prev, [id]: false }));
    }, 2500);
  };

  // New subject form state
  const [selectedSubjectType, setSelectedSubjectType] = useState('Toán');
  const [selectedGrade, setSelectedGrade] = useState('12');
  const [selectedClassNumber, setSelectedClassNumber] = useState('12D1');
  const [customClassName, setCustomClassName] = useState('');
  const [newSubName, setNewSubName] = useState('Toán lớp 12D1');
  const [newSubDesc, setNewSubDesc] = useState('Chuyên đề giải tích và hình học không gian');
  const [newSubColor, setNewSubColor] = useState('from-teal-500 to-emerald-600');
  const [newSubIcon, setNewSubIcon] = useState('fa-solid fa-square-root-variable');

  // Extract unique available classes from subjects
  const availableClasses = useMemo(() => {
    const classes = subjects.map((s) => s.className).filter(Boolean) as string[];
    return Array.from(new Set(classes)).sort();
  }, [subjects]);

  // Counts for tabs
  const gradeCounts = useMemo(() => {
    return {
      all: subjects.length,
      grade10: subjects.filter((s) => s.grade === '10' || s.className?.includes('10') || s.name.includes('10')).length,
      grade11: subjects.filter((s) => s.grade === '11' || s.className?.includes('11') || s.name.includes('11')).length,
      grade12: subjects.filter((s) => s.grade === '12' || s.className?.includes('12') || s.name.includes('12')).length,
      docAi: subjects.filter((s) => s.source === 'document_ai').length,
    };
  }, [subjects]);

  // Filtered list
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      // Search term
      const matchesSearch =
        searchTerm === '' ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.className && s.className.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.sourceDocTitle && s.sourceDocTitle.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      // Grade tab filter
      if (gradeFilter === '10') {
        const isGrade10 = s.grade === '10' || s.className?.includes('10') || s.name.includes('10');
        if (!isGrade10) return false;
      } else if (gradeFilter === '11') {
        const isGrade11 = s.grade === '11' || s.className?.includes('11') || s.name.includes('11');
        if (!isGrade11) return false;
      } else if (gradeFilter === '12') {
        const isGrade12 = s.grade === '12' || s.className?.includes('12') || s.name.includes('12');
        if (!isGrade12) return false;
      } else if (gradeFilter === 'document_ai') {
        if (s.source !== 'document_ai') return false;
      }

      // Class filter
      if (classFilter !== 'all') {
        if (s.className !== classFilter) return false;
      }

      return true;
    });
  }, [subjects, searchTerm, gradeFilter, classFilter]);

  const handleUpdateNameSuggestion = (subType: string, cls: string) => {
    const finalClass = cls.trim() || '12D1';
    setNewSubName(`${subType} lớp ${finalClass}`);
  };

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() || !onAddSubject) return;

    const finalClassName = customClassName.trim() || selectedClassNumber;

    const newSub: Subject = {
      id: `sub-custom-${Date.now()}`,
      name: newSubName.trim(),
      description: newSubDesc.trim() || `Môn học ôn luyện cho lớp ${finalClassName} chương trình 2026-2027`,
      color: newSubColor,
      icon: newSubIcon,
      questionsCount: 5,
      className: finalClassName,
      grade: selectedGrade,
      subjectType: selectedSubjectType,
      source: 'teacher_custom',
      createdAt: new Date().toISOString(),
    };

    onAddSubject(newSub);
    setIsAddModalOpen(false);
  };

  const handleTriggerSync = () => {
    if (onSyncFromDocuments) {
      onSyncFromDocuments();
      setSyncSuccessToast(true);
      setTimeout(() => setSyncSuccessToast(false), 3500);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-7 animate-fadeIn" id="subjects-view">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-6 sm:p-10 text-white shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold">
            <i className="fa-solid fa-graduation-cap text-amber-300"></i>
            <span>CHUẨN CHƯƠNG TRÌNH SÁCH GIÁO KHOA MỚI 2026-2027</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Phân Hệ Đề Thi & Môn Học Đồng Bộ
          </h1>

          <p className="text-teal-100 text-xs sm:text-sm leading-relaxed max-w-2xl">
            Tổ chức đề thi phân theo từng lớp (Toán lớp 10T2, 11A2, 12D1...), tự động đồng bộ đề thi từ phân hiệu Tài liệu AI, chấm điểm chính xác và đồng bộ kết quả thi về Google Sheets của giáo viên.
          </p>

          {/* Quick Stats Highlights */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-medium">
            <div className="flex items-center space-x-2 bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <Flame className="w-4 h-4 text-amber-300" />
              <span>Chuỗi học: <strong>{progress.streakDays} ngày liên tiếp</strong></span>
            </div>
            <div className="flex items-center space-x-2 bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <Award className="w-4 h-4 text-emerald-300" />
              <span>Điểm trung bình: <strong>{progress.averageScore.toFixed(1)} / 10</strong></span>
            </div>
            <div className="flex items-center space-x-2 bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <Target className="w-4 h-4 text-cyan-300" />
              <span>Tổng bài thi: <strong>{progress.totalAttempts} lượt</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Synchronized Notice Banner with Cross-Branch Integration */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-teal-200/80 dark:border-teal-900/50 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Đồng Bộ Đề Thi Từ Phân Hiệu Khác & Theo Lớp Học
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-[10px] font-bold">
                Tự Động Lưu Trữ
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dữ liệu đề thi trắc nghiệm được phân tách theo lớp cụ thể (Toán lớp 10T2, 11A2, 12D1...) và đồng bộ trực tiếp khi tạo đề từ phân hiệu Tài Liệu AI.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {onSyncFromDocuments && (
            <button
              type="button"
              onClick={handleTriggerSync}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all"
              id="btn-sync-all-documents"
              title="Đồng bộ tất cả bộ câu hỏi từ phân hiệu Học Lý Thuyết & Tài Liệu sang đây"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Đồng Bộ Đề Từ Tài Liệu AI</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Success Notification Toast */}
      {syncSuccessToast && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Đã đồng bộ thành công các bộ đề thi từ phân hiệu Tài liệu AI vào danh sách môn học theo lớp!</span>
        </div>
      )}

      {/* Quick ID Input Box for Students */}
      {onOpenEnterCodeModal && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-emerald-500/10 border-2 border-amber-400/80 dark:border-amber-600/80 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                  🔑 Dành cho Học Sinh: Nhập Mã ID Bài Tập
                </h4>
                <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold">
                  Độc Lập
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Thầy/cô chỉ gửi duy nhất Mã ID (ví dụ: <code className="font-mono font-bold text-teal-600 dark:text-teal-400">toan-10t2</code>, <code className="font-mono font-bold text-teal-600 dark:text-teal-400">toan-12d1</code>)? Nhấn nút bên để làm bài ngay!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenEnterCodeModal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all shrink-0 flex items-center justify-center space-x-1.5 active:scale-95 border border-amber-300/30"
          >
            <Key className="w-4 h-4" />
            <span>Nhập Mã ID Vào Thi Ngay</span>
          </button>
        </div>
      )}

      {/* Grade & Class Filter Bar */}
      <div className="space-y-3">
        {/* Row 1: Grade Selection Tabs + Actions & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Grade Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setGradeFilter('all');
                setClassFilter('all');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center space-x-1.5 ${
                gradeFilter === 'all'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
              id="tab-grade-all"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tất Cả ({gradeCounts.all})</span>
            </button>

            <button
              type="button"
              onClick={() => setGradeFilter('10')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center space-x-1.5 ${
                gradeFilter === '10'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
              id="tab-grade-10"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Khối 10 ({gradeCounts.grade10})</span>
            </button>

            <button
              type="button"
              onClick={() => setGradeFilter('11')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center space-x-1.5 ${
                gradeFilter === '11'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
              id="tab-grade-11"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Khối 11 ({gradeCounts.grade11})</span>
            </button>

            <button
              type="button"
              onClick={() => setGradeFilter('12')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center space-x-1.5 ${
                gradeFilter === '12'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
              id="tab-grade-12"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Khối 12 ({gradeCounts.grade12})</span>
            </button>

            <button
              type="button"
              onClick={() => setGradeFilter('document_ai')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center space-x-1.5 ${
                gradeFilter === 'document_ai'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60'
              }`}
              id="tab-grade-doc-ai"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Từ Tài Liệu AI ({gradeCounts.docAi})</span>
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search bar */}
            <div className="relative w-full sm:w-60">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm môn, lớp (10T2, 12D1)..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
              />
            </div>

            {/* Add Subject Button */}
            {!isStudent && onAddSubject && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors shrink-0"
                title="Thêm đề thi theo lớp mới"
                id="btn-add-subject"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Thêm Đề/Môn Theo Lớp</span>
              </button>
            )}

            {/* Restore default subjects button */}
            {!isStudent && onRestoreDefaultSubjects && subjects.length < 8 && (
              <button
                type="button"
                onClick={onRestoreDefaultSubjects}
                className="px-3 py-2 rounded-xl border border-teal-300 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-700 dark:text-teal-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors shrink-0"
                title="Khôi phục danh sách môn học mẫu chuẩn SGK và các lớp 10T2, 11A2, 12D1..."
                id="btn-restore-subjects"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi Phục Gốc</span>
              </button>
            )}

            {/* Clear All Data Button */}
            {!isStudent && onClearAllSubjects && (
              <button
                type="button"
                onClick={() => setIsConfirmClearAllOpen(true)}
                disabled={subjects.length === 0}
                className="px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center space-x-1.5 shadow-2xs disabled:opacity-40 transition-colors shrink-0"
                title="Xoá hết tất cả môn học và dữ liệu đề thi"
                id="btn-clear-all-subjects"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Xoá Hết Dữ Liệu</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Class Specific Pills (ví dụ 10T2, 11A2, 12D1) */}
        {availableClasses.length > 0 && (
          <div className="flex items-center space-x-2 overflow-x-auto py-1 text-xs">
            <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0 flex items-center space-x-1">
              <Filter className="w-3 h-3" />
              <span>Lớp học:</span>
            </span>
            <button
              type="button"
              onClick={() => setClassFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors ${
                classFilter === 'all'
                  ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Tất cả lớp
            </button>
            {availableClasses.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setClassFilter(cls)}
                className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors flex items-center space-x-1 ${
                  classFilter === cls
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'bg-teal-50/80 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 hover:bg-teal-100 border border-teal-200/60 dark:border-teal-800/60'
                }`}
              >
                <span>Lớp {cls}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid of Subject Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSubjects.map((sub) => {
          const isDocSync = sub.source === 'document_ai';

          return (
            <div
              key={sub.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md border border-slate-200/80 dark:border-slate-700/80 transition-all flex flex-col justify-between group hover:-translate-y-1 relative overflow-hidden"
              id={`subject-card-${sub.id}`}
            >
              <div>
                {/* Top row: Icon + Badges + Activated Delete Button */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${sub.color} flex items-center justify-center text-white text-xl shadow-md group-hover:scale-110 transition-transform shrink-0`}
                  >
                    <i className={sub.icon}></i>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Class badge (ví dụ: Lớp 10T2, 11A2, 12D1) */}
                    {sub.className && (
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
                        Lớp {sub.className}
                      </span>
                    )}

                    <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                      {sub.questionsCount} câu hỏi
                    </span>

                    {!isStudent && (
                      <>
                        {/* Activated Edit Button next to Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubjectToEdit(sub);
                            setEditSubId(sub.id);
                            setEditSubName(sub.name);
                            setEditSubDesc(sub.description || '');
                            setEditSubClassName(sub.className || '');
                            setEditSubGrade(sub.grade || '10');
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors"
                          title={`Chỉnh sửa tên và thông tin đề thi "${sub.name}"`}
                          aria-label={`Chỉnh sửa tên đề thi ${sub.name}`}
                          id={`btn-edit-icon-${sub.id}`}
                        >
                          <Edit3 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        </button>

                        {/* Activated Delete Button next to Subject Data */}
                        {onDeleteSubject && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubjectToDelete(sub);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title={`Xóa môn học "${sub.name}"`}
                            aria-label={`Xóa môn học ${sub.name}`}
                            id={`btn-delete-icon-${sub.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-600" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Sub-system classification tags */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {sub.grade && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 text-[10px] font-medium">
                      Khối {sub.grade}
                    </span>
                  )}

                  {/* Mã ID bài tập badge with 1-click copy */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopySubId(sub.id);
                    }}
                    className="px-2 py-0.5 rounded-md bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-[10px] font-mono font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                    title="Bấm để sao chép duy nhất Mã ID bài tập này để gửi Zalo"
                  >
                    <Key className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                    <span>ID: {sub.id}</span>
                    {copiedIdMap[sub.id] ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>

                  {isDocSync ? (
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-[10px] font-semibold flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-purple-500" />
                      <span>Đồng bộ từ Tài liệu AI</span>
                    </span>
                  ) : sub.source === 'teacher_custom' ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium">
                      Đề thi biên soạn
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-[10px] font-medium">
                      Chuẩn SGK 2026-2027
                    </span>
                  )}
                </div>

                {/* Subject info */}
                <div className="space-y-1.5 mb-5">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSubjectToEdit(sub);
                      setEditSubId(sub.id);
                      setEditSubName(sub.name);
                      setEditSubDesc(sub.description || '');
                      setEditSubClassName(sub.className || '');
                      setEditSubGrade(sub.grade || '10');
                    }}
                    className="flex items-center space-x-1.5 group/title cursor-pointer"
                    title="Bấm để sửa tên đề thi"
                  >
                    <h3 className="text-base font-bold text-slate-800 dark:text-white group-hover/title:text-teal-600 dark:group-hover/title:text-teal-400 transition-colors">
                      {sub.name}
                    </h3>
                    <Edit3 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {sub.description}
                  </p>

                  {/* Document origin title if synced */}
                  {sub.sourceDocTitle && (
                    <div className="pt-1 text-[11px] text-purple-600 dark:text-purple-400 flex items-center space-x-1">
                      <BookOpen className="w-3 h-3 shrink-0" />
                      <span className="truncate">Tài liệu gốc: {sub.sourceDocTitle}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom action row: Exam button + QR Share button + Quick Delete button */}
              <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => onSelectSubjectToExam(sub)}
                  className="flex-1 py-2.5 px-3 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-600 dark:hover:bg-teal-600 text-teal-700 dark:text-teal-300 hover:text-white dark:hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all group-hover:bg-teal-600 group-hover:text-white shadow-2xs"
                  id={`btn-start-${sub.id}`}
                >
                  <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>Vào Thi</span>
                </button>

                {/* Export Word docx Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Generate sample exam questions for export if questions list is empty
                    const dummyQuestions: Question[] = [
                      { id: 'q1', subjectId: sub.id, content: `Câu hỏi ôn tập chuẩn SGK cho môn ${sub.name} (Câu 1)`, type: 'multiple_choice', options: ['Đáp án A chuẩn', 'Đáp án B', 'Đáp án C', 'Đáp án D'], correctAnswer: 0, explanation: 'Giải thích chi tiết theo sách giáo khoa.', difficulty: 'easy' },
                      { id: 'q2', subjectId: sub.id, content: `Câu hỏi ôn tập chuẩn SGK cho môn ${sub.name} (Câu 2)`, type: 'multiple_choice', options: ['Phương án 1', 'Phương án 2 đúng', 'Phương án 3', 'Phương án 4'], correctAnswer: 1, explanation: 'Giải thích chi tiết theo sách giáo khoa.', difficulty: 'medium' },
                      { id: 'q3', subjectId: sub.id, content: `Câu hỏi ôn tập chuẩn SGK cho môn ${sub.name} (Câu 3)`, type: 'multiple_choice', options: ['Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C đúng', 'Lựa chọn D'], correctAnswer: 2, explanation: 'Giải thích chi tiết theo sách giáo khoa.', difficulty: 'hard' },
                    ];
                    exportExamToWordDocx(sub.name, dummyQuestions);
                  }}
                  className="p-2.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 transition-all active:scale-95 shrink-0 flex items-center justify-center"
                  title={`Xuất đề thi môn "${sub.name}" ra file Word (.docx)`}
                  id={`btn-word-${sub.id}`}
                >
                  <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </button>

                {/* QR Code Share Button for Zalo/Class share */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQrSubject(sub);

                    let matched = questions.filter(
                      (q) => q.subjectId === sub.id || (q.subjectId && q.subjectId.toLowerCase() === sub.id.toLowerCase())
                    );

                    if (matched.length === 0 && documents && documents.length > 0) {
                      const docMatch = documents.find(
                        (d) =>
                          d.id === sub.id ||
                          (d.title && sub.sourceDocTitle && d.title.toLowerCase() === sub.sourceDocTitle.toLowerCase()) ||
                          (d.title && sub.name && d.title.toLowerCase() === sub.name.toLowerCase())
                      );
                      if (docMatch && docMatch.generatedQuestions && docMatch.generatedQuestions.length > 0) {
                        matched = docMatch.generatedQuestions;
                      }
                    }

                    if (matched.length === 0 && (sub as any).generatedQuestions && (sub as any).generatedQuestions.length > 0) {
                      matched = (sub as any).generatedQuestions;
                    }

                    if (matched.length === 0) {
                      matched = generateFallbackQuestionsBySubject(sub);
                    }

                    setQrQuestions(matched);
                  }}
                  className="p-2.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 transition-all active:scale-95 shrink-0 flex items-center justify-center"
                  title={`Tạo mã QR & copy link chia sẻ đề thi "${sub.name}" cho Zalo`}
                  aria-label={`Mã QR đề thi ${sub.name}`}
                  id={`btn-qr-${sub.id}`}
                >
                  <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </button>

                {/* Activated Delete Button right beside Exam Button */}
                {onDeleteSubject && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSubjectToDelete(sub);
                    }}
                    className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-colors shrink-0"
                    title={`Xóa môn ${sub.name}`}
                    aria-label={`Xóa môn ${sub.name}`}
                    id={`btn-delete-action-${sub.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State when no subjects match or all deleted */}
      {filteredSubjects.length === 0 && (
        <div className="text-center py-16 px-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 space-y-4 max-w-lg mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto text-2xl">
            <BookMarked className="w-8 h-8" />
          </div>

          {subjects.length === 0 ? (
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Danh Sách Môn Học & Đề Thi Đang Trống
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Bạn đã xóa hết dữ liệu các môn học. Bạn có thể khôi phục lại dữ liệu mẫu các lớp (10T2, 11A2, 12D1...) hoặc đồng bộ đề từ tài liệu AI bất cứ lúc nào!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Không Tìm Thấy Môn Học Phù Hợp
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Không có môn học hoặc lớp nào khớp với điều kiện lọc hiện tại. Vui lòng chọn khối khác hoặc đổi từ khóa tìm kiếm.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onRestoreDefaultSubjects && (
              <button
                type="button"
                onClick={onRestoreDefaultSubjects}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-2"
                id="btn-restore-empty-state"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Khôi Phục Dữ Liệu Mẫu Các Lớp</span>
              </button>
            )}

            {onAddSubject && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Thêm Môn Theo Lớp</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: Delete Single Subject */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Xác Nhận Xóa Môn Học
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Xóa môn học và các câu hỏi đề thi tương ứng
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
              <div>
                Môn học: <strong className="text-slate-900 dark:text-white text-sm font-bold">{subjectToDelete.name}</strong>
              </div>
              {subjectToDelete.className && (
                <div>
                  Lớp: <span className="font-semibold text-teal-600 dark:text-teal-400">{subjectToDelete.className}</span>
                </div>
              )}
              <div>
                Mô tả: <span className="text-slate-500 dark:text-slate-400">{subjectToDelete.description}</span>
              </div>
              <div className="text-rose-600 dark:text-rose-400 font-semibold pt-1">
                Lưu ý: Thao tác này sẽ xóa đề thi của môn {subjectToDelete.name} ({subjectToDelete.questionsCount} câu hỏi).
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSubjectToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSubject) {
                    onDeleteSubject(subjectToDelete.id);
                  }
                  setSubjectToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
                id="btn-confirm-delete-subject"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác Nhận Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: Clear All Subjects Data */}
      {isConfirmClearAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Xóa Hết Dữ Liệu Môn Học & Đề Thi?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Thao tác sẽ xóa toàn bộ {subjects.length} môn học và đề thi hiện có
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 space-y-1">
              <p>
                Toàn bộ danh sách môn học, đề thi theo lớp (Toán 10T2, 11A2, 12D1...) và ngân hàng câu hỏi khảo thí sẽ được làm rỗng.
              </p>
              <p className="font-semibold text-rose-900 dark:text-rose-200">
                * Bạn có thể ấn nút "Khôi Phục Gốc" bất kỳ lúc nào để tải lại dữ liệu mẫu SGK 2026-2027.
              </p>
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
                  if (onClearAllSubjects) {
                    onClearAllSubjects();
                  }
                  setIsConfirmClearAllOpen(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
                id="btn-confirm-clear-all-subjects"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa Hết Dữ Liệu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AI Exam Generator from Uploaded Source & Adjustable Settings */}
      <CreateExamFromSourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        availableClasses={availableClasses}
        existingDocuments={documents}
        onCreateExam={(newSub, generatedQuestions) => {
          if (onAddSubject) {
            onAddSubject(newSub, generatedQuestions);
          }
          setSyncSuccessToast(true);
          setTimeout(() => setSyncSuccessToast(false), 4000);
          // Automatically open QR share modal for teacher to share to Zalo right away!
          setQrSubject(newSub);
          setQrQuestions(generatedQuestions || []);
        }}
      />

      {/* MODAL: QR Code Direct Sharing for Exam */}
      {qrSubject && (
        <QRCodeShareModal
          isOpen={Boolean(qrSubject)}
          onClose={() => setQrSubject(null)}
          title={qrSubject.name}
          subtitle={qrSubject.description}
          type="exam"
          targetId={qrSubject.id}
          subject={qrSubject}
          questions={qrQuestions.length > 0 ? qrQuestions : questions.filter((q) => q.subjectId === qrSubject.id)}
          metaInfo={{
            className: qrSubject.className,
            grade: qrSubject.grade,
            questionsCount: qrSubject.questionsCount,
          }}
        />
      )}

      {/* MODAL: Chỉnh Sửa Tên & Thông Tin Đề Thi */}
      {subjectToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/50 text-teal-600 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-white">
                    Chỉnh Sửa Tên & Thông Tin Đề Thi
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cập nhật tên bài thi, tên lớp học và mô tả hiển thị
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSubjectToEdit(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Tên Đề Thi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên Đề Thi / Bài Học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editSubName}
                  onChange={(e) => setEditSubName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-teal-500"
                  placeholder="Ví dụ: Đề thi Hóa học 10 - Chương 1 Nguyên tử"
                />
              </div>

              {/* Lớp Học & Khối */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Lớp Học (VD: 10A1, 10T2, 12D1)
                  </label>
                  <input
                    type="text"
                    value={editSubClassName}
                    onChange={(e) => setEditSubClassName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-teal-500"
                    placeholder="Nhập tên lớp..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Khối Lớp
                  </label>
                  <select
                    value={editSubGrade}
                    onChange={(e) => setEditSubGrade(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="10">Khối 10</option>
                    <option value="11">Khối 11</option>
                    <option value="12">Khối 12</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
              </div>

              {/* Mã ID bài tập ngắn */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Key className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Mã ID Bài Tập (Gửi Zalo cho học sinh)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">(Có thể đổi mã ngắn)</span>
                </label>
                <input
                  type="text"
                  value={editSubId}
                  onChange={(e) => setEditSubId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-teal-800 dark:text-teal-200 font-mono text-xs font-bold focus:ring-2 focus:ring-teal-500 uppercase tracking-wider"
                  placeholder="Ví dụ: TOAN10T2"
                />
              </div>

              {/* Mô Tả */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mô Tả Chi Tiết Về Đề Thi
                </label>
                <textarea
                  rows={3}
                  value={editSubDesc}
                  onChange={(e) => setEditSubDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-teal-500 leading-relaxed"
                  placeholder="Mô tả nội dung bài thi..."
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSubjectToEdit(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editSubName.trim()) {
                    alert('Vui lòng nhập tên đề thi!');
                    return;
                  }
                  const updated: Subject = {
                    ...subjectToEdit,
                    id: editSubId.trim() || subjectToEdit.id,
                    name: editSubName.trim(),
                    description: editSubDesc.trim(),
                    className: editSubClassName.trim() || undefined,
                    grade: editSubGrade || '10',
                  };
                  if (onUpdateSubject) {
                    onUpdateSubject(updated);
                  }
                  setSubjectToEdit(null);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Lưu Thay Đổi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

