import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Edit3,
  BookOpen,
  FlaskConical,
  Code,
  Eye,
  Save,
  CheckCircle2,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { AISimulationItem } from '../types';

interface EditSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulation: AISimulationItem | null;
  onSaveSimulation: (updatedSim: AISimulationItem) => void;
}

export const EditSimulationModal: React.FC<EditSimulationModalProps> = ({
  isOpen,
  onClose,
  simulation,
  onSaveSimulation,
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Vật Lý');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState('');
  const [instructions, setInstructions] = useState('');
  const [explanation, setExplanation] = useState('');
  const [code, setCode] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'code' | 'preview'>('info');
  const [previewKey, setPreviewKey] = useState<number>(Date.now());

  useEffect(() => {
    if (simulation) {
      setTitle(simulation.title || '');
      setSubject(simulation.subject || 'Vật Lý');
      setDescription(simulation.description || '');
      setObjectives(simulation.objectives || simulation.description || '');
      setInstructions(simulation.instructions || 'Sử dụng các thanh trượt và nút bấm trên giao diện để điều chỉnh thông số thí nghiệm.');
      setExplanation(simulation.explanation || 'Mô phỏng dựa trên công thức và hiện tượng khoa học chuẩn SGK.');
      setCode(simulation.code || '');
    }
  }, [simulation]);

  if (!isOpen || !simulation) return null;

  const handleSave = () => {
    const updated: AISimulationItem = {
      ...simulation,
      title: title.trim() || simulation.title,
      subject,
      description: description.trim() || objectives.trim() || simulation.description,
      objectives: objectives.trim(),
      instructions: instructions.trim(),
      explanation: explanation.trim(),
      code: code.trim() || simulation.code,
    };

    onSaveSimulation(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-white leading-tight">
                  Chỉnh Sửa Nội Dung Thí Nghiệm Mô Phỏng
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 text-[10px] font-black uppercase">
                  {subject}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tùy chỉnh tiêu đề, môn học, hướng dẫn thao tác, giải thích khoa học và mã lập trình HTML5/p5.js
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-2 bg-slate-50/40 dark:bg-slate-900/40">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center space-x-1.5 ${
              activeTab === 'info'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-t-2 border-teal-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Nội Dung &amp; Thao Tác</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center space-x-1.5 ${
              activeTab === 'code'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-t-2 border-teal-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Mã Code HTML5 / p5.js</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('preview');
              setPreviewKey(Date.now());
            }}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center space-x-1.5 ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-t-2 border-teal-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Xem Trước Mô Phỏng</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tên Thí Nghiệm / Mô Phỏng:
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500"
                    placeholder="Tên thí nghiệm..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Môn Học Mô Phỏng:
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                  >
                    <option value="Toán Học">Toán Học</option>
                    <option value="Vật Lý">Vật Lý</option>
                    <option value="Hóa Học">Hóa Học</option>
                    <option value="Sinh Học">Sinh Học</option>
                    <option value="Địa Lý">Địa Lý</option>
                    <option value="Lịch Sử">Lịch Sử</option>
                    <option value="Tin Học">Tin Học</option>
                    <option value="Công Nghệ">Công Nghệ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mô Tả &amp; Mục Tiêu Bài Học:
                </label>
                <textarea
                  rows={2}
                  value={objectives || description}
                  onChange={(e) => {
                    setObjectives(e.target.value);
                    setDescription(e.target.value);
                  }}
                  placeholder="Mô tả mục tiêu bài học và nội dung thí nghiệm..."
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Hướng Dẫn Thực Hành / Thao Tác (Dành Cho Học Sinh):
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Các bước kéo trượt, nhấn nút hoặc thao tác trên mô phỏng..."
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Giải Thích Hiện Tượng Khoa Học (Kiến Thức Trọng Tâm):
                </label>
                <textarea
                  rows={3}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Giải thích bản chất lý thuyết, công thức hoặc hiện tượng..."
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-300">
                  Mã Nguồn HTML5 / Canvas / p5.js (Cho Phép Giáo Viên Chỉnh Sửa Trực Tiếp):
                </span>
                <span className="text-teal-600 dark:text-teal-400 font-mono text-[11px]">
                  p5.min.js • Single File HTML
                </span>
              </div>
              <textarea
                rows={16}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full p-4 font-mono text-xs rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-950 text-emerald-400 leading-relaxed focus:outline-hidden"
              />
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Xem Trước Trực Tiếp Chạy Mã Mô Phỏng:
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewKey(Date.now())}
                  className="px-3 py-1 rounded-lg bg-teal-600 text-white text-xs font-bold flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reload Preview</span>
                </button>
              </div>

              <div className="rounded-2xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-950 shadow-md">
                <iframe
                  key={previewKey}
                  title="Preview SIM"
                  srcDoc={code}
                  sandbox="allow-scripts allow-same-origin allow-modals"
                  className="w-full h-[450px] border-0"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end space-x-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100"
          >
            Hủy Bỏ
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Lưu Thay Đổi Mô Phỏng</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditSimulationModal;

