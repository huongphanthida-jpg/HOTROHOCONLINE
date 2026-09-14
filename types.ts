export type UserRole = 'gvcn' | 'bgh' | 'gvbm' | 'csl' | 'student' | 'parent';

export type NavigationTab =
  | 'overview'
  | 'students'
  | 'subject-teachers'
  | 'seating'
  | 'schedule'
  | 'connect'
  | 'academic'
  | 'discipline'
  | 'materials'
  | 'tasks'
  | 'random-picker'
  | 'group-emulation'
  | 'leaves'
  | 'homeroom-book'
  | 'settings';

export interface SubjectTeacher {
  id: string;
  subjectName: string;
  teacherName: string;
  phone: string;
  email: string;
  periodsPerWeek: number;
  notes?: string;
  avatar?: string;
  zaloUrl?: string;
  officeHours?: string;
  roleBadge?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatar?: string;
  receiverId?: string; // specific studentId or 'all' or 'group-1'
  receiverName?: string;
  channelId: 'class_general' | 'parents_forum' | 'group_1' | 'group_2' | 'group_3' | 'group_4' | string;
  content: string;
  attachments?: { name: string; type: string; url: string }[];
  timestamp: string;
  isRead?: boolean;
}

export interface ParentMeeting {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  meetingDate: string;
  meetingTime: string;
  meetingType: 'direct' | 'online';
  locationOrLink: string;
  topic: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  teacherNotes?: string;
}

export interface StudyPair {
  id: string;
  deskKey: string; // e.g. "1-1" (Dãy 1, Bàn 1)
  deskLabel: string;
  student1: { id: string; name: string; strongSubject: string; gpa: number };
  student2: { id: string; name: string; strongSubject: string; gpa: number };
  targetGoal: string;
  status: 'active' | 'improving' | 'achieved';
  progressNote: string;
}

export interface ClassInfo {
  className: string; // e.g. "LỚP 12A1 (KHTN)"
  schoolName: string; // e.g. "THPT TRẦN NGUYÊN HÃN"
  academicYear: string; // e.g. "Niên khóa 2023 - 2026"
  avatar: string; // Image URL or Base64
  roomName?: string; // e.g. "Phòng 302 - Dãy A"
  slogan?: string; // e.g. "Kỷ luật - Trí tuệ - Bứt phá kỳ thi Tốt nghiệp THPT"
  specialization?: string; // e.g. "Chuyên ban Khoa học Tự nhiên"
  streamBadge?: string; // e.g. "Chuyên ban KHTN", "Chuyên ban KHXH", "Ban Tự Nhiên"...
}

export interface TeacherInfo {
  name: string; // e.g. "Thầy Nguyễn Văn An"
  title: string; // e.g. "Thạc sĩ Toán học - GVCN 12A1"
  avatar: string; // Image URL or Base64
  phone: string; // e.g. "0912.345.678"
  email: string; // e.g. "nguyenvanan.gv@tnh.edu.vn"
  subject: string; // e.g. "Toán Học"
  bio?: string; // e.g. "14 năm kinh nghiệm luyện thi ĐH, Tổ phó chuyên môn Toán."
  officeHours?: string; // e.g. "Thứ 2 - Thứ 6 (16:30 - 17:30)"
  positionType?: string; // e.g. "Chính Nhiệm", "Kiêm Nhiệm", "Phụ Trách", "Tập sự"...
}

export interface BghInfo {
  name: string; // e.g. "TS. Lê Thị Mai"
  title: string; // e.g. "Phó Hiệu Trưởng - Phụ trách Khối 12 & Chuyên môn"
  avatar: string; // Image URL or Base64
  phone: string; // e.g. "0903.888.999"
  email: string; // e.g. "lethimai.bgh@tnh.edu.vn"
  office?: string; // e.g. "Phòng BGH - Tầng 2 Nhà Hiệu Bộ"
  department?: string; // e.g. "Ban Giám Hiệu - Hội đồng Sư phạm"
  bio?: string; // e.g. "Tiến sĩ Quản lý Giáo dục..."
  dutyRole?: string; // e.g. "Phó Hiệu Trưởng", "Hiệu Trưởng", "Chủ Tịch HĐ Trường"...
}

export interface Student {
  id: string;
  code: string; // e.g. "TNH-12A1-01"
  name: string;
  gender: 'Nam' | 'Nữ';
  dob: string;
  group: 1 | 2 | 3 | 4; // Tổ 1, 2, 3, 4
  avatar: string;
  phone: string;
  email: string;
  address: string;
  // Hồ sơ chi tiết
  strengths: string; // Sở trường, năng khiếu
  careerAspiration: string; // Định hướng nghề nghiệp/ngành học
  healthNote: string; // Lưu ý sức khỏe
  emergencyContact: {
    parentName: string;
    relationship: 'Bố' | 'Mẹ' | 'Người giám hộ';
    phone: string;
    workplace: string;
  };
  // Điểm số TB các môn học
  grades: {
    math: { tx1: number; tx2: number; gk: number; ck: number; avg: number };
    physics: { tx1: number; tx2: number; gk: number; ck: number; avg: number };
    chemistry: { tx1: number; tx2: number; gk: number; ck: number; avg: number };
    biology: { tx1: number; tx2: number; gk: number; ck: number; avg: number };
    english: { tx1: number; tx2: number; gk: number; ck: number; avg: number };
    literature: { tx1: number; tx2: number; gk: number; ck: number; avg: number };
    history?: { tx1: number; tx2: number; gk: number; ck: number; avg: number };
    geography?: { tx1: number; tx2: number; gk: number; ck: number; avg: number };
    gdcd?: { tx1: number; tx2: number; gk: number; ck: number; avg: number };
    gdqpan?: { tx1: number; tx2: number; gk: number; ck: number; avg: number };
    informatics?: { tx1: number; tx2: number; gk: number; ck: number; avg: number };
    gpa: number;
  };
  // Lịch sử điểm các kỳ để vẽ biểu đồ tiến bộ & thống kê theo đợt
  progressHistory: {
    period: string; // "Tháng 9", "Giữa HK1", "Cuối HK1", "Giữa HK2", "Thi Thử TN" hoặc đợt tự tạo
    math: number;
    physics: number;
    chemistry: number;
    biology?: number;
    literature?: number;
    english?: number;
    history?: number;
    geography?: number;
    gdcd?: number;
    gdqpan?: number;
    informatics?: number;
    gpa?: number;
  }[];
  // Nề nếp
  conductScore: number; // Điểm rèn luyện thi đua (bắt đầu 100)
  conductRating: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | 'Yếu' | 'Trung bình';
  violationsCount?: number;
  commendationsCount?: number;
  absenceCount?: number;
  violations?: string[];
  commendations?: string[];
}

export interface DisciplineEntry {
  id: string;
  studentId: string;
  studentName: string;
  group: number;
  type: 'bonus' | 'penalty'; // cộng điểm hoặc trừ điểm
  category: 'Chuyên cần' | 'Học tập' | 'Đồng phục' | 'Vệ sinh' | 'Hoạt động Đoàn' | 'Sổ đầu bài';
  points: number; // e.g. +5, -3
  reason: string;
  recordedBy: string; // GVCN / Cờ đỏ / Bí thư
  timestamp: string;
  week: number;
}

export interface ClassJournalEntry {
  id: string;
  dayOfWeek: string;
  date: string;
  period: number; // Tiết 1-5
  subject: string;
  teacherName: string;
  lessonName: string;
  attendance: string; // "Đủ" hoặc "Vắng 1 (Nam P)"
  assessment: 'A' | 'B' | 'C' | 'D'; // Xếp loại tiết học
  notes: string;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  group: number;
  startDate: string;
  endDate: string;
  reason: string;
  proofUrl?: string;
  submittedBy: 'Học sinh' | 'Phụ huynh';
  status: 'pending' | 'approved' | 'rejected';
  teacherNote?: string;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  assignedGroup: 1 | 2 | 3 | 4 | 'all';
  assignedToName?: string;
  dueDate: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  proofRequired: boolean;
  proofSubmitted?: string;
}

export interface DutyMemberAssignment {
  studentId: string;
  studentName: string;
  specificTask: string; // e.g. 'Quét dọn lớp & hành lang', 'Lau bảng & giặt giẻ', 'Kê bàn ghế & đổ rác', 'Tắt quạt, điện & khóa cửa'
  note?: string;
  isCompleted?: boolean;
}

export type DutyDayOfWeek = 'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7';
export type DutySession = 'Sáng' | 'Chiều';

export type DutyScheduleSlot = 
  | 'Sáng Thứ 2'
  | 'Chiều Thứ 2'
  | 'Sáng Thứ 3'
  | 'Chiều Thứ 3'
  | 'Sáng Thứ 4'
  | 'Chiều Thứ 4'
  | 'Sáng Thứ 5'
  | 'Chiều Thứ 5'
  | 'Sáng Thứ 6'
  | 'Chiều Thứ 6'
  | 'Sáng Thứ 7'
  | 'Chiều Thứ 7';

export interface DutySchedule {
  id: string;
  dayOfWeek: DutyDayOfWeek;
  session?: DutySession; // 'Sáng' | 'Chiều'
  slotName?: DutyScheduleSlot | string; // e.g. 'Sáng Thứ 2', 'Chiều Thứ 2', ...
  assignedGroup: 1 | 2 | 3 | 4;
  leaderName: string;
  tasks: string[]; // ['Quét dọn lớp', 'Lau bảng & giặt giẻ', 'Kê lại bàn ghế', 'Tắt quạt, điện và khóa cửa']
  status: 'Đã hoàn thành' | 'Chưa hoàn thành' | 'Đang thực hiện' | 'Chưa bắt đầu';
  inspectedBy?: string;
  assignedStudents?: DutyMemberAssignment[]; // Phân công cụ thể cho từng học sinh
  notes?: string;
  week?: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'Khẩn' | 'Học tập' | 'Hoạt động' | 'Họp PH';
  author: string;
  date: string;
  target: 'all' | 'students' | 'parents';
  isPinned?: boolean;
}

export interface MessageLog {
  id: string;
  senderName: string;
  senderRole: UserRole;
  recipientName: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export type MaterialFileType = 'pdf' | 'word' | 'excel' | 'sheet' | 'image' | 'presentation' | 'other';

export interface StudyMaterial {
  id: string;
  title: string;
  subject: string;
  fileType: MaterialFileType;
  fileName: string;
  fileSize: string; // e.g. "3.2 MB"
  fileData?: string; // Data URL or text content for download simulation
  uploadedBy: string;
  uploadedAt: string;
  description: string;
  targetGroup?: 1 | 2 | 3 | 4 | 'all';
  downloadCount?: number;
}

export interface AssignmentSubmission {
  id: string;
  assignmentTitle: string;
  assignmentType: 'homework' | 'test15' | 'test45' | 'mock_exam';
  subject: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  group: number;
  fileName: string;
  fileType: 'pdf' | 'word' | 'image' | 'other';
  fileSize: string;
  fileData?: string;
  notes?: string;
  submittedAt: string;
  status: 'submitted' | 'graded';
  score?: number;
  teacherFeedback?: string;
  gradedAt?: string;
}

// Sơ Đồ Lớp (4 Dãy - 6 Bàn - 1 Bàn 2 Học Sinh)
export interface SeatAssignment {
  column: number; // 1 | 2 | 3 | 4 (Dãy 1 đến Dãy 4)
  desk: number;   // 1 | 2 | 3 | 4 | 5 | 6 (Bàn 1 đến Bàn 6)
  seat: 1 | 2;    // 1: Trái, 2: Phải
  studentId: string | null;
  customNote?: string;
}

export type SeatingDisplayMode = 'avatar_name' | 'grades_gpa' | 'role_talent' | 'health_vision' | 'connect_pair';

export interface SeatingChartData {
  title: string;
  description: string;
  updatedAt: string;
  aisleGroups?: { [col: number]: number }; // Dynamic mapping Dãy 1, 2, 3, 4 -> Tổ 1, 2, 3, 4
  // Key format: `${column}-${desk}-${seat}` (e.g. "1-1-1", "1-1-2", "4-6-2")
  assignments: { [seatKey: string]: string | null };
}

// Thời Khoá Biểu (2 Buổi / Ngày - Mỗi Buổi 5 Tiết)
export interface TimetablePeriod {
  period: number; // 1 to 5
  time: string;   // "07:00 - 07:45"
  subject: string; // "Toán", "Vật Lý", ...
  teacher: string; // "Thầy An (GVCN)"
  room: string;    // "P.302", "Lab Lý"
  note?: string;   // Chuẩn bị bài tập, dụng cụ
  color?: string;
}

export interface DaySchedule {
  dayKey: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
  dayName: string; // "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"
  morning: TimetablePeriod[];   // 5 tiết buổi sáng
  afternoon: TimetablePeriod[]; // 5 tiết buổi chiều
}

export interface TimetableData {
  academicYear: string;
  appliedDate: string;
  morningTime?: string;
  morningLabel?: string;
  afternoonTime?: string;
  afternoonLabel?: string;
  days: DaySchedule[];
}

// ==========================================
// HỆ THỐNG TẠO ĐỀ THI & TRẮC NGHIỆM ONLINE
// ==========================================
export interface OnlineExamQuestion {
  id: string;
  questionText: string;
  options: {
    key: 'A' | 'B' | 'C' | 'D';
    text: string;
  }[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  points: number; // Điểm số từng câu (e.g. 0.5, 1.0)
}

export interface OnlineExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  group: number;
  startedAt: string;
  submittedAt: string;
  timeSpentSeconds: number;
  answers: { [questionId: string]: 'A' | 'B' | 'C' | 'D' };
  score: number; // Điểm thang 10
  correctCount: number;
  totalQuestions: number;
  status: 'completed' | 'in_progress';
  teacherFeedback?: string;
}

export interface OnlineExam {
  id: string;
  title: string;
  subject: 'Toán' | 'Vật Lý' | 'Hóa Học' | 'Sinh Học' | 'Ngữ Văn' | 'Tiếng Anh';
  durationMinutes: number; // 15, 30, 45, 60, 90 phút
  totalScore: number; // Mặc định thang điểm 10
  description: string;
  targetGroup: 'all' | 1 | 2 | 3 | 4;
  status: 'published' | 'draft' | 'closed';
  createdBy: string;
  createdAt: string;
  deadline?: string;
  questions: OnlineExamQuestion[];
  allowReviewAnswers: boolean;
  shuffleQuestions?: boolean;
}

export interface RandomPickRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  group: number;
  mode: 'wheel' | 'mystery_box' | 'flash' | 'pair' | 'team';
  subject?: string;
  topic?: string;
  oralGrade?: number; // 0 - 10
  emulationPointsAwarded?: number; // +/- points
  feedback?: string;
  timestamp: string;
}

export interface GroupEmulationLog {
  id: string;
  group: 1 | 2 | 3 | 4;
  week: number;
  month: string; // e.g. "Tháng 9"
  category: 'academic' | 'discipline' | 'attendance' | 'duty' | 'special_bonus' | 'special_penalty';
  title: string;
  points: number; // e.g. +10, -5
  description?: string;
  date: string;
  recordedBy: string;
}

// ==========================================
// HỆ THỐNG SỔ CHỦ NHIỆM TOÀN DIỆN (HOMEROOM MASTER BOOK)
// ==========================================

export interface HomeroomBookPlan {
  totalStudentsStart: number;
  totalStudentsEnd?: number;
  maleCount: number;
  femaleCount: number;
  unionMembersCount: number; // Số lượng đoàn viên
  ethnicMinorityCount: number; // Dân tộc thiểu số
  policyBeneficiaryCount: number; // Con TB-LS, chính sách
  poorHouseholdCount: number; // Hộ nghèo/cận nghèo
  specialHealthCount: number; // Sức khỏe đặc biệt
  
  // Đặc điểm tình hình lớp
  advantages: string[]; // Thuận lợi
  difficulties: string[]; // Khó khăn
  
  // Chỉ tiêu năm học
  academicTargets: {
    excellent: number; // % Giỏi / Xuất sắc
    good: number; // % Khá
    average: number; // % Đạt / Trung bình
    weak: number; // % Chưa đạt
  };
  conductTargets: {
    good: number; // % Tốt
    fair: number; // % Khá
    average: number; // % Đạt
    weak: number; // % Chưa đạt
  };
  graduationTargetPercent: number; // 100%
  universityAdmissionTargetPercent: number; // 90%
  hsgAwardsTarget: string; // "5 - 8 giải cấp trường, 2 - 3 giải cấp Thành phố"
  classEmulationTitleTarget: string; // "Tập thể Lớp Tiên tiến Xuất sắc - Chi đoàn Vững mạnh xuất sắc"
  
  // Các biện pháp thực hiện trọng tâm
  keyMeasures: {
    morality: string; // Giáo dục đạo đức tư tưởng, lối sống
    studyQuality: string; // Nâng cao chất lượng học tập, ôn thi tốt nghiệp & ĐH
    cooperation: string; // Phối hợp Nhà trường - Gia đình - Xã hội
    selfManagement: string; // Công tác tự quản, phong trào thi đua và kỹ năng sống
  };
  monthlyThemes: {
    month: string; // "Tháng 9", "Tháng 10", ...
    theme: string;
    focusTasks: string;
  }[];
}

export interface ClassCommitteeRole {
  roleName: string; // e.g. "Lớp trưởng", "Lớp phó Học tập", "Bí thư Chi đoàn", "Tổ trưởng Tổ 1"...
  studentId: string;
  studentName: string;
  phone: string;
  mainDuty: string;
}

export interface ParentsBoardMember {
  id: string;
  role: 'Trưởng ban' | 'Phó ban' | 'Ủy viên';
  fullName: string;
  studentId: string;
  studentName: string;
  phone: string;
  workplace: string;
  notes?: string;
}

export interface SubjectTeacher {
  id: string;
  subjectName: string;
  teacherName: string;
  phone: string;
  email: string;
  periodsPerWeek: number;
  notes?: string;
}

export interface SpecialStudentCare {
  id: string;
  studentId: string;
  studentName: string;
  category: 'Học tập yếu' | 'Hoàn cảnh khó khăn' | 'Sức khỏe đặc biệt' | 'Cá biệt/Nề nếp' | 'Năng khiếu đặc biệt';
  reasons: string;
  supportPlan: string;
  followUpNotes: {
    date: string;
    progress: string;
    evaluatedBy: string;
  }[];
}

export interface BghInspectionRecord {
  id: string;
  inspectionDate: string;
  period: 'Đầu năm học' | 'Tháng 10' | 'Cuối Học kỳ 1' | 'Tháng 3' | 'Cuối Năm học' | 'Đột xuất';
  inspectorName: string; // e.g. "TS. Lê Thị Mai (Phó Hiệu Trưởng)"
  inspectorRole: string;
  evaluationContent: string;
  strengths: string;
  recommendations: string;
  rating: 'Xuất sắc' | 'Tốt' | 'Khá' | 'Đạt';
  signed: boolean;
  signatureDate: string;
}

export interface ClassMeetingMinute {
  id: string;
  title: string;
  meetingType: 'Sinh hoạt lớp cuối tuần' | 'Họp Phụ huynh đầu năm' | 'Họp Phụ huynh cuối HK1' | 'Họp Phụ huynh cuối năm' | 'Đại hội Chi đoàn';
  date: string;
  time: string;
  location: string;
  attendeesCount: string;
  presidedBy: string; // Chủ trì
  secretary: string; // Thư ký
  mainContent: string;
  resolutions: string; // Nghị quyết / Kết luận
}

export interface HomeroomBookSnapshot {
  id: string;
  title: string;
  createdAt: string;
  period: string; // e.g. "Chốt sổ Đầu năm học", "Chốt sổ Cuối HK1", "Chốt sổ Tổng kết Năm học"
  createdBy: string;
  note: string;
  totalStudents: number;
  gpaAverage: number;
  goodConductPercent: number;
}

export interface HomeroomBookData {
  academicYear: string;
  plan: HomeroomBookPlan;
  committee: ClassCommitteeRole[];
  parentsBoard: ParentsBoardMember[];
  subjectTeachers: SubjectTeacher[];
  specialStudents: SpecialStudentCare[];
  inspections: BghInspectionRecord[];
  meetingMinutes: ClassMeetingMinute[];
  snapshots: HomeroomBookSnapshot[];
  lastUpdated: string;
}

export interface GoogleSheetConfig {
  sheetUrl: string;
  sheetId?: string;
  sheetName?: string;
  autoSync: boolean;
  lastSyncedAt?: string;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastError?: string;
  syncedCount?: number;
}

export interface OnlineClass {
  id: string;
  className: string; // e.g. "Toán 12A1 - Luyện đề THPT QG"
  subject: string; // e.g. "Toán Học", "Vật Lý", "Hóa Học", "Sinh Học", "Ngữ Văn", "Tiếng Anh"
  teacherName: string; // e.g. "Thầy Nguyễn Văn An"
  scheduleTime: string; // e.g. "Thứ 2 & Thứ 5 (19:30 - 21:00)"
  platform: 'Google Meet' | 'Zoom' | 'MS Teams' | 'YouTube Live' | 'K12Online' | 'Khác';
  meetLink: string; // URL Meet / Zoom / Teams
  passcode?: string; // Room ID / Password
  status: 'live' | 'upcoming' | 'ended'; // Đang diễn ra, Sắp diễn ra, Hoàn thành
  notes?: string; // Ghi chú học tập
  documentUrl?: string; // Link tài liệu kèm theo
  lastSyncedAt?: string;
}

export interface OnlineClassSheetConfig {
  sheetUrl: string;
  autoSync: boolean;
  lastSyncedAt?: string;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastError?: string;
  syncedCount?: number;
}

// Additional Types for App & Service Integration
export type Subject = 'math' | 'physics' | 'chemistry' | 'biology' | 'literature' | 'english' | 'history' | 'geography' | 'gdcd' | 'informatics' | 'gdqpan' | string;

export interface Question {
  id: string;
  questionText: string;
  options: { key: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  points?: number;
}

export interface StudentInfo {
  id: string;
  name: string;
  code?: string;
  gender?: 'Nam' | 'Nữ';
  dob?: string;
  group?: number;
  avatar?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface SessionRecord {
  id: string;
  title: string;
  date: string;
  subject?: string;
  teacherName?: string;
  note?: string;
  data?: any;
}

export interface DocumentLearning {
  id: string;
  title: string;
  subject: string;
  fileType: string;
  url?: string;
  description?: string;
  uploadedAt?: string;
}

export interface AppSettings {
  theme?: 'light' | 'dark' | 'system';
  notificationsEnabled?: boolean;
  googleAppsScriptUrl?: string;
  geminiApiKey?: string;
  autoSaveIntervalSeconds?: number;
}

export interface EducationalGame {
  id: string;
  title: string;
  subject: string;
  description: string;
  gameType: 'quiz' | 'flashcard' | 'matching' | 'wheel';
  questions: Question[];
  createdAt?: string;
}

export interface AISimulationItem {
  id: string;
  title: string;
  subject: string;
  scenario: string;
  prompt: string;
  parameters?: Record<string, any>;
  results?: any;
  createdAt?: string;
}

export interface AppData {
  students: Student[];
  disciplineLogs: DisciplineEntry[];
  journal: ClassJournalEntry[];
  leaveRequests: LeaveRequest[];
  tasks: TaskItem[];
  dutySchedule: DutySchedule[];
  materials: StudyMaterial[];
  submissions: AssignmentSubmission[];
  onlineExams: OnlineExam[];
  examAttempts: OnlineExamAttempt[];
  classInfo: ClassInfo;
  teacherInfo: TeacherInfo;
  bghInfo: BghInfo;
  seatingChart: SeatingChartData;
  timetable: TimetableData;
  messages: ChatMessage[];
  parentMeetings: ParentMeeting[];
  studyPairs: StudyPair[];
  randomPicks: RandomPickRecord[];
  emulationLogs: GroupEmulationLog[];
  homeroomBookData: HomeroomBookData;
  subjectTeachers: SubjectTeacher[];
  onlineClasses?: OnlineClass[];
  settings?: AppSettings;
}




