import React, { useState, useEffect, useRef } from 'react';
import { 
  AppData, 
  Subject, 
  Question, 
  StudentInfo, 
  SessionRecord, 
  DocumentLearning, 
  AppSettings, 
  EducationalGame, 
  UserRole,
  AISimulationItem
} from './types';
import { INITIAL_DATA } from './data/initialData';
import { Sidebar, NavigationTab } from './components/Sidebar';
import { FeatureHeader } from './components/FeatureHeader';
import { SubjectCardsView } from './components/SubjectCardsView';
import { StudentInfoModal } from './components/StudentInfoModal';
import { ExamView } from './components/ExamView';
import { ExamResultView } from './components/ExamResultView';
import { DocumentLearningView } from './components/DocumentLearningView';
import { EducationalGamesView } from './components/EducationalGamesView';
import { InteractiveSimulationsView } from './components/InteractiveSimulationsView';
import { ProgressDashboard } from './components/ProgressDashboard';
import { AITutorModal } from './components/AITutorModal';
import { SettingsModal } from './components/SettingsModal';
import { EnterTaskCodeModal } from './components/EnterTaskCodeModal';
import { StudentSingleTaskView } from './components/StudentSingleTaskView';
import { decodeExamPayload, decodeGamePayload, decodeSimulationPayload, decodeSharePayload, generateFallbackQuestionsBySubject, detectSubjectType, extractClassName, extractGrade } from './utils/sharePayloadUtils';
import { soundEffects } from './utils/soundEffects';
import { GameSessionResult, syncSessionToGoogleSheets, syncGameResultToGoogleSheets, pushFullAppDataToGoogleSheets } from './services/sheetSyncService';
import { Lock, AlertCircle, X, ShieldCheck, User } from 'lucide-react';

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
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Could not parse saved app data, using default:', e);
    }
    return INITIAL_DATA;
  });

  // Role State ('teacher' | 'student')
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('user_role') as UserRole) || appData.settings?.currentRole || 'teacher';
  });

  // Role PIN Verification Modal State
  const [isRolePinModalOpen, setIsRolePinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Current navigation tab: 'subjects' | 'documents' | 'progress' | 'tutor'
  const [currentTab, setCurrentTab] = useState<NavigationTab>('subjects');

  // Sidebar collapse and mobile state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Role switcher request handler
  const handleSwitchRoleRequest = () => {
    if (userRole === 'teacher') {
      // Switch directly to Student mode
      setUserRole('student');
      localStorage.setItem('user_role', 'student');
      setAppData((prev) => ({
        ...prev,
        settings: { ...prev.settings, currentRole: 'student' },
      }));
    } else {
      // Student to Teacher mode requires PIN
      setPinInput('');
      setPinError('');
      setIsRolePinModalOpen(true);
    }
  };

  const handleVerifyTeacherPin = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPin = appData.settings?.teacherPin || localStorage.getItem('teacher_pin') || '1234';
    if (pinInput.trim() === targetPin.trim()) {
      setUserRole('teacher');
      localStorage.setItem('user_role', 'teacher');
      setAppData((prev) => ({
        ...prev,
        settings: { ...prev.settings, currentRole: 'teacher' },
      }));
      setIsRolePinModalOpen(false);
      setPinError('');
    } else {
      setPinError('Mã PIN không chính xác! Vui lòng thử lại (Mặc định: 1234)');
    }
  };

  // Exam flow states
  const [pendingSubject, setPendingSubject] = useState<{ name: string; id: string; questions: Question[] } | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [targetGameIdFromUrl, setTargetGameIdFromUrl] = useState<string | null>(null);
  const [urlParamsProcessed, setUrlParamsProcessed] = useState(false);
  const [currentUrlSearch, setCurrentUrlSearch] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.search : '';
  });
  const lastProcessedSearchRef = useRef<string>('');

  // Active listener & polling for URL search changes (especially in mobile WebViews like Zalo)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUrlChange = () => {
      const search = window.location.search;
      setCurrentUrlSearch(search);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    // Poll every 300ms to instantly react when scanning a new QR code in Zalo in the same session
    const timer = setInterval(() => {
      if (window.location.search !== currentUrlSearch) {
        handleUrlChange();
      }
    }, 300);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
      clearInterval(timer);
    };
  }, [currentUrlSearch]);

  // Track if accessed via direct QR / Share link for single-task student isolation
  const [isDirectSingleTaskMode, setIsDirectSingleTaskMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const path = window.location.pathname;
      return Boolean(
        params.get('exam') ||
        params.get('game') ||
        params.get('gameId') ||
        params.get('play') ||
        params.get('gameData') ||
        params.get('simData') ||
        params.get('simId') ||
        params.get('sim') ||
        path.startsWith('/play') ||
        path.startsWith('/game') ||
        path.startsWith('/sim')
      );
    }
    return false;
  });
  const [activeSimulationFromUrl, setActiveSimulationFromUrl] = useState<AISimulationItem | null>(null);
  const [activeExam, setActiveExam] = useState<{
    subjectName: string;
    subjectId: string;
    questions: Question[];
    studentInfo: StudentInfo;
  } | null>(null);
  const [activeResult, setActiveResult] = useState<SessionRecord | null>(null);

  // Settings & Tutor Context & Enter Code modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEnterCodeModalOpen, setIsEnterCodeModalOpen] = useState(false);
  const [tutorContext, setTutorContext] = useState<string | undefined>(undefined);

  // Handle opening exam or game directly by ID code
  const handleOpenTaskById = (codeInput: string): { success: boolean; message?: string } => {
    const raw = codeInput.trim().toLowerCase();
    if (!raw) return { success: false, message: 'Vui lòng nhập Mã ID!' };

    // 1. Search Subjects (by id, className, or name)
    const matchedSubject = appData.subjects.find(
      (s) =>
        s.id.toLowerCase() === raw ||
        (s.className && s.className.toLowerCase() === raw) ||
        s.name.toLowerCase().includes(raw)
    );

    if (matchedSubject) {
      setUserRole('student');
      localStorage.setItem('user_role', 'student');
      setAppData((prev) => ({
        ...prev,
        settings: { ...prev.settings, currentRole: 'student' },
      }));
      setIsDirectSingleTaskMode(true);
      setCurrentTab('subjects');
      handleSelectSubjectToExam(matchedSubject);
      return { success: true };
    }

    // 2. Search Documents with generated questions
    const matchedDoc = appData.documents?.find(
      (d) => d.id.toLowerCase() === raw || d.title.toLowerCase().includes(raw)
    );
    if (matchedDoc && matchedDoc.generatedQuestions && matchedDoc.generatedQuestions.length > 0) {
      setUserRole('student');
      localStorage.setItem('user_role', 'student');
      setAppData((prev) => ({
        ...prev,
        settings: { ...prev.settings, currentRole: 'student' },
      }));
      setIsDirectSingleTaskMode(true);
      setCurrentTab('subjects');
      handleStartExamFromQuestions(matchedDoc.title, matchedDoc.generatedQuestions);
      return { success: true };
    }

    // 3. Search Games
    const matchedGame = appData.games?.find(
      (g) => g.id.toLowerCase() === raw || g.title.toLowerCase().includes(raw)
    );
    if (matchedGame) {
      setUserRole('student');
      localStorage.setItem('user_role', 'student');
      setAppData((prev) => ({
        ...prev,
        settings: { ...prev.settings, currentRole: 'student' },
      }));
      setIsDirectSingleTaskMode(true);
      setCurrentTab('games');
      setTargetGameIdFromUrl(matchedGame.id);
      return { success: true };
    }

    // 4. Fallback for custom subject ID passed by student
    const fallbackSub: Partial<Subject> = { id: codeInput, name: codeInput };
    const stype = detectSubjectType(fallbackSub);
    const cname = extractClassName(fallbackSub);
    const cleanTitle = `${stype} lớp ${cname} - Đề kiểm tra định kỳ`;
    const fallbackQs = generateFallbackQuestionsBySubject({ ...fallbackSub, name: cleanTitle });

    setUserRole('student');
    localStorage.setItem('user_role', 'student');
    setAppData((prev) => ({
      ...prev,
      settings: { ...prev.settings, currentRole: 'student' },
    }));
    setIsDirectSingleTaskMode(true);
    setCurrentTab('subjects');
    setPendingSubject({
      name: cleanTitle,
      id: codeInput,
      questions: fallbackQs,
    });
    setIsStudentModalOpen(true);
    return { success: true };
  };

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

  // Auto Cloud Data Sync on App Mount (pulls newest subjects, documents, games from Google Sheets)
  useEffect(() => {
    const scriptUrl = appData.settings?.googleAppsScriptUrl || localStorage.getItem('google_apps_script_url');
    if (scriptUrl && scriptUrl.trim().startsWith('http')) {
      const fetchCloudData = async () => {
        try {
          const res = await fetch(`${scriptUrl.trim()}?action=getFullAppData&t=${Date.now()}`);
          if (res.ok) {
            const json = await res.json();
            if (json.status === 'success' && json.appData) {
              setAppData((prev) => {
                const cloudSubjs: Subject[] = json.appData?.subjects || [];
                const cloudQs: Question[] = json.appData?.questions || [];

                // Preserve custom subjects created locally by teacher
                const customLocalSubjs = prev.subjects.filter(
                  (s) => s.source === 'teacher_custom' || s.id.startsWith('sub-custom-') || s.id.startsWith('subj-')
                );
                const mergedSubjects = [
                  ...customLocalSubjs,
                  ...cloudSubjs.filter((cs) => !customLocalSubjs.some((ls) => ls.id === cs.id)),
                ];

                // Preserve custom questions created locally by teacher
                const customLocalQs = prev.questions.filter(
                  (q) => q.subjectId && (q.subjectId.startsWith('sub-custom-') || q.subjectId.startsWith('subj-'))
                );
                const mergedQuestions = [
                  ...customLocalQs,
                  ...cloudQs.filter((cq) => !customLocalQs.some((lq) => lq.id === cq.id)),
                ];

                return {
                  ...prev,
                  subjects: mergedSubjects.length > 0 ? mergedSubjects : prev.subjects,
                  questions: mergedQuestions.length > 0 ? mergedQuestions : prev.questions,
                  documents: json.appData?.documents || prev.documents,
                  games: json.appData?.games || prev.games,
                  onlineClasses: json.appData?.onlineClasses || prev.onlineClasses,
                };
              });
            }
          }
        } catch (err) {
          console.warn('Auto cloud sync failed:', err);
        }
      };
      fetchCloudData();
    }
  }, []);

  const handleSelectSubjectToExam = (subject: Subject) => {
    let subjectQuestions = appData.questions.filter(
      (q) => q.subjectId === subject.id || (q.subjectId && q.subjectId.toLowerCase() === subject.id.toLowerCase())
    );

    if (subjectQuestions.length === 0 && appData.documents && appData.documents.length > 0) {
      const docMatch = appData.documents.find(
        (d) =>
          d.id === subject.id ||
          (d.title && subject.sourceDocTitle && d.title.toLowerCase() === subject.sourceDocTitle.toLowerCase()) ||
          (d.title && subject.name && d.title.toLowerCase() === subject.name.toLowerCase())
      );
      if (docMatch && docMatch.generatedQuestions && docMatch.generatedQuestions.length > 0) {
        subjectQuestions = docMatch.generatedQuestions;
      }
    }

    if (subjectQuestions.length === 0 && (subject as any).generatedQuestions && (subject as any).generatedQuestions.length > 0) {
      subjectQuestions = (subject as any).generatedQuestions;
    }

    if (subjectQuestions.length === 0) {
      subjectQuestions = generateFallbackQuestionsBySubject(subject);
    }

    setPendingSubject({
      name: subject.name,
      id: subject.id,
      questions: subjectQuestions,
    });
    setIsStudentModalOpen(true);
  };

  // Check URL parameters on mount / app load or when URL query parameters change (?exam=id or ?gameId=id or ?play=id or ?role=student)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentSearch = window.location.search;
    const currentPath = window.location.pathname;
    const combinedUrlKey = `${currentPath}${currentSearch}`;

    if (!currentSearch && (currentPath === '/' || currentPath === '')) return;
    if (lastProcessedSearchRef.current === combinedUrlKey && urlParamsProcessed) return;

    try {
      const params = new URLSearchParams(currentSearch);
      const isPlayRoute = currentPath.startsWith('/play') || currentPath.startsWith('/game');

      const directGameId = params.get('gameId') || params.get('game') || params.get('play');
      const gameDataParam = params.get('gameData') || params.get('d') || params.get('payload') || params.get('data');

      let gameParam: string | null = directGameId;
      let codeParam = params.get('code') || params.get('id') || params.get('quiz') || params.get('assignment');

      if (isPlayRoute && !gameParam) {
        gameParam = codeParam;
        if (!gameParam && currentPath && currentPath !== '/') {
          const pathSegments = currentPath.split('/').filter(Boolean);
          if (pathSegments.length > 0) {
            const lastSegment = pathSegments[pathSegments.length - 1];
            if (lastSegment && lastSegment !== 'play' && lastSegment !== 'game' && lastSegment !== 'index.html') {
              gameParam = decodeURIComponent(lastSegment);
            }
          }
        }
      }

      if (codeParam && codeParam.startsWith('game-') && !gameParam) {
        gameParam = codeParam;
        codeParam = null;
      }

      // Support path-based IDs like /quiz/sub-custom-123 or /assignment/sub-custom-123
      if (!codeParam && !isPlayRoute && currentPath && currentPath !== '/') {
        const pathSegments = currentPath.split('/').filter(Boolean);
        if (pathSegments.length > 0) {
          const lastSegment = pathSegments[pathSegments.length - 1];
          if (
            lastSegment &&
            lastSegment !== 'index.html' &&
            lastSegment !== 'quiz' &&
            lastSegment !== 'assignment' &&
            lastSegment !== 'exam'
          ) {
            codeParam = decodeURIComponent(lastSegment);
          }
        }
      }

      const rawExamParam = params.get('exam') || params.get('task');
      const directPayload = params.get('payload') || params.get('examData') || params.get('data') || params.get('d');
      const payloadParam = directPayload || (rawExamParam && rawExamParam.startsWith('lz_') ? rawExamParam : null);
      const examParam = (rawExamParam && !rawExamParam.startsWith('lz_') ? rawExamParam : null) || codeParam || (rawExamParam ? rawExamParam : null);

      const roleParam = params.get('role');
      const simDataParam = params.get('simData') || params.get('sim');
      if (simDataParam) {
        const decodedSim = decodeSimulationPayload(simDataParam);
        if (decodedSim) {
          setActiveSimulationFromUrl(decodedSim);
          setIsDirectSingleTaskMode(true);
          setUserRole('student');
          localStorage.setItem('user_role', 'student');
          setAppData((prev) => ({
            ...prev,
            settings: { ...prev.settings, currentRole: 'student' },
          }));
          setUrlParamsProcessed(true);
          return;
        }
      }

      if (!examParam && !payloadParam && !gameParam && !isPlayRoute && roleParam !== 'student') return;

      lastProcessedSearchRef.current = combinedUrlKey;

      // Automatically establish Student Role when accessing via QR Code or Direct Link
      if (examParam || payloadParam || gameParam || isPlayRoute || roleParam === 'student') {
        setUserRole('student');
        localStorage.setItem('user_role', 'student');
        setAppData((prev) => ({
          ...prev,
          settings: { ...prev.settings, currentRole: 'student' },
        }));
      }

      if (examParam || payloadParam || gameParam || isPlayRoute) {
        setIsDirectSingleTaskMode(true);
        // Force purge previous active exam, results, and session cache to open the newly scanned QR task
        setActiveExam(null);
        setActiveResult(null);
        setPendingSubject(null);
        try {
          sessionStorage.removeItem('eduexam_active_exam');
          sessionStorage.removeItem('eduexam_active_result');
        } catch {}
      }

      // GAME ROUTE (/play or ?gameId=... or ?play=...)
      if (gameParam || isPlayRoute) {
        const targetGamePayload = gameDataParam || payloadParam;
        if (targetGamePayload) {
          const decodedGame = decodeGamePayload(targetGamePayload);
          if (decodedGame) {
            setAppData((prev) => ({
              ...prev,
              games: [decodedGame, ...(prev.games || []).filter((g) => g.id !== decodedGame.id)],
            }));
            try {
              localStorage.setItem('shared_game_' + decodedGame.id, JSON.stringify(decodedGame));
            } catch {}
            if (!gameParam) gameParam = decodedGame.id;
          }
        }

        if (gameParam) {
          const cachedGameStr = localStorage.getItem('shared_game_' + gameParam);
          if (cachedGameStr) {
            try {
              const cachedGame = JSON.parse(cachedGameStr);
              if (cachedGame && cachedGame.id) {
                setAppData((prev) => ({
                  ...prev,
                  games: [cachedGame, ...(prev.games || []).filter((g) => g.id !== cachedGame.id)],
                }));
              }
            } catch {}
          }
          setTargetGameIdFromUrl(gameParam);
        }

        setCurrentTab('games');
        setUrlParamsProcessed(true);
        return;
      }

      // EXAM ROUTE (/quiz or ?id=... or ?exam=... or ?payload=...)
      if (examParam || payloadParam) {
        // 1. Priority 1: Decode embedded full exam payload directly from QR code URL
        if (payloadParam) {
          const decoded = decodeExamPayload(payloadParam);
          if (decoded && decoded.questions && decoded.questions.length > 0) {
            const { subject: decodedSub, questions: decodedQuestions } = decoded;
            setAppData((prev) => {
              const updatedSubjs = [
                decodedSub,
                ...prev.subjects.filter((s) => s.id !== decodedSub.id),
              ];
              const updatedQs = [
                ...prev.questions.filter((q) => q.subjectId !== decodedSub.id),
                ...decodedQuestions,
              ];
              return {
                ...prev,
                subjects: updatedSubjs,
                questions: updatedQs,
              };
            });

            try {
              localStorage.setItem('shared_qs_' + decodedSub.id, JSON.stringify(decodedQuestions));
              localStorage.setItem('shared_subj_' + decodedSub.id, JSON.stringify(decodedSub));
            } catch {}

            setPendingSubject({
              name: decodedSub.name,
              id: decodedSub.id,
              questions: decodedQuestions,
            });
            setIsStudentModalOpen(true);
            setUrlParamsProcessed(true);
            return;
          }
        }

        const effectiveExamId = examParam || 'exam-shared';

        // Check persistent shared questions & subject registry
        const cachedQsStr = localStorage.getItem('shared_qs_' + effectiveExamId);
        const cachedSubjStr = localStorage.getItem('shared_subj_' + effectiveExamId);
        if (cachedQsStr) {
          try {
            const cachedQs = JSON.parse(cachedQsStr);
            let cachedSubj: Subject | null = null;
            if (cachedSubjStr) {
              try { cachedSubj = JSON.parse(cachedSubjStr); } catch {}
            }
            if (Array.isArray(cachedQs) && cachedQs.length > 0) {
              const detectedStype = detectSubjectType({ id: effectiveExamId, name: effectiveExamId });
              const detectedClass = extractClassName({ id: effectiveExamId, name: effectiveExamId });
              const displayTitle = cachedSubj?.name || `${detectedStype} lớp ${detectedClass} - Đề kiểm tra định kỳ`;
              setPendingSubject({
                name: displayTitle,
                id: effectiveExamId,
                questions: cachedQs,
              });
              setIsStudentModalOpen(true);
              setUrlParamsProcessed(true);
              return;
            }
          } catch {
            // Ignore parse errors
          }
        }

        // 2. Priority 2: Direct lookup in local appData subjects
        const targetSub = appData.subjects.find((s) => s.id.toLowerCase() === effectiveExamId.toLowerCase());
        if (targetSub) {
          handleSelectSubjectToExam(targetSub);
          setIsStudentModalOpen(true);
          setUrlParamsProcessed(true);
          return;
        }

        // Check documents
        const targetDoc = appData.documents?.find((d) => d.id.toLowerCase() === effectiveExamId.toLowerCase());
        if (targetDoc && targetDoc.generatedQuestions && targetDoc.generatedQuestions.length > 0) {
          handleStartExamFromQuestions(targetDoc.title, targetDoc.generatedQuestions);
          setIsStudentModalOpen(true);
          setUrlParamsProcessed(true);
          return;
        }

        // Check matching questions in appData.questions
        const matchingQuestions = appData.questions.filter(
          (q) => q.subjectId && q.subjectId.toLowerCase() === effectiveExamId.toLowerCase()
        );
        if (matchingQuestions.length > 0) {
          const detectedStype = detectSubjectType({ id: effectiveExamId, name: effectiveExamId });
          const detectedClass = extractClassName({ id: effectiveExamId, name: effectiveExamId });
          const displayTitle = `${detectedStype} lớp ${detectedClass} - Đề kiểm tra định kỳ`;
          setPendingSubject({
            name: displayTitle,
            id: effectiveExamId,
            questions: matchingQuestions,
          });
          setIsStudentModalOpen(true);
          setUrlParamsProcessed(true);
          return;
        }

        // 3. Fallback: Generate realistic subject-aware SGK questions so student always gets a complete 5-question exam matching subject & class
        const fallbackSub: Partial<Subject> = {
          id: effectiveExamId,
          name: effectiveExamId.includes('-') ? `Bài kiểm tra (${effectiveExamId})` : effectiveExamId,
        };
        const detectedStype = detectSubjectType(fallbackSub);
        const detectedClass = extractClassName(fallbackSub);
        const cleanTitle = `${detectedStype} lớp ${detectedClass} - Đề kiểm tra định kỳ`;
        const fallbackQs = generateFallbackQuestionsBySubject({
          ...fallbackSub,
          name: cleanTitle,
        });

        setPendingSubject({
          name: cleanTitle,
          id: effectiveExamId,
          questions: fallbackQs,
        });
        setIsStudentModalOpen(true);
        setUrlParamsProcessed(true);
      }
    } catch (e) {
      console.warn('Error parsing URL query parameters for QR code direct link:', e);
    }
  }, [currentUrlSearch, appData.subjects, appData.documents, appData.games, appData.questions]);

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

    // Auto sync exam result to Google Sheets if Web App URL is configured
    const scriptUrl =
      appData.settings?.googleAppsScriptUrl || localStorage.getItem('google_apps_script_url');
    if (scriptUrl && scriptUrl.trim().startsWith('http')) {
      syncSessionToGoogleSheets(session, scriptUrl.trim()).then((res) => {
        if (res.success) {
          setAppData((prev) => ({
            ...prev,
            sessions: prev.sessions.map((s) =>
              s.id === session.id
                ? {
                    ...s,
                    syncedToGoogleSheets: true,
                    syncTimestamp: new Date().toLocaleTimeString('vi-VN'),
                  }
                : s
            ),
          }));
        }
      });
    }
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

    // Auto sync game result asynchronously to Google Sheets if Web App URL is configured
    const scriptUrl =
      appData.settings?.googleAppsScriptUrl || localStorage.getItem('google_apps_script_url');
    if (scriptUrl && scriptUrl.trim().startsWith('http')) {
      syncGameResultToGoogleSheets(gameResult, scriptUrl.trim()).then((res) => {
        if (res.success) {
          setAppData((prev) => ({
            ...prev,
            sessions: prev.sessions.map((s) =>
              s.id === newSession.id
                ? {
                    ...s,
                    syncedToGoogleSheets: true,
                    syncTimestamp: new Date().toLocaleTimeString('vi-VN'),
                  }
                : s
            ),
          }));
        }
      });
    }
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

    setAppData((prev) => {
      const newSubjs = [
        { ...newSubject, questionsCount: finalQuestions.length, generatedQuestions: finalQuestions },
        ...prev.subjects.filter((s) => s.id !== newSubject.id),
      ];
      const newQs = [
        ...prev.questions.filter((q) => q.subjectId !== newSubject.id),
        ...finalQuestions,
      ];
      const nextData = {
        ...prev,
        subjects: newSubjs,
        questions: newQs,
      };

      try {
        localStorage.setItem('eduexam_app_data', JSON.stringify(nextData));
        localStorage.setItem('shared_qs_' + newSubject.id, JSON.stringify(finalQuestions));
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }

      const scriptUrl = prev.settings?.googleAppsScriptUrl || localStorage.getItem('google_apps_script_url');
      if (scriptUrl && scriptUrl.trim().startsWith('http')) {
        pushFullAppDataToGoogleSheets(nextData, scriptUrl.trim()).catch((e) => console.warn('Auto cloud sync failed:', e));
      }

      return nextData;
    });
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
      {/* 1. BÊN TRÁI: Thanh điều hướng (Hiển thị nếu không ở chế độ Độc Lập qua QR) */}
      {!isDirectSingleTaskMode && (
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
          userRole={userRole}
          onSwitchRole={handleSwitchRoleRequest}
        />
      )}

      {/* 2. BÊN PHẢI: Khu vực tính năng (Right Feature Area) */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Header of Right Content Area */}
        {!isDirectSingleTaskMode ? (
          <FeatureHeader
            currentTab={currentTab}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenEnterCodeModal={() => setIsEnterCodeModalOpen(true)}
            theme={appData.settings?.theme || 'light'}
            onToggleTheme={handleToggleTheme}
            examInProgress={Boolean(activeExam)}
            activeExamTitle={activeExam?.subjectName}
            userRole={userRole}
            onSwitchRole={handleSwitchRoleRequest}
          />
        ) : (
          <header className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xs sticky top-0 z-30">
            <div className="flex items-center space-x-3">
              <div className={`w-9 h-9 rounded-xl ${currentTab === 'games' ? 'bg-gradient-to-tr from-amber-500 via-teal-600 to-indigo-600' : 'bg-gradient-to-tr from-teal-600 to-emerald-600'} text-white flex items-center justify-center font-extrabold shadow-sm`}>
                {currentTab === 'games' ? '🎮' : '🎓'}
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-white leading-tight">
                  {currentTab === 'games' ? 'GIAO DIỆN TRÒ CHƠI HỌC TẬP HỌC SINH ĐỘC LẬP' : 'GIAO DIỆN KHẢO THÍ HỌC SINH ĐỘC LẬP'}
                </h1>
                <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                  {currentTab === 'games' ? 'Học qua trò chơi theo Mã QR & Link (Cách ly tuyệt đối)' : 'Làm bài theo Mã QR & Link phân công (Cách ly tuyệt đối)'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsEnterCodeModalOpen(true)}
                className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500 text-white shadow-xs hover:bg-amber-600 transition-colors flex items-center space-x-1"
                title="Nhập mã bài tập khác"
              >
                <span>🔑 Đổi Mã ID</span>
              </button>

              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                🎓 Quyền Học Sinh
              </span>
              <button
                type="button"
                onClick={handleSwitchRoleRequest}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title="Dành cho Giáo viên: Nhập mã PIN để mở toàn bộ giao diện quản trị"
              >
                🔑 Quản Trị (PIN)
              </button>
            </div>
          </header>
        )}

        {/* Feature Body */}
        <main className={`flex-1 p-3 sm:p-6 lg:p-8 ${isDirectSingleTaskMode ? 'max-w-4xl mx-auto w-full' : ''}`}>
          {/* If user is actively taking an exam */}
          {activeExam ? (
            <ExamView
              subjectName={activeExam.subjectName}
              subjectId={activeExam.subjectId}
              questions={activeExam.questions}
              studentInfo={activeExam.studentInfo}
              onFinishExam={handleFinishExam}
              onCancelExam={() => {
                if (window.confirm('Bạn có chắc muốn tạm dừng bài thi này không?')) {
                  setActiveExam(null);
                }
              }}
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
              {currentTab === 'subjects' && !isDirectSingleTaskMode && (
                <SubjectCardsView
                  subjects={appData.subjects}
                  questions={appData.questions}
                  progress={appData.progress}
                  documents={appData.documents || []}
                  onSelectSubjectToExam={handleSelectSubjectToExam}
                  onDeleteSubject={handleDeleteSubject}
                  onUpdateSubject={handleUpdateSubject}
                  onClearAllSubjects={handleClearAllSubjects}
                  onRestoreDefaultSubjects={handleRestoreDefaultSubjects}
                  onAddSubject={handleAddSubject}
                  onSyncFromDocuments={handleSyncFromDocuments}
                  onOpenEnterCodeModal={() => setIsEnterCodeModalOpen(true)}
                  userRole={userRole}
                />
              )}



              {currentTab === 'documents' && !isDirectSingleTaskMode && (
                <DocumentLearningView
                  documents={appData.documents || []}
                  onSaveDocument={handleSaveDocument}
                  onDeleteDocument={handleDeleteDocument}
                  onStartExamFromQuestions={handleStartExamFromQuestions}
                  onSyncToSubjects={handleSyncDocumentToSubject}
                  userRole={userRole}
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
                  googleScriptUrl={appData.settings.googleAppsScriptUrl}
                  userRole={userRole}
                  isDirectSingleTaskMode={isDirectSingleTaskMode}
                />
              )}

              {currentTab === 'simulations' && !isDirectSingleTaskMode && (
                <InteractiveSimulationsView />
              )}

              {currentTab === 'progress' && !isDirectSingleTaskMode && (
                <ProgressDashboard
                  progress={appData.progress}
                  sessions={appData.sessions}
                  onViewSessionDetails={(ses) => setActiveResult(ses)}
                  onUpdateSession={handleUpdateSession}
                  onDeleteSession={handleDeleteSession}
                  onClearAllSessions={handleClearAllSessions}
                  userRole={userRole}
                />
              )}

              {currentTab === 'tutor' && !isDirectSingleTaskMode && (
                <AITutorModal initialContext={tutorContext} />
              )}

              {isDirectSingleTaskMode && activeSimulationFromUrl && (
                <div className="max-w-4xl mx-auto p-4 space-y-4 animate-fadeIn">
                  <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-white flex items-center justify-between shadow-xl">
                    <div className="space-y-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-500 text-teal-950 font-black text-[10px] uppercase tracking-wider">
                        Thí nghiệm ảo ({activeSimulationFromUrl.subject})
                      </span>
                      <h2 className="text-base font-extrabold text-white">{activeSimulationFromUrl.title}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDirectSingleTaskMode(false);
                        setActiveSimulationFromUrl(null);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                    >
                      Thoát chế độ xem
                    </button>
                  </div>
                  <div className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
                    <iframe
                      title={activeSimulationFromUrl.title}
                      srcDoc={activeSimulationFromUrl.code}
                      sandbox="allow-scripts allow-same-origin allow-modals"
                      className="w-full h-[620px] border-0 bg-slate-950"
                    />
                  </div>
                </div>
              )}

              {isDirectSingleTaskMode && !targetGameIdFromUrl && !activeSimulationFromUrl && (
                <StudentSingleTaskView
                  pendingSubject={pendingSubject}
                  examIdFromUrl={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('exam') || new URLSearchParams(window.location.search).get('id') : null}
                  onStartExam={() => setIsStudentModalOpen(true)}
                  onOpenEnterCodeModal={() => setIsEnterCodeModalOpen(true)}
                  availableSubjects={appData.subjects}
                  onSelectSubjectToExam={handleSelectSubjectToExam}
                />
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

      {/* Role PIN Verification Modal */}
      {isRolePinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold">
                  <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-white">Xác Nhận PIN Giáo Viên</h3>
                  <p className="text-xs text-slate-400">Mở toàn bộ giao diện quản trị hệ thống</p>
                </div>
              </div>
              <button
                onClick={() => setIsRolePinModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                handleVerifyTeacherPin(e);
                setIsDirectSingleTaskMode(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nhập mã PIN Giáo Viên (Mặc định: 1234)
                </label>
                <input
                  type="password"
                  maxLength={10}
                  autoFocus
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Nhập mã PIN..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-center text-lg font-mono font-bold tracking-widest focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {pinError && <p className="text-xs text-rose-500 font-bold text-center">{pinError}</p>}

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all active:scale-95"
              >
                Xác Nhận Mở Quản Trị
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nhập Mã ID Bài Tập / Đề Thi Dành Cho Học Sinh */}
      <EnterTaskCodeModal
        isOpen={isEnterCodeModalOpen}
        onClose={() => setIsEnterCodeModalOpen(false)}
        onSubmitCode={handleOpenTaskById}
        availableSubjects={appData.subjects}
        availableGames={appData.games}
      />

    </div>
  );
}
