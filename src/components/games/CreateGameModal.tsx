import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  FileText, 
  UploadCloud, 
  Gamepad2, 
  HelpCircle, 
  Check, 
  Layers, 
  Zap, 
  FileQuestion, 
  BookOpen, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { DocumentLearning, EducationalGame, GameType, UploadedSourceItem } from '../../types';
import { generateEducationalGameFromSources } from '../../services/aiService';

interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentLearning[];
  onGameCreated: (newGame: EducationalGame) => void;
}

export const CreateGameModal: React.FC<CreateGameModalProps> = ({
  isOpen,
  onClose,
  documents,
  onGameCreated,
}) => {
  const [sourceMode, setSourceMode] = useState<'existing' | 'upload'>('existing');
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  
  // For manual or new upload
  const [customTitle, setCustomTitle] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedSourceItem[]>([]);
  
  // Game parameters
  const [gameType, setGameType] = useState<GameType>('quiz');
  const [subjectName, setSubjectName] = useState('Toán học 12');
  
  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const isImg = file.type.startsWith('image/');
      const reader = new FileReader();

      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (isImg) {
          const base64 = result.split(',')[1];
          setUploadedFiles((prev) => [
            ...prev,
            {
              id: `src-img-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              name: file.name,
              type: 'image',
              sizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
              mimeType: file.type,
              dataUrl: result,
              base64Data: base64,
            },
          ]);
        } else {
          // Read as text
          const textReader = new FileReader();
          textReader.onload = (txtEv) => {
            const txt = (txtEv.target?.result as string) || '';
            setCustomContent((prev) => (prev ? `${prev}\n\n[Từ file ${file.name}]:\n${txt}` : txt));
            setUploadedFiles((prev) => [
              ...prev,
              {
                id: `src-doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: file.name,
                type: 'document',
                sizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
                textContent: txt,
              },
            ]);
          };
          textReader.readAsText(file);
        }
      };

      if (isImg) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleGenerate = async () => {
    setErrorMsg(null);

    let docTitle = '';
    let docContent = '';
    let sourceImages: { mimeType: string; data: string; title?: string }[] = [];
    let sourceSummary = '';

    if (sourceMode === 'existing') {
      const doc = documents.find((d) => d.id === selectedDocId);
      if (!doc) {
        setErrorMsg('Vui lòng chọn một tài liệu học tập từ danh sách!');
        return;
      }
      docTitle = doc.title;
      docContent = doc.content;

      // Extract images if any
      if (doc.sources && doc.sources.length > 0) {
        sourceImages = doc.sources
          .filter((s) => s.type === 'image' && s.base64Data)
          .map((s) => ({
            mimeType: s.mimeType || 'image/jpeg',
            data: s.base64Data!,
            title: s.name,
          }));
        sourceSummary = doc.sources.map((s) => s.name).join(', ');
      }
    } else {
      if (!customContent.trim() && uploadedFiles.length === 0) {
        setErrorMsg('Vui lòng nhập nội dung hoặc tải lên ít nhất 1 ảnh/tài liệu SGK!');
        return;
      }
      docTitle = customTitle.trim() || 'Tài liệu SGK mới tải lên';
      docContent = customContent.trim() || 'Tài liệu kiến thức SGK';

      sourceImages = uploadedFiles
        .filter((f) => f.type === 'image' && f.base64Data)
        .map((f) => ({
          mimeType: f.mimeType || 'image/jpeg',
          data: f.base64Data!,
          title: f.name,
        }));
      sourceSummary = uploadedFiles.map((f) => f.name).join(', ');
    }

    setIsGenerating(true);

    try {
      const generated = await generateEducationalGameFromSources({
        docTitle,
        docContent,
        subjectName,
        gameType,
        images: sourceImages,
        sourceItemsSummary: sourceSummary,
      });

      const newGame: EducationalGame = {
        id: `game-${Date.now()}`,
        title: generated.title,
        description: generated.description,
        subject: subjectName,
        type: generated.type,
        createdAt: new Date().toISOString(),
        sourceDocId: sourceMode === 'existing' ? selectedDocId : undefined,
        sourceDocTitle: docTitle,
        sourceCitations: generated.sourceCitations,
        quizData: generated.quizData,
        dragDropData: generated.dragDropData,
        matchingData: generated.matchingData,
        fillBlankData: generated.fillBlankData,
        highScore: 0,
        playCount: 0,
      };

      onGameCreated(newGame);
      onClose();
    } catch (err: any) {
      console.error('Failed to generate game:', err);
      setErrorMsg(err.message || 'Không thể tạo trò chơi lúc này. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">
                Tạo Trò Chơi Mới Bằng AI
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự động tạo Quiz, Kéo thả, Ghép cặp & Điền khuyết chuẩn 100% tài liệu SGK
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-6 mt-6">
          {/* Step 1: Choose Game Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              1. Chọn Định Dạng Trò Chơi Cần Tạo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* QUIZ */}
              <button
                type="button"
                onClick={() => setGameType('quiz')}
                className={`p-3 sm:p-4 rounded-2xl border text-left transition-all relative ${
                  gameType === 'quiz'
                    ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 ring-2 ring-teal-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
                }`}
              >
                {gameType === 'quiz' && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-teal-500 text-white flex items-center justify-center text-[10px]">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                <div className="w-7 h-7 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-800 dark:text-white">QUIZ Tốc Độ</div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  Trắc nghiệm 15s
                </p>
              </button>

              {/* KÉO THẢ */}
              <button
                type="button"
                onClick={() => setGameType('drag_drop')}
                className={`p-3 sm:p-4 rounded-2xl border text-left transition-all relative ${
                  gameType === 'drag_drop'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
                }`}
              >
                {gameType === 'drag_drop' && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px]">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-800 dark:text-white">KÉO THẢ</div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  Phân loại khái niệm
                </p>
              </button>

              {/* GHÉP CẶP */}
              <button
                type="button"
                onClick={() => setGameType('matching')}
                className={`p-3 sm:p-4 rounded-2xl border text-left transition-all relative ${
                  gameType === 'matching'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
                }`}
              >
                {gameType === 'matching' && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
                  <Gamepad2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-800 dark:text-white">GHÉP CẶP</div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  Nối thuật ngữ
                </p>
              </button>

              {/* ĐIỀN KHUYẾT */}
              <button
                type="button"
                onClick={() => setGameType('fill_blank')}
                className={`p-3 sm:p-4 rounded-2xl border text-left transition-all relative ${
                  gameType === 'fill_blank'
                    ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 ring-2 ring-teal-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
                }`}
              >
                {gameType === 'fill_blank' && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-teal-500 text-white flex items-center justify-center text-[10px]">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                <div className="w-7 h-7 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-800 dark:text-white">ĐIỀN KHUYẾT</div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  Hoàn thành vị trí [blank]
                </p>
              </button>
            </div>
          </div>

          {/* Step 2: Choose Source Mode */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Nguồn Tài Liệu Trích Xuất Dữ Liệu
              </label>
              <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-0.5 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setSourceMode('existing')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    sourceMode === 'existing'
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Tài Liệu Đã Có ({documents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode('upload')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    sourceMode === 'upload'
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Tải Lên Mới
                </button>
              </div>
            </div>

            {sourceMode === 'existing' ? (
              documents.length === 0 ? (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                  Chưa có tài liệu nào trong thư viện. Bạn hãy chuyển sang tab "Tải Lên Mới" để đưa tài liệu SGK lên!
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-hidden"
                  >
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.title} ({doc.sources?.length || 1} nguồn • {new Date(doc.createdAt).toLocaleDateString('vi-VN')})
                      </option>
                    ))}
                  </select>

                  {/* Selected doc preview */}
                  {selectedDocId && (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center space-x-1.5 font-bold text-slate-700 dark:text-slate-200 mb-1">
                        <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                        <span>Nội dung tóm tắt được dùng để trích xuất câu hỏi/thẻ game:</span>
                      </div>
                      <p className="line-clamp-2 italic text-slate-500 dark:text-slate-400">
                        {documents.find((d) => d.id === selectedDocId)?.content.slice(0, 180)}...
                      </p>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Tên chuyên đề / tiêu đề tài liệu SGK..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-hidden"
                />

                <textarea
                  rows={3}
                  placeholder="Dán nội dung lý thuyết, định lý, công thức SGK vào đây..."
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-hidden"
                />

                {/* Upload drag drop zone */}
                <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-900/30">
                  <UploadCloud className="w-6 h-6 text-teal-600 mb-1" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Bấm để tải thêm ảnh trang SGK, file PDF, Word
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    Hỗ trợ tải nhiều file ảnh cùng lúc
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {uploadedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((f) => (
                      <span
                        key={f.id}
                        className="px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-medium flex items-center space-x-1"
                      >
                        <span>{f.name}</span>
                        <span className="text-[10px] text-teal-600">({f.sizeFormatted})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subject selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              3. Môn Học & Cấp Lớp
            </label>
            <input
              type="text"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="VD: Toán học 12, Vật lí 10, Hóa học 11..."
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-hidden"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-bold transition-all"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-teal-600/25 transition-all flex items-center space-x-2 active:scale-95"
            id="btn-confirm-generate-game"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI Đang Soạn Trò Chơi...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Tạo Trò Chơi Ngay</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
