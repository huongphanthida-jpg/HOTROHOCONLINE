import React, { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  HelpCircle,
  Clock,
  Sparkles,
  Layers,
  Gamepad2,
  Zap,
  Eye,
  BookOpen,
  Check,
  AlertCircle
} from 'lucide-react';
import { EducationalGame, QuizGameQuestion, DragDropCategory, DragDropItem, MatchingPair } from '../../types';
import { FormattedMathText } from '../FormattedMathText';

interface EditGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: EducationalGame | null;
  onSaveGame: (updatedGame: EducationalGame) => void;
}

export const EditGameModal: React.FC<EditGameModalProps> = ({
  isOpen,
  onClose,
  game,
  onSaveGame,
}) => {
  if (!isOpen || !game) return null;

  // Basic Info State
  const [title, setTitle] = useState(game.title);
  const [description, setDescription] = useState(game.description);
  const [subject, setSubject] = useState(game.subject);

  // Quiz State
  const [timePerQuestion, setTimePerQuestion] = useState<number>(
    game.quizData?.timePerQuestion || 15
  );
  const [quizQuestions, setQuizQuestions] = useState<QuizGameQuestion[]>(() => {
    if (game.quizData?.questions && game.quizData.questions.length > 0) {
      return game.quizData.questions.map((q) => ({
        id: q.id || `q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        question: q.question || q.content || q.prompt || q.text || q.questionText || '',
        options: Array.isArray(q.options) && q.options.length > 0
          ? q.options.map((opt) => String(opt || ''))
          : ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        explanation: q.explanation || '',
        sourceCitation: q.sourceCitation || '',
      }));
    }
    return [];
  });

  // Drag & Drop State
  const [dragCategories, setDragCategories] = useState<DragDropCategory[]>(
    game.dragDropData?.categories || []
  );
  const [dragItems, setDragItems] = useState<DragDropItem[]>(
    game.dragDropData?.items || []
  );

  // Matching State
  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>(
    game.matchingData?.pairs || []
  );

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state if game prop changes
  useEffect(() => {
    if (game) {
      setTitle(game.title);
      setDescription(game.description);
      setSubject(game.subject);
      setTimePerQuestion(game.quizData?.timePerQuestion || 15);

      if (game.quizData?.questions && game.quizData.questions.length > 0) {
        setQuizQuestions(
          game.quizData.questions.map((q) => ({
            id: q.id || `q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            question: q.question || q.content || q.prompt || q.text || q.questionText || '',
            options: Array.isArray(q.options) && q.options.length > 0
              ? q.options.map((opt) => String(opt || ''))
              : ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
            correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
            explanation: q.explanation || '',
            sourceCitation: q.sourceCitation || '',
          }))
        );
      } else {
        setQuizQuestions([]);
      }

      setDragCategories(game.dragDropData?.categories || []);
      setDragItems(game.dragDropData?.items || []);
      setMatchingPairs(game.matchingData?.pairs || []);
      setErrorMessage(null);
    }
  }, [game]);

  // Quiz Question Actions
  const handleAddQuizQuestion = () => {
    const newQ: QuizGameQuestion = {
      id: `q-edit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      question: `Câu hỏi ${quizQuestions.length + 1}`,
      options: [
        'Phương án A',
        'Phương án B',
        'Phương án C',
        'Phương án D',
      ],
      correctAnswer: 0,
      explanation: '',
    };
    setQuizQuestions((prev) => [...prev, newQ]);
  };

  const handleUpdateQuizQuestionText = (id: string, text: string) => {
    setQuizQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, question: text } : q))
    );
  };

  const handleUpdateQuizOption = (questionId: string, optionIdx: number, text: string) => {
    setQuizQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const newOpts = [...q.options];
        newOpts[optionIdx] = text;
        return { ...q, options: newOpts };
      })
    );
  };

  const handleSetQuizCorrectAnswer = (questionId: string, correctIdx: number) => {
    setQuizQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, correctAnswer: correctIdx } : q))
    );
  };

  const handleUpdateQuizExplanation = (questionId: string, text: string) => {
    setQuizQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, explanation: text } : q))
    );
  };

  const handleDeleteQuizQuestion = (id: string) => {
    setQuizQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Drag & Drop Actions
  const handleAddCategory = () => {
    const newCat: DragDropCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: `Danh mục ${dragCategories.length + 1}`,
      description: '',
    };
    setDragCategories((prev) => [...prev, newCat]);
  };

  const handleDeleteCategory = (catId: string) => {
    setDragCategories((prev) => prev.filter((c) => c.id !== catId));
    setDragItems((prev) => prev.filter((item) => item.categoryId !== catId));
  };

  const handleAddDragItem = (catId?: string) => {
    const targetCatId = catId || (dragCategories[0]?.id || 'cat_default');
    const newItem: DragDropItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      content: `Thẻ thông tin ${dragItems.length + 1}`,
      categoryId: targetCatId,
    };
    setDragItems((prev) => [...prev, newItem]);
  };

  const handleDeleteDragItem = (itemId: string) => {
    setDragItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Matching Actions
  const handleAddMatchingPair = () => {
    const newPair: MatchingPair = {
      id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      term: `Thuật ngữ ${matchingPairs.length + 1}`,
      definition: `Định nghĩa ${matchingPairs.length + 1}`,
    };
    setMatchingPairs((prev) => [...prev, newPair]);
  };

  const handleDeleteMatchingPair = (pairId: string) => {
    setMatchingPairs((prev) => prev.filter((p) => p.id !== pairId));
  };

  // Save Handler
  const handleSave = () => {
    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề trò chơi!');
      return;
    }

    if (game.type === 'quiz' && quizQuestions.length === 0) {
      setErrorMessage('Trò chơi QUIZ phải có ít nhất 1 câu hỏi!');
      return;
    }

    if (game.type === 'drag_drop' && (dragCategories.length === 0 || dragItems.length === 0)) {
      setErrorMessage('Trò chơi Kéo thả phải có ít nhất 1 danh mục và 1 thẻ kéo thả!');
      return;
    }

    if (game.type === 'matching' && matchingPairs.length === 0) {
      setErrorMessage('Trò chơi Ghép cặp phải có ít nhất 1 cặp thuật ngữ!');
      return;
    }

    const updatedGame: EducationalGame = {
      ...game,
      title: title.trim(),
      description: description.trim(),
      subject: subject.trim(),
      quizData: game.type === 'quiz' ? {
        timePerQuestion,
        questions: quizQuestions.map((q, idx) => ({
          ...q,
          id: q.id || `q-${idx + 1}`,
          question: (q.question || q.content || '').trim(),
          options: q.options.map((opt) => opt.trim()),
          correctAnswer: q.correctAnswer,
          explanation: (q.explanation || '').trim(),
        })),
      } : game.quizData,
      dragDropData: game.type === 'drag_drop' ? {
        instruction: game.dragDropData?.instruction || '',
        categories: dragCategories,
        items: dragItems,
      } : game.dragDropData,
      matchingData: game.type === 'matching' ? {
        instruction: game.matchingData?.instruction || '',
        pairs: matchingPairs,
      } : game.matchingData,
    };

    onSaveGame(updatedGame);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white flex items-center space-x-2">
                <span>Chỉnh Sửa Nội Dung Trò Chơi</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  {game.type === 'quiz' ? 'QUIZ' : game.type === 'drag_drop' ? 'Kéo thả' : 'Ghép cặp'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cập nhật câu hỏi, phương án trả lời và hiển thị trực tiếp công thức LaTeX/Hóa học
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between shrink-0">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center space-x-1.5 ${
                activeTab === 'editor'
                  ? 'border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/30'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Biên tập nội dung</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center space-x-1.5 ${
                activeTab === 'preview'
                  ? 'border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/30'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Xem trước bản đầy đủ</span>
            </button>
          </div>

          <div className="text-xs font-semibold text-slate-400 hidden sm:block">
            Mã ID: <code className="font-mono text-teal-600 dark:text-teal-400">{game.id}</code>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center space-x-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* General Metadata Form */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tên trò chơi:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tên trò chơi..."
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Môn học / Chủ đề:
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ví dụ: Toán học 12, Vật lý 10..."
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mô tả ngắn:
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả hướng dẫn hoặc nội dung trọng tâm của trò chơi..."
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden resize-none"
              />
            </div>
          </div>

          {activeTab === 'preview' ? (
            /* PREVIEW TAB */
            <div className="space-y-4">
              <div className="p-4 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-2xl text-xs text-teal-800 dark:text-teal-300">
                <p className="font-bold flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Xem trước định dạng hiển thị công thức LaTeX / Hóa học</span>
                </p>
                <p className="mt-1">
                  Dưới đây là cách học sinh sẽ nhìn thấy nội dung trò chơi khi quét mã QR code.
                </p>
              </div>

              {game.type === 'quiz' && (
                <div className="space-y-4">
                  {quizQuestions.map((q, idx) => (
                    <div key={q.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <div className="text-xs font-bold text-teal-600 dark:text-teal-400 mb-1">
                        Câu {idx + 1}:
                      </div>
                      <div className="text-sm font-bold text-slate-800 dark:text-white mb-3">
                        <FormattedMathText text={q.question || (q as any).content || ''} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                              oIdx === q.correctAnswer
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold'
                                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                              <span>
                                <FormattedMathText text={opt.replace(/^[A-D][.:\)\s]\s*/i, '')} />
                              </span>
                            </div>
                            {oIdx === q.correctAnswer && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {game.type === 'drag_drop' && (
                <div className="space-y-4">
                  <div className="font-bold text-xs text-slate-700 dark:text-slate-300">
                    Danh mục phân loại ({dragCategories.length}):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dragCategories.map((cat) => (
                      <div key={cat.id} className="p-3 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30">
                        <div className="font-bold text-xs text-indigo-900 dark:text-indigo-200">{cat.title}</div>
                        {cat.description && (
                          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">{cat.description}</div>
                        )}
                        <div className="mt-2 text-[11px] text-slate-500">
                          Thẻ thuộc danh mục này ({dragItems.filter((i) => i.categoryId === cat.id).length}):
                        </div>
                        <div className="mt-1 space-y-1">
                          {dragItems.filter((i) => i.categoryId === cat.id).map((item) => (
                            <div key={item.id} className="p-1.5 bg-white dark:bg-slate-800 rounded-lg text-xs font-medium border border-indigo-100 dark:border-indigo-900">
                              <FormattedMathText text={item.content || (item as any).text || ''} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {game.type === 'matching' && (
                <div className="space-y-3">
                  <div className="font-bold text-xs text-slate-700 dark:text-slate-300">
                    Danh sách {matchingPairs.length} cặp ghép nối:
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {matchingPairs.map((p, idx) => (
                      <div key={p.id} className="p-3 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/40 dark:bg-teal-950/30 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-bold text-teal-800 dark:text-teal-300">Thuật ngữ #{idx + 1}: </span>
                          <FormattedMathText text={p.term} />
                        </div>
                        <div>
                          <span className="font-bold text-teal-800 dark:text-teal-300">Định nghĩa: </span>
                          <FormattedMathText text={p.definition} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* EDITOR TAB */
            <div className="space-y-6">
              {/* QUIZ GAME EDITING */}
              {game.type === 'quiz' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                        Danh Sách Câu Hỏi Quiz ({quizQuestions.length} câu)
                      </h4>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1 text-xs font-bold text-slate-600 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        <span>Thời gian:</span>
                        <input
                          type="number"
                          min={5}
                          max={120}
                          value={timePerQuestion}
                          onChange={(e) => setTimePerQuestion(Number(e.target.value) || 15)}
                          className="w-14 px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-center"
                        />
                        <span>giây/câu</span>
                      </div>

                      <button
                        onClick={handleAddQuizQuestion}
                        className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm câu hỏi</span>
                      </button>
                    </div>
                  </div>

                  {quizQuestions.map((q, qIdx) => {
                    const currentQText = q.question || (q as any).content || '';
                    return (
                      <div
                        key={q.id}
                        className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 relative group"
                      >
                        {/* Question Header & Delete */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                          <span className="text-xs font-extrabold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-3 py-1 rounded-xl">
                            Câu hỏi số {qIdx + 1}
                          </span>

                          <button
                            onClick={() => handleDeleteQuizQuestion(q.id)}
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center space-x-1 text-xs font-bold"
                            title="Xóa câu hỏi này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa câu này</span>
                          </button>
                        </div>

                        {/* Question Text Field */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Nội dung câu hỏi:
                          </label>
                          <textarea
                            rows={2}
                            value={currentQText}
                            onChange={(e) => handleUpdateQuizQuestionText(q.id, e.target.value)}
                            placeholder="Nhập nội dung câu hỏi (hỗ trợ công thức LaTeX $...$ hoặc hóa học)..."
                            className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                          />
                          {/* Live Math Preview for Question */}
                          {currentQText && (
                            <div className="mt-1.5 p-2 bg-slate-100/70 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                Xem trước công thức:
                              </span>
                              <div className="font-bold text-slate-800 dark:text-slate-100">
                                <FormattedMathText text={currentQText} />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 4 Options Fields */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Các phương án trả lời (Tích chọn vào hình tròn để đặt làm ĐÁP ÁN ĐÚNG):
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {q.options.map((optText, oIdx) => {
                              const isCorrect = q.correctAnswer === oIdx;
                              const cleanOpt = optText.replace(/^[A-D][.:\)\s]\s*/i, '');
                              return (
                                <div
                                  key={oIdx}
                                  className={`p-3 rounded-xl border transition-all ${
                                    isCorrect
                                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500'
                                      : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2 mb-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleSetQuizCorrectAnswer(q.id, oIdx)}
                                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                        isCorrect
                                          ? 'bg-emerald-600 text-white'
                                          : 'border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                                      }`}
                                      title="Bấm để chọn đây làm đáp án đúng"
                                    >
                                      {isCorrect && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                    </button>
                                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                                      Phương án {String.fromCharCode(65 + oIdx)} {isCorrect ? '(Đáp án ĐÚNG)' : ''}:
                                    </span>
                                  </div>

                                  <input
                                    type="text"
                                    value={cleanOpt}
                                    onChange={(e) =>
                                      handleUpdateQuizOption(q.id, oIdx, e.target.value)
                                    }
                                    placeholder={`Nội dung đáp án ${String.fromCharCode(65 + oIdx)}...`}
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                                  />

                                  {/* Live Option Math Preview */}
                                  {cleanOpt && (
                                    <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                                      <FormattedMathText text={cleanOpt} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Explanation */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Giải thích chi tiết cho đáp án đúng (không bắt buộc):
                          </label>
                          <input
                            type="text"
                            value={q.explanation || ''}
                            onChange={(e) => handleUpdateQuizExplanation(q.id, e.target.value)}
                            placeholder="Lời giải thích chuẩn kiến thức SGK..."
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* DRAG AND DROP EDITING */}
              {game.type === 'drag_drop' && (
                <div className="space-y-6">
                  {/* Categories */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Layers className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                          Danh Mục Phân Loại ({dragCategories.length})
                        </h4>
                      </div>
                      <button
                        onClick={handleAddCategory}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm danh mục</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {dragCategories.map((cat, cIdx) => (
                        <div
                          key={cat.id}
                          className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                              Hộp danh mục #{cIdx + 1}
                            </span>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="text-rose-500 hover:text-rose-700 text-xs font-bold p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Xóa danh mục này"
                            >
                              Xóa
                            </button>
                          </div>
                          <input
                            type="text"
                            value={cat.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDragCategories((prev) =>
                                prev.map((c) => (c.id === cat.id ? { ...c, title: val } : c))
                              );
                            }}
                            placeholder="Tên danh mục..."
                            className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                          />
                          <input
                            type="text"
                            value={cat.description || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDragCategories((prev) =>
                                prev.map((c) => (c.id === cat.id ? { ...c, description: val } : c))
                              );
                            }}
                            placeholder="Mô tả tiêu chí phân loại..."
                            className="w-full px-3 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Drag Items */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                        Danh Sách Thẻ Kéo Thả ({dragItems.length} thẻ)
                      </h4>
                      <button
                        onClick={() => handleAddDragItem()}
                        className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm thẻ kéo thả</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {dragItems.map((item, iIdx) => {
                        const contentText = item.content || (item as any).text || '';
                        return (
                          <div
                            key={item.id}
                            className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2"
                          >
                            <span className="text-xs font-bold text-slate-400">#{iIdx + 1}</span>
                            <input
                              type="text"
                              value={contentText}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDragItems((prev) =>
                                  prev.map((it) => (it.id === item.id ? { ...it, content: val, text: val } : it))
                                );
                              }}
                              placeholder="Nội dung thẻ kéo thả..."
                              className="flex-1 min-w-[200px] px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 font-medium"
                            />
                            <select
                              value={item.categoryId}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDragItems((prev) =>
                                  prev.map((it) => (it.id === item.id ? { ...it, categoryId: val } : it))
                                );
                              }}
                              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 font-bold text-indigo-700 dark:text-indigo-300"
                            >
                              {dragCategories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  Thuộc: {c.title}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleDeleteDragItem(item.id)}
                              className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 text-xs font-bold"
                            >
                              Xóa
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* MATCHING EDITING */}
              {game.type === 'matching' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Gamepad2 className="w-4 h-4 text-teal-600" />
                      <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                        Các Cặp Ghép Nối Thuật Ngữ ({matchingPairs.length} cặp)
                      </h4>
                    </div>

                    <button
                      onClick={handleAddMatchingPair}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm cặp mới</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {matchingPairs.map((pair, pIdx) => (
                      <div
                        key={pair.id}
                        className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 relative"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                          <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                            Cặp ghép nối #{pIdx + 1}
                          </span>
                          <button
                            onClick={() => handleDeleteMatchingPair(pair.id)}
                            className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center space-x-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa cặp này</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Thẻ Thuật ngữ / Khái niệm / Công thức:
                            </label>
                            <input
                              type="text"
                              value={pair.term}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMatchingPairs((prev) =>
                                  prev.map((p) => (p.id === pair.id ? { ...p, term: val } : p))
                                );
                              }}
                              placeholder="Nhập thuật ngữ..."
                              className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                            />
                            {pair.term && (
                              <div className="mt-1 text-[11px] text-slate-500">
                                <FormattedMathText text={pair.term} />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Thẻ Định nghĩa / Ý nghĩa tương ứng:
                            </label>
                            <input
                              type="text"
                              value={pair.definition}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMatchingPairs((prev) =>
                                  prev.map((p) => (p.id === pair.id ? { ...p, definition: val } : p))
                                );
                              }}
                              placeholder="Nhập định nghĩa tương ứng..."
                              className="w-full px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                            />
                            {pair.definition && (
                              <div className="mt-1 text-[11px] text-slate-500">
                                <FormattedMathText text={pair.definition} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-end space-x-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition-all"
          >
            Hủy bỏ
          </button>

          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-md shadow-teal-600/20 active:scale-95 flex items-center space-x-2"
            id="btn-save-game-modal"
          >
            <Save className="w-4 h-4" />
            <span>Lưu Thay Đổi Trò Chơi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
