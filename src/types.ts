export interface Subject {
  id: string;
  name: string;
  icon: string; // FontAwesome or Lucide class/name
  color: string;
  description: string;
  questionsCount: number;
  className?: string; // e.g. "10T2", "11A2", "12D1", "10A1", "11B1", "12C3"
  grade?: string; // "10", "11", "12", "other"
  subjectType?: string; // "Toán học", "Vật lý", "Hóa học", "Tiếng Anh", "Lịch sử", "Sinh học"
  source?: 'sgk' | 'document_ai' | 'teacher_custom';
  sourceDocId?: string;
  sourceDocTitle?: string;
  questionFormat?: 'multiple_choice' | 'true_false' | 'essay' | 'short_answer' | 'mixed';
  createdAt?: string;
}

export interface Question {
  id: string;
  subjectId: string;
  content: string;
  type: 'multiple_choice' | 'true_false' | 'essay' | 'short_answer';
  options: string[];
  correctAnswer: number; // 0-indexed for multiple_choice & true_false
  explanation: string; // Chuẩn sách giáo khoa
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string;
  sampleAnswer?: string; // Đáp án mẫu cho tự luận / trả lời ngắn
  rubric?: string; // Hướng dẫn chấm điểm
  points?: number; // Điểm của câu hỏi này trong thang điểm 10
  expectedShortAnswer?: string; // Đáp số / từ khóa chuẩn cho câu trả lời ngắn
}

export interface StudentInfo {
  fullName: string;
  className: string;
  groupName: string;
}

export interface QuestionResult {
  questionId: string;
  questionContent: string;
  questionType?: 'multiple_choice' | 'true_false' | 'essay' | 'short_answer';
  userAnswer: number | string | null;
  correctAnswer: number;
  sampleAnswer?: string;
  expectedShortAnswer?: string;
  isCorrect: boolean;
  pointsAwarded?: number;
  maxPoints?: number;
  explanation: string;
}

export interface SessionRecord {
  id: string;
  subjectId: string;
  subjectName: string;
  studentInfo: StudentInfo;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // in seconds
  date: string; // ISO date or formatted
  syncedToGoogleSheets?: boolean;
  syncTimestamp?: string;
  details?: QuestionResult[];
  category?: 'exam' | 'game';
  gameType?: 'quiz' | 'drag_drop' | 'matching';
  gameTitle?: string;
}

export interface ProgressData {
  totalAttempts: number;
  averageScore: number;
  streakDays: number;
  weakTopics: { topic: string; wrongCount: number; subjectId: string }[];
}

export interface OnlineClass {
  id: string;
  className: string; // Tên lớp (VD: "10A1", "11B2", "12C1")
  grade?: string; // "10", "11", "12", "Khác"
  subject: string; // Môn học (VD: "Toán học", "Vật lý", "Tiếng Anh")
  teacher: string; // Giáo viên phụ trách
  schedule: string; // Lịch học (VD: "Thứ 2, 4, 6 - 08:00 - 09:30")
  meetingLink: string; // Link Google Meet / Zoom / Teams
  platform?: 'google_meet' | 'zoom' | 'teams' | 'other';
  roomCode?: string; // Mã phòng / ID meeting
  password?: string; // Mật khẩu
  status: 'live' | 'upcoming' | 'ended'; // Trạng thái lớp học
  notes?: string; // Ghi chú / Dặn dò
  updatedAt?: string;
}

export type UserRole = 'teacher' | 'student';

export interface AppSettings {
  theme: 'light' | 'dark';
  soundEnabled: boolean;
  autoSave: boolean;
  geminiApiKey: string;
  selectedModel: string;
  googleAppsScriptUrl: string;
  onlineClassSheetUrl?: string; // URL Google Sheet / Web App danh sách lớp học trực tuyến
  currentRole?: UserRole; // 'teacher' (Giáo viên) hoặc 'student' (Học sinh)
  teacherPin?: string; // Mã PIN để chuyển sang quyền Giáo viên (mặc định "1234")
}

export type GameType = 'quiz' | 'drag_drop' | 'matching';

export interface QuizGameQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  sourceCitation?: string;
  points?: number;
}

export interface DragDropItem {
  id: string;
  text: string;
  categoryId: string;
}

export interface DragDropCategory {
  id: string;
  title: string;
  description?: string;
  color?: string; // e.g. 'emerald', 'teal', 'indigo', 'amber'
}

export interface MatchingPair {
  id: string;
  term: string; // Vế A: Thuật ngữ, khái niệm, công thức
  definition: string; // Vế B: Định nghĩa, ý nghĩa, đơn vị, ví dụ
  sourceCitation?: string;
}

export interface EducationalGame {
  id: string;
  title: string;
  description: string;
  subject: string;
  type: GameType;
  createdAt: string;
  sourceDocId?: string;
  sourceDocTitle?: string;
  sourceCitations?: string[];
  
  // Game content
  quizData?: {
    timePerQuestion: number; // in seconds, e.g. 15
    questions: QuizGameQuestion[];
  };
  dragDropData?: {
    instruction: string;
    categories: DragDropCategory[];
    items: DragDropItem[];
  };
  matchingData?: {
    instruction: string;
    pairs: MatchingPair[];
  };

  highScore?: number;
  playCount?: number;
}

export interface DocumentLearning {
  id: string;
  title: string;
  fileType: 'pdf' | 'docx' | 'image' | 'txt' | 'multi_source';
  content: string;
  summary?: string;
  keyPoints?: string[];
  generatedQuestions?: Question[];
  createdAt: string;
  sources?: UploadedSourceItem[];
}

export interface UploadedSourceItem {
  id: string;
  name: string;
  type: 'image' | 'text' | 'document';
  sizeFormatted: string;
  mimeType?: string;
  dataUrl?: string; // data:image/... for preview
  base64Data?: string; // base64 string for multimodal AI
  textContent?: string; // text content extracted
  pageIndex?: number; // e.g. 1, 2, 3
}

export interface AppData {
  subjects: Subject[];
  questions: Question[];
  sessions: SessionRecord[];
  progress: ProgressData;
  settings: AppSettings;
  documents?: DocumentLearning[];
  games?: EducationalGame[];
  onlineClasses?: OnlineClass[];
}
