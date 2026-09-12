import React, { useState, useEffect } from 'react';
import { DocumentLearning, Question } from '../types';
import {
  X,
  Save,
  Plus,
  Trash2,
  Edit3,
  BookOpen,
  Target,
  FlaskConical,
  HelpCircle,
  Check,
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface EditDocumentModalProps {
  isOpen: boolean;
  doc: DocumentLearning | null;
  onClose: () => void;
  onSave: (updatedDoc: DocumentLearning) => void;
}

export const EditDocumentModal: React.FC<EditDocumentModalProps> = ({
  isOpen,
  doc,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'keypoints' | 'formulas' | 'questions'>('info');

  // Form State
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [formulas, setFormulas] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [toastMsg, setToastMsg] = useState('');

  // Synchronize state when modal opens or doc changes
  useEffect(() => {
    if (doc) {
      setTitle(doc.title || '');
      setSummary(doc.summary || '');
      setContent(doc.content || '');
      setKeyPoints(doc.keyPoints ? [...doc.keyPoints] : []);
      setFormulas(doc.formulas ? [...doc.formulas] : []);
      setQuestions(doc.generatedQuestions ? JSON.parse(JSON.stringify(doc.generatedQuestions)) : []);
      setActiveTab('info');
    }
  }, [doc, isOpen]);

  if (!isOpen || !doc) return null;

  // Handlers for Key Points
  const handleAddKeyPoint = () => {
    setKeyPoints([...keyPoints, 'Điểm trọng tâm kiến thức mới...']);
  };

  const handleUpdateKeyPoint = (index: number, val: string) => {
    const updated = [...keyPoints];
    updated[index] = val;
    setKeyPoints(updated);
  };

  const handleDeleteKeyPoint = (index: number) => {
    setKeyPoints(keyPoints.filter((_, i) => i !== index));
  };

  // Handlers for Formulas
  const handleAddFormula = () => {
    setFormulas([...formulas, 'Công thức hoặc định nghĩa mới...']);
  };

  const handleUpdateFormula = (index: number, val: string) => {
    const updated = [...formulas];
    updated[index] = val;
    setFormulas(updated);
  };

  const handleDeleteFormula = (index: number) => {
    setFormulas(formulas.filter((_, i) => i !== index));
  };

  // Handlers for Questions
  const handleUpdateQuestionContent = (qIndex: number, val: string) => {
    const updated = [...questions];
    updated[qIndex].content = val;
    setQuestions(updated);
  };

  const handleUpdateQuestionOption = (qIndex: number, optIndex: number, val: string) => {
    const updated = [...questions];
    if (updated[qIndex].options) {
      updated[qIndex].options[optIndex] = val;
    }
    setQuestions(updated);
  };

  const handleSetCorrectAnswer = (qIndex: number, correctIdx: number) => {
    const updated = [...questions];
    updated[qIndex].correctAnswer = correctIdx;
    setQuestions(updated);
  };

  const handleUpdateExplanation = (qIndex: number, val: string) => {
    const updated = [...questions];
    updated[qIndex].explanation = val;
    setQuestions(updated);
  };

  const handleDeleteQuestion = (qIndex: number) => {
    setQuestions(questions.filter((_, i) => i !== qIndex));
  };

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: `q-custom-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      subjectId: doc.id,
      content: 'Câu hỏi mới biên soạn từ tài liệu học tập...',
      type: 'multiple_choice',
      options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
      correctAnswer: 0,
      explanation: 'Lời giải chi tiết và căn cứ từ sách giáo khoa.',
      difficulty: 'medium',
    };
    setQuestions([...questions, newQ]);
  };

  // Save changes
  const handleSave = () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tiêu đề tài liệu!');
      return;
    }

    const updatedDoc: DocumentLearning = {
      ...doc,
      title: title.trim(),
      summary: summary.trim(),
      content: content.trim(),
      keyPoints: keyPoints.map((k) => k.trim()).filter(Boolean),
      formulas: formulas.map((f) => f.trim()).filter(Boolean),
      generatedQuestions: questions,
    };

    onSave(updatedDoc);
    setToastMsg('Đã lưu thay đổi tài liệu thành công!');
    setTimeout(() => {
      setToastMsg('');
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Edit3 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Chỉnh Sửa & Điều Chỉnh Tài Liệu Học Tập</span>
              </h2>
              <p className="text-xs text-teal-100/90 truncate max-w-md">
                Tài liệu: {doc.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-6 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'info'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>1. Thông Tin & Tóm Tắt</span>
          </button>

          <button
            onClick={() => setActiveTab('keypoints')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'keypoints'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>2. Trọng Tâm Kiến Thức ({keyPoints.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('formulas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'formulas'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>3. Công Thức & Định Nghĩa ({formulas.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'questions'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>4. Đề Thi & Câu Hỏi ({questions.length})</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white dark:bg-slate-900">
          
          {/* Tab 1: General Info & Summary */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên Tài Liệu / Tiêu Đề Bài Học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-teal-500"
                  placeholder="Nhập tiêu đề tài liệu học tập..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tóm Tắt Nội Dung Lý Thuyết Cốt Lõi
                </label>
                <textarea
                  rows={6}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-teal-500 leading-relaxed"
                  placeholder="Nội dung tóm tắt chi tiết bài học..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nội Dung Văn Bản Gốc / Ghi Chú Chi Tiết
                </label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono focus:ring-2 focus:ring-teal-500 leading-relaxed"
                  placeholder="Nội dung văn bản chi tiết trích xuất..."
                />
              </div>
            </div>
          )}

          {/* Tab 2: Key Points */}
          {activeTab === 'keypoints' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Điều chỉnh danh sách các điểm trọng tâm kiến thức bắt buộc ghi nhớ:
                </p>
                <button
                  type="button"
                  onClick={handleAddKeyPoint}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Điểm Trọng Tâm</span>
                </button>
              </div>

              {keyPoints.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                  <Target className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Chưa có điểm trọng tâm nào. Bấm nút phía trên để thêm.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {keyPoints.map((kp, idx) => (
                    <div key={idx} className="flex items-center space-x-2 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={kp}
                        onChange={(e) => handleUpdateKeyPoint(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteKeyPoint(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Formulas */}
          {activeTab === 'formulas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Điều chỉnh danh sách các công thức toán học, vật lý, hóa học hoặc định nghĩa:
                </p>
                <button
                  type="button"
                  onClick={handleAddFormula}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Công Thức</span>
                </button>
              </div>

              {formulas.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                  <FlaskConical className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Chưa có công thức nào. Bấm nút phía trên để thêm.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formulas.map((form, idx) => (
                    <div key={idx} className="flex items-center space-x-2 p-2.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={form}
                        onChange={(e) => handleUpdateFormula(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteFormula(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Questions */}
          {activeTab === 'questions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chỉnh sửa nội dung câu hỏi, các đáp án trắc nghiệm và lời giải chi tiết:
                </p>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Câu Hỏi Mới</span>
                </button>
              </div>

              {questions.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                  <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Chưa có câu hỏi đề thi nào. Bấm nút phía trên để tạo câu hỏi mới.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((q, qIdx) => (
                    <div
                      key={q.id || qIdx}
                      className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
                          Câu #{qIdx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(qIdx)}
                          className="text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-2 py-1 rounded-lg flex items-center space-x-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa Câu Hỏi</span>
                        </button>
                      </div>

                      {/* Content */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Nội dung câu hỏi:
                        </label>
                        <textarea
                          rows={2}
                          value={q.content}
                          onChange={(e) => handleUpdateQuestionContent(qIdx, e.target.value)}
                          className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Options */}
                      {q.options && q.options.length > 0 && (
                        <div className="space-y-2">
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            Các phương án lựa chọn (Đánh dấu phương án đúng):
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = q.correctAnswer === oIdx;
                              return (
                                <div
                                  key={oIdx}
                                  className={`flex items-center space-x-2 p-2 rounded-xl border ${
                                    isCorrect
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                                      : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`correct-${q.id || qIdx}`}
                                    checked={isCorrect}
                                    onChange={() => handleSetCorrectAnswer(qIdx, oIdx)}
                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0">
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => handleUpdateQuestionOption(qIdx, oIdx, e.target.value)}
                                    className="flex-1 px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-600 bg-transparent text-slate-800 dark:text-white focus:outline-none"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Explanation */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Lời giải chi tiết chuẩn SGK:
                        </label>
                        <input
                          type="text"
                          value={q.explanation || ''}
                          onChange={(e) => handleUpdateExplanation(qIdx, e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
            {toastMsg && (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span>{toastMsg}</span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Hủy Chỉnh Sửa
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Thay Đổi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
