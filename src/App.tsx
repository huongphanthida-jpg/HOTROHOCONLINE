import React, { useState, useEffect } from 'react';
import { AppData, Subject, Question, StudentInfo, SessionRecord, DocumentLearning, AppSettings, OnlineClass } from './types';
import { INITIAL_DATA } from './data/initialData';
import { Sidebar, NavigationTab } from './components/Sidebar';
import { FeatureHeader } from './components/FeatureHeader';
import { SubjectCardsView } from './components/SubjectCardsView';
import { StudentInfoModal } from './components/StudentInfoModal';
import { ExamView } from './components/ExamView';
import { ExamResultView } from './components/ExamResultView';
import { DocumentLearningView } from './components/DocumentLearningView';
import { EducationalGamesView } from './components/EducationalGamesView';
import { OnlineClassesView } from './components/OnlineClassesView';
import { InteractiveSimulationsView } from './components/InteractiveSimulationsView';
import { ProgressDashboard } from './components/ProgressDashboard';
import { AITutorModal } from './components/AITutorModal';
import { SettingsModal } from './components/SettingsModal';
import { soundEffects } from './utils/soundEffects';
import { EducationalGame } from './types';
import { GameSessionResult } from './services/sheetSyncService';

export default function App() {
  // Load application data from LocalStorage or use INITIAL_DATA
  const [appData, setAppData] = useState<AppData>(() => {
    try {
      const saved = localStorage.getItem('eduexam_app_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed.settings?.selectedModel === 'gemini-3.6-flash' ||
          parsed.settings?.selectedModel === 'gemini-2.0-flash'
        ) {
          parsed.settings.selectedModel = 'gemini-3.8-flash';
        }
        if (!parsed.games || parsed.games.length === 0) {
          parsed.games = INITIAL_DATA.games || [];
        } else {
          // Merge with INITIAL_DATA.games to ensure all default games have full data and missing games are preserved
          const initialGames = INITIAL_DATA.games || [];
          const existingGameIds = new Set(parsed.games.map((g: EducationalGame) => g.id));
          
          // Heal existing default games if their dragDropData / quizData / matchingData was corrupted or missing
          parsed.games = parsed.games.map((g: EducationalGame) => {
            const defaultMatch = initialGames.find((dg) => dg.id === g.id);
            if (defaultMatch) {
              const hasDragDrop = g.type === 'drag_drop' ? (g.dragDropData?.categories?.length && g.dragDropData?.items?.length) : true;
              const hasQuiz = g.type === 'quiz' ? g.quizData?.questions?.length : true;
              const hasMatching = g.type === 'matching' ? g.matchingData?.pairs?.length : true;
              
              return {
                ...defaultMatch,
                ...g,
                dragDropData: hasDragDrop ? g.dragDropData : defaultMatch.dragDropData,
                quizData: hasQuiz ? g.quizData : defaultMatch.quizData,
                matchingData: hasMatching ? g.matchingData : defaultMatch.matchingData,
              };
            }
            return g;
          });

          // Ensure default onlineClasses exist in state
          if (!parsed.onlineClasses || parsed.onlineClasses.length === 0) {
            parsed.onlineClasses = INITIAL_DATA.onlineClasses || [];
          }
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Could not parse saved app data, using default:', e);
    }
    return INITIAL_DATA;
  });

  // Current navigation tab: 'subjects' | 'documents' | 'progress' | 'tutor'
  const [currentTab, setCurrentTab] = useState<NavigationTab>('subjects');

  // Sidebar collapse and mobile state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Exam flow states
  const [pendingSubject, setPendingSubject] = useState<{ name: string; id: string; questions: Question[] } | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [targetGameIdFromUrl, setTargetGameIdFromUrl] = useState<string | null>(null);
  const [activeExam, setActiveExam] = useState<{
    subjectName: string;
    subjectId: string;
    questions: Question[];
    studentInfo: StudentInfo;
  } | null>(null);
  const [activeResult, setActiveResult] = useState<SessionRecord | null>(null);

  // Settings & Tutor Context modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tutorContext, setTutorContext] = useState<string | undefined>(undefined);

  // Auto-save effect
  useEffect(() => {
    if (appData.settings?.autoSave !== false) {
      try {
        localStorage.setItem('eduexam_app_data', JSON.stringify(appData));
      } catch (e) {
        console.warn('Auto save failed:', e);
      }
    }
  }, [appData]);

  // Theme effect
  useEffect(() => {
    const isDark = appData.settings?.theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [appData.settings?.theme]);

  // Sound manager sync
  useEffect(() => {
    soundEffects.enabled = appData.settings?.soundEnabled ?? true;
  }, [appData.settings?.soundEnabled]);

  // Handle choosing a subject to take exam
  const handleSelectSubjectToExam = (subject: Subject) => {
    let subjectQuestions = appData.questions.filter((q) => q.subjectId === subject.id);
    if (subjectQuestions.length === 0) {
      if (appData.questions.length > 0) {
        subjectQuestions = appData.questions.slice(0, 5);
      } else {
        // Fallback default questions if all questions were deleted, ensuring exam never crashes
        subjectQuestions = [
          {
            id: `q-${subject.id}-1`,
            subjectId: subject.id,
            content: `Câu 1: Kiến thức nền tảng chuẩn chương trình môn ${subject.name}. Đâu là phát biểu đúng nhất?`,
            type: 'multiple_choice',
            options: [
              'Phương án A: Khái niệm chính xác theo chuẩn SGK',
              'Phương án B: Nhận định chưa đầy đủ điều kiện',
              'Phương án C: Phát biểu còn mâu thuẫn lý thuyết',
              'Phương án D: Định nghĩa dành riêng cho ngoại lệ',
            ],
            correctAnswer: 0,
            explanation: `Theo lý thuyết căn bản của môn ${subject.name}, phát biểu tại phương án A là chính xác nhất.`,
            difficulty: 'easy',
            topic: subject.name,
          },
          {
            id: `q-${subject.id}-2`,
            subjectId: subject.id,
            content: `Câu 2: Vận dụng phương pháp giải quyết tình huống môn ${subject.name}, bước nào dưới đây là quan trọng nhất?`,
            type: 'multiple_choice',
            options: [
              'Phân tích kỹ lưỡng dữ kiện ban đầu và yêu cầu cốt lõi',
              'Chọn ngẫu nhiên công thức gần giống nhất',
              'Bỏ qua các bước kiểm tra lại kết quả',
              'Chỉ tập trung vào suy đoán cảm tính',
            ],
            correctAnswer: 0,
            explanation: 'Phân tích giả thiết và câu hỏi đề bài là bước tiên quyết để tìm ra hướng giải đúng.',
            difficulty: 'medium',
            topic: subject.name,
          },
          {
            id: `q-${subject.id}-3`,
            subjectId: subject.id,
            content: `Câu 3: Để củng cố kỹ năng môn ${subject.name}, phương pháp học tập nào mang lại hiệu quả cao nhất?`,
            type: 'multiple_choice',
            options: [
              'Chỉ đọc lướt qua lý thuyết trước ngày thi',
              'Hệ thống hóa kiến thức định kỳ và luyện đề thực chiến',
              'Học thuộc lòng mà không làm bài tập rèn luyện',
              'Không đối chiếu lại đáp án sau khi làm bài',
            ],
            correctAnswer: 1,
            explanation: 'Luyện tập thường xuyên và hệ thống hóa kiến thức giúp nắm vững bản chất môn học.',
            difficulty: 'easy',
            topic: subject.name,
          },
        ];
      }
    }

    setPendingSubject({
      name: subject.name,
      id: subject.id,
      questions: subjectQuestions,
    });
    setIsStudentModalOpen(true);
  };

  // Check URL parameters on mount / app load for direct QR code links (?exam=id or ?game=id)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      const examParam = params.get('exam');
      const gameParam = params.get('game');

      if (examParam) {
        // Direct link to an exam
        const targetSub = appData.subjects.find((s) => s.id === examParam);
        if (targetSub) {
          handleSelectSubjectToExam(targetSub);
        }
      } else if (gameParam) {
        // Direct link to a game
        setCurrentTab('games');
        setTargetGameIdFromUrl(gameParam);
      }
    } catch (e) {
      console.warn('Error parsing URL query parameters for QR code direct link:', e);
    }
  }, [appData.subjects, appData.games]);

  // Handle starting exam from AI-generated document questions
  const handleStartExamFromQuestions = (title: string, questions: Question[]) => {
    setPendingSubject({
      name: title,
      id: 'doc-custom',
      questions,
    });
    setIsStudentModalOpen(true);
  };

  // Student confirmed their name, class and group
  const handleConfirmStudentInfo = (info: StudentInfo) => {
    if (!pendingSubject) return;

    setActiveExam({
      subjectName: pendingSubject.name,
      subjectId: pendingSubject.id,
      questions: pendingSubject.questions,
      studentInfo: info,
    });
    setIsStudentModalOpen(false);
  };

  // When exam is finished and graded
  const handleFinishExam = (session: SessionRecord) => {
    // Add to sessions history and update progress
    setAppData((prev) => {
      const updatedSessions = [session, ...prev.sessions];
      const totalAttempts = updatedSessions.length;
      const averageScore = Number(
        (updatedSessions.reduce((acc, s) => acc + s.score, 0) / totalAttempts).toFixed(2)
      );

      // Track weak topics safely
      const newWeakTopics = [...(prev.progress?.weakTopics || []).filter((w) => w && typeof w.topic === 'string')];
      session.details?.forEach((d) => {
        if (!d.isCorrect) {
          const existing = newWeakTopics.find((w) => w && typeof w.topic === 'string' && w.topic.includes(session.subjectName));
          if (existing) {
            existing.wrongCount = (existing.wrongCount || 0) + 1;
          } else {
            newWeakTopics.push({
              topic: `${session.subjectName} (Kiến thức câu ${d.questionId})`,
              wrongCount: 1,
              subjectId: session.subjectId,
            });
          }
        }
      });

      return {
        ...prev,
        sessions: updatedSessions,
        progress: {
          ...prev.progress,
          totalAttempts,
          averageScore,
          streakDays: Math.min(prev.progress.streakDays + 1, 30),
          weakTopics: newWeakTopics.slice(0, 5),
        },
      };
    });

    setActiveExam(null);
    setActiveResult(session);
  };

  // Record game session into session history and progress
  const handleRecordGameSession = (gameResult: GameSessionResult) => {
    const isSuccessScore = gameResult.score >= 5;
    const gameTypeLabel =
      gameResult.gameType === 'quiz'
        ? 'Quiz Trắc Nghiệm'
        : gameResult.gameType === 'drag_drop'
        ? 'Kéo Thả'
        : 'Ghép Cặp';

    const newSession: SessionRecord = {
      id: `game-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      subjectId: gameResult.gameId,
      subjectName: `[Trò chơi - ${gameTypeLabel}] ${gameResult.gameTitle}`,
      studentInfo: {
        fullName: gameResult.studentInfo.fullName,
        className: gameResult.studentInfo.className,
        groupName: gameResult.studentInfo.groupName || 'Chung',
      },
      score: gameResult.score,
      totalQuestions: gameResult.totalCount,
      correctAnswers: gameResult.correctCount,
      timeSpent: gameResult.timeSpent,
      date: gameResult.submittedAt || new Date().toLocaleString('vi-VN'),
      syncedToGoogleSheets: true,
      syncTimestamp: new Date().toLocaleTimeString('vi-VN'),
      category: 'game',
      gameType: gameResult.gameType,
      gameTitle: gameResult.gameTitle,
      details: [
        {
          questionId: gameResult.gameId,
          questionContent: `Trò chơi học tập: ${gameResult.gameTitle} (${gameTypeLabel}) - Môn: ${gameResult.subject}`,
          userAnswer: gameResult.detailsSummary || `Điểm game: ${gameResult.rawScore || 0}`,
          correctAnswer: 0,
          isCorrect: isSuccessScore,
          pointsAwarded: gameResult.score,
          maxPoints: 10,
          explanation: gameResult.detailsSummary || `Đạt ${gameResult.correctCount}/${gameResult.totalCount} câu/thẻ chính xác.`,
        },
      ],
    };

    setAppData((prev) => {
      // Avoid duplicate insertion if called repeatedly
      const alreadyExists = prev.sessions.some(
        (s) =>
          s.subjectId === newSession.subjectId &&
          s.studentInfo.fullName === newSession.studentInfo.fullName &&
          Math.abs(s.timeSpent - newSession.timeSpent) < 2 &&
          s.date === newSession.date
      );
      if (alreadyExists) return prev;

      const updatedSessions = [newSession, ...prev.sessions];
      const totalAttempts = updatedSessions.length;
      const averageScore = Number(
        (updatedSessions.reduce((acc, s) => acc + s.score, 0) / totalAttempts).toFixed(2)
      );

      return {
        ...prev,
        sessions: updatedSessions,
        progress: {
          ...prev.progress,
          totalAttempts,
          averageScore,
          streakDays: Math.min(prev.progress.streakDays + 1, 30),
        },
      };
    });
  };

  // Retake current exam
  const handleRetakeExam = () => {
    if (!activeResult) return;
    const previousQuestions = activeResult.details?.map((d, i) => ({
      id: d.questionId,
      subjectId: activeResult.subjectId,
      content: d.questionContent,
      type: 'multiple_choice' as const,
      options: [
        'Đáp án A',
        'Đáp án B',
        'Đáp án C',
        'Đáp án D',
      ],
      correctAnswer: d.correctAnswer,
      explanation: d.explanation,
      difficulty: 'medium' as const,
    })) || appData.questions.slice(0, activeResult.totalQuestions);

    setActiveExam({
      subjectName: activeResult.subjectName,
      subjectId: activeResult.subjectId,
      questions: previousQuestions,
      studentInfo: activeResult.studentInfo,
    });
    setActiveResult(null);
  };

  // Return to subject list
  const handleBackToSubjects = () => {
    setActiveResult(null);
    setActiveExam(null);
    setCurrentTab('subjects');
  };

  // Online class database updater
  const handleUpdateOnlineClasses = (newClasses: OnlineClass[]) => {
    setAppData((prev) => ({
      ...prev,
      onlineClasses: newClasses,
    }));
  };

  // Document saving
  const handleSaveDocument = (doc: DocumentLearning) => {
    setAppData((prev) => {
      const existingDocs = prev.documents || [];
      const idx = existingDocs.findIndex((d) => d.id === doc.id);
      let newDocs: DocumentLearning[];
      if (idx >= 0) {
        newDocs = [...existingDocs];
        newDocs[idx] = doc;
      } else {
        newDocs = [doc, ...existingDocs];
      }
      return {
        ...prev,
        documents: newDocs,
      };
    });
  };

  const handleDeleteDocument = (docId: string) => {
    setAppData((prev) => ({
      ...prev,
      documents: (prev.documents || []).filter((d) => d.id !== docId),
    }));
  };

  // Theme toggle
  const handleToggleTheme = () => {
    const nextTheme = appData.settings?.theme === 'dark' ? 'light' : 'dark';
    setAppData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        theme: nextTheme,
      },
    }));
  };

  // Sound toggle
  const handleToggleSound = () => {
    const nextSound = !appData.settings?.soundEnabled;
    soundEffects.enabled = nextSound;
    setAppData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        soundEnabled: nextSound,
      },
    }));
  };

  // Settings update
  const handleSaveSettings = (newSettings: AppSettings) => {
    setAppData((prev) => ({
      ...prev,
      settings: newSettings,
    }));
  };

  // Reset to initial demo data
  const handleResetData = () => {
    localStorage.removeItem('eduexam_app_data');
    setAppData(INITIAL_DATA);
  };

  // Import custom JSON data
  const handleImportData = (imported: AppData) => {
    setAppData(imported);
  };

  // Update session (e.g. after manual Google Sheets sync)
  const handleUpdateSession = (updatedSession: SessionRecord) => {
    setAppData((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.id === updatedSession.id ? updatedSession : s)),
    }));
  };

  // Delete a single exam session
  const handleDeleteSession = (sessionId: string) => {
    setAppData((prev) => {
      const updatedSessions = prev.sessions.filter((s) => s.id !== sessionId);
      const totalAttempts = updatedSessions.length;
      const averageScore =
        totalAttempts > 0
          ? Number((updatedSessions.reduce((acc, s) => acc + s.score, 0) / totalAttempts).toFixed(2))
          : 0;

      return {
        ...prev,
        sessions: updatedSessions,
        progress: {
          ...prev.progress,
          totalAttempts,
          averageScore,
        },
      };
    });
  };

  // Clear all exam sessions
  const handleClearAllSessions = () => {
    setAppData((prev) => ({
      ...prev,
      sessions: [],
      progress: {
        ...prev.progress,
        totalAttempts: 0,
        averageScore: 0,
        weakTopics: [],
      },
    }));
  };

  // Delete a single subject and its questions
  const handleDeleteSubject = (subjectId: string) => {
    setAppData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== subjectId),
      questions: prev.questions.filter((q) => q.subjectId !== subjectId),
    }));
  };

  // Update a single subject (e.g. edit name, description, class, grade)
  const handleUpdateSubject = (updatedSubject: Subject) => {
    setAppData((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) => (s.id === updatedSubject.id ? updatedSubject : s)),
    }));
  };

  // Clear all subjects and questions
  const handleClearAllSubjects = () => {
    setAppData((prev) => ({
      ...prev,
      subjects: [],
      questions: [],
    }));
  };

  // Restore default subjects and questions from standard SGK data
  const handleRestoreDefaultSubjects = () => {
    setAppData((prev) => ({
      ...prev,
      subjects: INITIAL_DATA.subjects,
      questions: INITIAL_DATA.questions,
    }));
  };

  // Add custom subject with AI generated questions or fallback questions
  const handleAddSubject = (newSubject: Subject, generatedQuestions?: Question[]) => {
    const finalQuestions: Question[] =
      generatedQuestions && generatedQuestions.length > 0
        ? generatedQuestions
        : [
            {
              id: `q-${newSubject.id}-1`,
              subjectId: newSubject.id,
              content: `Câu 1 (${newSubject.name}): Khái niệm trọng tâm nào sau đây là chính xác theo chuẩn chương trình?`,
              type: 'multiple_choice',
              options: [
                'Phương án A: Khái niệm đúng theo định nghĩa chuẩn SGK',
                'Phương án B: Chưa phản ánh đúng bản chất hiện tượng',
                'Phương án C: Định nghĩa bị thiếu điều kiện tiên quyết',
                'Phương án D: Định nghĩa dành riêng cho trường hợp cá biệt',
              ],
              correctAnswer: 0,
              explanation: `Theo tài liệu chuẩn môn ${newSubject.name}, phương án A là chính xác và đầy đủ nhất.`,
              difficulty: 'easy',
              topic: newSubject.name,
            },
            {
              id: `q-${newSubject.id}-2`,
              subjectId: newSubject.id,
              content: `Câu 2 (${newSubject.name}): Trong quá trình vận dụng kiến thức giải quyết vấn đề, bước nào cần thực hiện đầu tiên?`,
              type: 'multiple_choice',
              options: [
                'Phân tích yêu cầu đề bài và xác định các dữ liệu đã biết',
                'Tiến hành tính toán trực tiếp mà không đọc kỹ dữ kiện',
                'Chọn ngẫu nhiên một công thức gần giống',
                'Bỏ qua các giả thiết và điều kiện biên',
              ],
              correctAnswer: 0,
              explanation: 'Bước đầu tiên và quan trọng nhất luôn là đọc kỹ đề và phân tích các dữ kiện đã cho.',
              difficulty: 'medium',
              topic: newSubject.name,
            },
            {
              id: `q-${newSubject.id}-3`,
              subjectId: newSubject.id,
              content: `Câu 3 (${newSubject.name}): Để củng cố và nâng cao kết quả học tập môn ${newSubject.name}, giải pháp tối ưu là:`,
              type: 'multiple_choice',
              options: [
                'Học thuộc vẹt không liên hệ thực tế',
                'Hệ thống hóa lý thuyết bằng sơ đồ tư duy và luyện bài tập định kỳ',
                'Chỉ ôn tập trước khi thi một ngày',
                'Không ghi chép trong quá trình nghe giảng',
              ],
              correctAnswer: 1,
              explanation: 'Sơ đồ tư duy và luyện tập đều đặn là phương pháp tối ưu giúp nắm chắc kiến thức.',
              difficulty: 'easy',
              topic: newSubject.name,
            },
          ];

    setAppData((prev) => ({
      ...prev,
      subjects: [
        { ...newSubject, questionsCount: finalQuestions.length },
        ...prev.subjects.filter((s) => s.id !== newSubject.id),
      ],
      questions: [
        ...prev.questions.filter((q) => q.subjectId !== newSubject.id),
        ...finalQuestions,
      ],
    }));
  };

  // Synchronize all AI documents with quizzes into Subject & Exam list
  const handleSyncFromDocuments = () => {
    const docs = appData.documents || [];
    const docsWithQuizzes = docs.filter(
      (d) => d.generatedQuestions && d.generatedQuestions.length > 0
    );

    if (docsWithQuizzes.length === 0) return;

    setAppData((prev) => {
      let updatedSubjects = [...prev.subjects];
      let updatedQuestions = [...prev.questions];

      docsWithQuizzes.forEach((doc) => {
        const detectedClass = doc.title.includes('10')
          ? '10T2'
          : doc.title.includes('11')
          ? '11A2'
          : '12D1';
        const detectedGrade = detectedClass.startsWith('10')
          ? '10'
          : detectedClass.startsWith('11')
          ? '11'
          : '12';

        const subjectId = `subj-doc-${doc.id}`;
        const existingIdx = updatedSubjects.findIndex(
          (s) => s.id === subjectId || s.sourceDocId === doc.id
        );

        const newSubject: Subject = {
          id: subjectId,
          name: `Toán lớp ${detectedClass} - ${doc.title.slice(0, 30)}`,
          description: `Đề thi trắc nghiệm AI đồng bộ từ tài liệu "${doc.title}"`,
          icon: 'Brain',
          color: 'from-purple-500 to-indigo-600',
          questionsCount: doc.generatedQuestions!.length,
          className: detectedClass,
          grade: detectedGrade,
          subjectType: 'ai_generated',
          source: 'document_ai',
          sourceDocId: doc.id,
          sourceDocTitle: doc.title,
        };

        if (existingIdx >= 0) {
          updatedSubjects[existingIdx] = newSubject;
        } else {
          updatedSubjects.push(newSubject);
        }

        const mappedQuestions: Question[] = doc.generatedQuestions!.map((q, idx) => ({
          ...q,
          id: `q-doc-${doc.id}-${idx + 1}`,
          subjectId: subjectId,
          topic: newSubject.name,
        }));

        updatedQuestions = updatedQuestions.filter((q) => q.subjectId !== subjectId);
        updatedQuestions.push(...mappedQuestions);
      });

      return {
        ...prev,
        subjects: updatedSubjects,
        questions: updatedQuestions,
      };
    });
  };

  // Synchronize a specific AI document quiz into subjects with custom class & grade
  const handleSyncDocumentToSubject = (
    doc: DocumentLearning,
    targetClass: string,
    grade: string,
    customTitle: string
  ) => {
    if (!doc.generatedQuestions || doc.generatedQuestions.length === 0) return;

    const subjectId = `subj-doc-${doc.id}`;
    const subjectName =
      customTitle || `Toán lớp ${targetClass} - ${doc.title.slice(0, 30)}`;

    const newSubject: Subject = {
      id: subjectId,
      name: subjectName,
      description: `Đề thi trắc nghiệm AI phân công cho lớp ${targetClass} (từ tài liệu: "${doc.title}")`,
      icon: 'Brain',
      color: targetClass.startsWith('10')
        ? 'from-blue-500 to-cyan-600'
        : targetClass.startsWith('11')
        ? 'from-amber-500 to-orange-600'
        : 'from-purple-500 to-indigo-600',
      questionsCount: doc.generatedQuestions.length,
      className: targetClass,
      grade: grade,
      subjectType: 'ai_generated',
      source: 'document_ai',
      sourceDocId: doc.id,
      sourceDocTitle: doc.title,
    };

    const mappedQuestions: Question[] = doc.generatedQuestions.map((q, idx) => ({
      ...q,
      id: `q-doc-${doc.id}-${idx + 1}`,
      subjectId: subjectId,
      topic: subjectName,
    }));

    setAppData((prev) => {
      const existingIdx = prev.subjects.findIndex(
        (s) => s.id === subjectId || s.sourceDocId === doc.id
      );
      let updatedSubjects = [...prev.subjects];
      if (existingIdx >= 0) {
        updatedSubjects[existingIdx] = newSubject;
      } else {
        updatedSubjects.unshift(newSubject);
      }

      let updatedQuestions = prev.questions.filter((q) => q.subjectId !== subjectId);
      updatedQuestions.push(...mappedQuestions);

      return {
        ...prev,
        subjects: updatedSubjects,
        questions: updatedQuestions,
      };
    });
  };

  // Game management handlers
  const handleSaveGame = (newGame: EducationalGame) => {
    setAppData((prev) => {
      const existing = prev.games || [];
      const updated = [newGame, ...existing.filter((g) => g.id !== newGame.id)];
      return {
        ...prev,
        games: updated,
      };
    });
  };

  const handleUpdateGameHighScore = (gameId: string, newScore: number) => {
    setAppData((prev) => {
      const existing = prev.games || [];
      const updated = existing.map((g) => {
        if (g.id === gameId) {
          const currentHigh = g.highScore || 0;
          return {
            ...g,
            highScore: Math.max(currentHigh, newScore),
            playCount: (g.playCount || 0) + 1,
          };
        }
        return g;
      });
      return {
        ...prev,
        games: updated,
      };
    });
  };

  const handleDeleteGame = (gameId: string) => {
    setAppData((prev) => ({
      ...prev,
      games: (prev.games || []).filter((g) => g.id !== gameId),
    }));
  };

  const handleClearAllGames = () => {
    setAppData((prev) => ({
      ...prev,
      games: [],
    }));
  };

  const handleRestoreDefaultGames = () => {
    setAppData((prev) => ({
      ...prev,
      games: INITIAL_DATA.games || [],
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors flex font-['Be_Vietnam_Pro',sans-serif]">
      {/* 1. BÊN TRÁI: Thanh điều hướng gồm các phân hiệu (Sidebar Navigation) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (activeExam) {
            if (window.confirm('Bạn đang làm bài thi. Chuyển phân hiệu sẽ hủy bài làm hiện tại. Tiếp tục?')) {
              setActiveExam(null);
            } else {
              return;
            }
          }
          setActiveResult(null);
          setCurrentTab(tab);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        theme={appData.settings?.theme || 'light'}
        onToggleTheme={handleToggleTheme}
        soundEnabled={appData.settings?.soundEnabled ?? true}
        onToggleSound={handleToggleSound}
        isSheetsConfigured={Boolean(appData.settings?.googleAppsScriptUrl?.trim())}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        examInProgress={Boolean(activeExam)}
      />

      {/* 2. BÊN PHẢI: Khu vực tính năng (Right Feature Area) */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Header of Right Content Area */}
        <FeatureHeader
          currentTab={currentTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          theme={appData.settings?.theme || 'light'}
          onToggleTheme={handleToggleTheme}
          examInProgress={Boolean(activeExam)}
          activeExamTitle={activeExam?.subjectName}
        />

        {/* Feature Body */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8">
          {/* If user is actively taking an exam */}
          {activeExam ? (
            <ExamView
              subjectName={activeExam.subjectName}
              subjectId={activeExam.subjectId}
              questions={activeExam.questions}
              studentInfo={activeExam.studentInfo}
              onFinishExam={handleFinishExam}
              onCancelExam={() => setActiveExam(null)}
            />
          ) : activeResult ? (
            /* If user is viewing the exam result score board */
            <ExamResultView
              session={activeResult}
              onRetake={handleRetakeExam}
              onBackToSubjects={handleBackToSubjects}
              onOpenAITutorWithContext={(ctx) => {
                setTutorContext(ctx);
                setActiveResult(null);
                setCurrentTab('tutor');
              }}
            />
          ) : (
            /* Selected Functional View */
            <div className="animate-fadeIn">
              {currentTab === 'subjects' && (
                <SubjectCardsView
                  subjects={appData.subjects}
                  progress={appData.progress}
                  documents={appData.documents || []}
                  onSelectSubjectToExam={handleSelectSubjectToExam}
                  onDeleteSubject={handleDeleteSubject}
                  onUpdateSubject={handleUpdateSubject}
                  onClearAllSubjects={handleClearAllSubjects}
                  onRestoreDefaultSubjects={handleRestoreDefaultSubjects}
                  onAddSubject={handleAddSubject}
                  onSyncFromDocuments={handleSyncFromDocuments}
                />
              )}

              {currentTab === 'online_classes' && (
                <OnlineClassesView
                  onlineClasses={appData.onlineClasses || []}
                  settings={appData.settings}
                  onUpdateClasses={handleUpdateOnlineClasses}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              )}

              {currentTab === 'documents' && (
                <DocumentLearningView
                  documents={appData.documents || []}
                  onSaveDocument={handleSaveDocument}
                  onDeleteDocument={handleDeleteDocument}
                  onStartExamFromQuestions={handleStartExamFromQuestions}
                  onSyncToSubjects={handleSyncDocumentToSubject}
                />
              )}

              {currentTab === 'games' && (
                <EducationalGamesView
                  games={appData.games || []}
                  documents={appData.documents || []}
                  initialGameId={targetGameIdFromUrl}
                  onSaveGame={handleSaveGame}
                  onUpdateGameHighScore={handleUpdateGameHighScore}
                  onDeleteGame={handleDeleteGame}
                  onClearAllGames={handleClearAllGames}
                  onRestoreDefaultGames={handleRestoreDefaultGames}
                  onRecordGameSession={handleRecordGameSession}
                  googleScriptUrl={appData.settings.googleScriptUrl}
                />
              )}

              {currentTab === 'simulations' && (
                <InteractiveSimulationsView />
              )}

              {currentTab === 'progress' && (
                <ProgressDashboard
                  progress={appData.progress}
                  sessions={appData.sessions}
                  onViewSessionDetails={(ses) => setActiveResult(ses)}
                  onUpdateSession={handleUpdateSession}
                  onDeleteSession={handleDeleteSession}
                  onClearAllSessions={handleClearAllSessions}
                />
              )}

              {currentTab === 'tutor' && (
                <AITutorModal initialContext={tutorContext} />
              )}
            </div>
          )}
        </main>

        {/* Feature Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 py-4 px-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-teal-700 dark:text-teal-400">Hỗ trợ học online 2026-2027</span>
              <span>• Nền tảng học tập & khảo thí SGK với Gemini AI và Google Sheets</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Hệ Thống Trực Tuyến</span>
              </span>
              <span>Google Apps Script Sync</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Pre-Exam Student Information Modal */}
      {isStudentModalOpen && pendingSubject && (
        <StudentInfoModal
          isOpen={isStudentModalOpen}
          subjectName={pendingSubject.name}
          totalQuestions={pendingSubject.questions.length}
          onClose={() => setIsStudentModalOpen(false)}
          onSubmit={handleConfirmStudentInfo}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          settings={appData.settings}
          appData={appData}
          onClose={() => setIsSettingsOpen(false)}
          onSaveSettings={handleSaveSettings}
          onImportData={handleImportData}
          onResetData={handleResetData}
        />
      )}
    </div>
  );
}
