import {
  Student,
  DisciplineEntry,
  ClassJournalEntry,
  LeaveRequest,
  TaskItem,
  DutySchedule,
  Announcement,
  StudyMaterial,
  AssignmentSubmission,
  UserRole,
  ClassInfo,
  TeacherInfo,
  BghInfo,
  SeatingChartData,
  TimetableData,
  ChatMessage,
  ParentMeeting,
  StudyPair,
  OnlineExam,
  OnlineExamAttempt,
  RandomPickRecord,
  GroupEmulationLog,
  HomeroomBookData,
  GoogleSheetConfig,
  OnlineClass,
  OnlineClassSheetConfig,
  SubjectTeacher,
} from '../types';
import {
  INITIAL_STUDENTS,
  INITIAL_DISCIPLINE_LOGS,
  INITIAL_CLASS_JOURNAL,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_TASKS,
  INITIAL_DUTY_SCHEDULE,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_MATERIALS,
  INITIAL_SUBMISSIONS,
  INITIAL_CLASS_INFO,
  INITIAL_TEACHER_INFO,
  INITIAL_BGH_INFO,
  INITIAL_SEATING_CHART,
  INITIAL_TIMETABLE,
  INITIAL_CHAT_MESSAGES,
  INITIAL_PARENT_MEETINGS,
  INITIAL_STUDY_PAIRS,
  INITIAL_ONLINE_EXAMS,
  INITIAL_EXAM_ATTEMPTS,
  INITIAL_RANDOM_PICK_RECORDS,
  INITIAL_GROUP_EMULATION_LOGS,
} from '../data/mockData';
import { INITIAL_HOMEROOM_BOOK_DATA } from '../data/homeroomBookData';
import { autoRepairVietnameseText } from '../utils/googleSheetSync';

/**
 * IndexedDB storage for Student Avatars.
 * Allows storing high-quality/compressed avatar images for all 48+ students
 * persistently without hitting browser localStorage 5MB quota limit.
 */

const AVATAR_DB_NAME = 'TNH_GVCN_AvatarDB_v1';
const AVATAR_STORE_NAME = 'student_avatars';
const AVATAR_DB_VERSION = 1;

let avatarDbPromise: Promise<IDBDatabase> | null = null;

const getAvatarDB = (): Promise<IDBDatabase> => {
  if (avatarDbPromise) return avatarDbPromise;
  avatarDbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject('IndexedDB is not supported');
    }
    const request = indexedDB.open(AVATAR_DB_NAME, AVATAR_DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(AVATAR_STORE_NAME)) {
        db.createObjectStore(AVATAR_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return avatarDbPromise;
};

export const saveAvatarToIndexedDB = async (studentId: string, avatarData: string): Promise<void> => {
  try {
    if (!studentId || !avatarData) return;
    const db = await getAvatarDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(AVATAR_STORE_NAME, 'readwrite');
      const store = tx.objectStore(AVATAR_STORE_NAME);
      const req = store.put(avatarData, studentId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save avatar to IndexedDB:', err);
  }
};

export const saveAllAvatarsToIndexedDB = async (students: { id: string; avatar?: string }[]): Promise<void> => {
  try {
    const db = await getAvatarDB();
    const tx = db.transaction(AVATAR_STORE_NAME, 'readwrite');
    const store = tx.objectStore(AVATAR_STORE_NAME);
    students.forEach((s) => {
      if (s.id && s.avatar && s.avatar.startsWith('data:image')) {
        store.put(s.avatar, s.id);
      }
    });
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Failed to batch save avatars to IndexedDB:', err);
  }
};

export const getAllAvatarsFromIndexedDB = async (): Promise<Record<string, string>> => {
  try {
    const db = await getAvatarDB();
    return new Promise((resolve) => {
      const tx = db.transaction(AVATAR_STORE_NAME, 'readonly');
      const store = tx.objectStore(AVATAR_STORE_NAME);
      const req = store.openCursor();
      const avatars: Record<string, string> = {};
      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          avatars[cursor.key as string] = cursor.value as string;
          cursor.continue();
        } else {
          resolve(avatars);
        }
      };
      req.onerror = () => resolve({});
    });
  } catch (err) {
    console.warn('Failed to get avatars from IndexedDB:', err);
    return {};
  }
};

export const syncAndLoadAvatarsFromIndexedDB = async <T extends { id: string; avatar?: string }>(students: T[]): Promise<T[]> => {
  try {
    const storedAvatars = await getAllAvatarsFromIndexedDB();
    if (!storedAvatars || Object.keys(storedAvatars).length === 0) {
      return students;
    }
    return students.map((s) => {
      if (storedAvatars[s.id] && storedAvatars[s.id].startsWith('data:image')) {
        return { ...s, avatar: storedAvatars[s.id] };
      }
      return s;
    });
  } catch {
    return students;
  }
};

const KEYS = {
  STUDENTS: 'tnh_gvcn_students_v1',
  DISCIPLINE: 'tnh_gvcn_discipline_v1',
  JOURNAL: 'tnh_gvcn_journal_v1',
  LEAVE: 'tnh_gvcn_leave_v1',
  TASKS: 'tnh_gvcn_tasks_v1',
  DUTY: 'tnh_gvcn_duty_v1',
  ANNOUNCEMENTS: 'tnh_gvcn_announcements_v1',
  MATERIALS: 'tnh_gvcn_materials_v1',
  SUBMISSIONS: 'tnh_gvcn_submissions_v1',
  ROLE: 'tnh_gvcn_role_v1',
  CLASS_INFO: 'tnh_gvcn_class_info_v1',
  TEACHER_INFO: 'tnh_gvcn_teacher_info_v1',
  BGH_INFO: 'tnh_gvcn_bgh_info_v1',
  SEATING: 'tnh_gvcn_seating_v1',
  TIMETABLE: 'tnh_gvcn_timetable_v1',
  CHAT_MESSAGES: 'tnh_gvcn_chat_messages_v1',
  PARENT_MEETINGS: 'tnh_gvcn_parent_meetings_v1',
  STUDY_PAIRS: 'tnh_gvcn_study_pairs_v1',
  ONLINE_EXAMS: 'tnh_gvcn_online_exams_v1',
  EXAM_ATTEMPTS: 'tnh_gvcn_exam_attempts_v1',
  RANDOM_PICKS: 'tnh_gvcn_random_picks_v1',
  GROUP_EMULATION: 'tnh_gvcn_group_emulation_v1',
  HOMEROOM_BOOK: 'tnh_gvcn_homeroom_book_v1',
  GOOGLE_SHEET: 'tnh_gvcn_google_sheet_v1',
};

export const getStoredStudents = (): Student[] => {
  try {
    const data = localStorage.getItem(KEYS.STUDENTS);
    const rawList: Student[] = data ? JSON.parse(data) : INITIAL_STUDENTS;
    if (!Array.isArray(rawList)) return INITIAL_STUDENTS;

    // Automatically repair any corrupted font encodings (?, , TCVN3/VNI artifacts)
    return rawList.map((s) => ({
      ...s,
      name: autoRepairVietnameseText(s.name || ''),
      gender: ((s.gender as string) === 'Nữ' || (s.gender as string) === 'Nu') ? 'Nữ' : 'Nam',
      address: autoRepairVietnameseText(s.address || ''),
      strengths: autoRepairVietnameseText(s.strengths || ''),
      careerAspiration: autoRepairVietnameseText(s.careerAspiration || ''),
      healthNote: autoRepairVietnameseText(s.healthNote || ''),
      emergencyContact: {
        ...s.emergencyContact,
        parentName: autoRepairVietnameseText(s.emergencyContact?.parentName || ''),
        workplace: autoRepairVietnameseText(s.emergencyContact?.workplace || ''),
        relationship: s.emergencyContact?.relationship || 'Bố',
      },
    }));
  } catch {
    return INITIAL_STUDENTS;
  }
};
export const saveStudents = (students: Student[]) => {
  try {
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
  } catch (error) {
    console.warn("Storage save error (quota limit), saving data...", error);
    try {
      // Retain student data cleanly in localStorage
      localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
    } catch (retryErr) {
      console.error("Critical error saving students to localStorage:", retryErr);
    }
  }
  // Synchronously & asynchronously persist all avatars to IndexedDB for 100% durability across 48+ students
  saveAllAvatarsToIndexedDB(students).catch((err) => console.warn("IndexedDB avatar save error:", err));
};

export const getStoredDisciplineLogs = (): DisciplineEntry[] => {
  try {
    const data = localStorage.getItem(KEYS.DISCIPLINE);
    return data ? JSON.parse(data) : INITIAL_DISCIPLINE_LOGS;
  } catch {
    return INITIAL_DISCIPLINE_LOGS;
  }
};
export const saveDisciplineLogs = (logs: DisciplineEntry[]) => {
  localStorage.setItem(KEYS.DISCIPLINE, JSON.stringify(logs));
};

export const getStoredJournal = (): ClassJournalEntry[] => {
  try {
    const data = localStorage.getItem(KEYS.JOURNAL);
    return data ? JSON.parse(data) : INITIAL_CLASS_JOURNAL;
  } catch {
    return INITIAL_CLASS_JOURNAL;
  }
};
export const saveJournal = (journal: ClassJournalEntry[]) => {
  localStorage.setItem(KEYS.JOURNAL, JSON.stringify(journal));
};

export const getStoredLeaveRequests = (): LeaveRequest[] => {
  try {
    const data = localStorage.getItem(KEYS.LEAVE);
    return data ? JSON.parse(data) : INITIAL_LEAVE_REQUESTS;
  } catch {
    return INITIAL_LEAVE_REQUESTS;
  }
};
export const saveLeaveRequests = (requests: LeaveRequest[]) => {
  localStorage.setItem(KEYS.LEAVE, JSON.stringify(requests));
};

export const getStoredTasks = (): TaskItem[] => {
  try {
    const data = localStorage.getItem(KEYS.TASKS);
    return data ? JSON.parse(data) : INITIAL_TASKS;
  } catch {
    return INITIAL_TASKS;
  }
};
export const saveTasks = (tasks: TaskItem[]) => {
  localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
};

export const getStoredDutySchedule = (): DutySchedule[] => {
  try {
    const data = localStorage.getItem(KEYS.DUTY);
    if (!data) return INITIAL_DUTY_SCHEDULE;
    const parsed: DutySchedule[] = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_DUTY_SCHEDULE;
    // Map existing records to ensure slotName and session exist
    const normalized = parsed.map((item) => {
      const session = item.session || (item.slotName?.includes('Chiều') ? 'Chiều' : 'Sáng');
      const slotName = item.slotName || `${session} ${item.dayOfWeek}`;
      return {
        ...item,
        session,
        slotName,
      };
    });

    // Merge missing initial items (e.g., duty-09, duty-10) if user has cached old localStorage data
    const existingIds = new Set(normalized.map((item) => item.id));
    const missingInitials = INITIAL_DUTY_SCHEDULE.filter((item) => !existingIds.has(item.id));
    return missingInitials.length > 0 ? [...normalized, ...missingInitials] : normalized;
  } catch {
    return INITIAL_DUTY_SCHEDULE;
  }
};
export const saveDutySchedule = (duty: DutySchedule[]) => {
  localStorage.setItem(KEYS.DUTY, JSON.stringify(duty));
};

export const getStoredMaterials = (): StudyMaterial[] => {
  try {
    const data = localStorage.getItem(KEYS.MATERIALS);
    if (!data) return INITIAL_MATERIALS;
    const parsed: StudyMaterial[] = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_MATERIALS;
    const existingIds = new Set(parsed.map((item) => item.id));
    const missingInitials = INITIAL_MATERIALS.filter((item) => !existingIds.has(item.id));
    return missingInitials.length > 0 ? [...parsed, ...missingInitials] : parsed;
  } catch {
    return INITIAL_MATERIALS;
  }
};
export const saveMaterials = (materials: StudyMaterial[]) => {
  localStorage.setItem(KEYS.MATERIALS, JSON.stringify(materials));
};

export const getStoredSubmissions = (): AssignmentSubmission[] => {
  try {
    const data = localStorage.getItem(KEYS.SUBMISSIONS);
    return data ? JSON.parse(data) : INITIAL_SUBMISSIONS;
  } catch {
    return INITIAL_SUBMISSIONS;
  }
};
export const saveSubmissions = (submissions: AssignmentSubmission[]) => {
  localStorage.setItem(KEYS.SUBMISSIONS, JSON.stringify(submissions));
};

export const getStoredRole = (): UserRole => {
  try {
    const data = localStorage.getItem(KEYS.ROLE) as UserRole;
    return ['gvcn', 'bgh', 'gvbm', 'csl', 'student', 'parent'].includes(data) ? data : 'gvcn';
  } catch {
    return 'gvcn';
  }
};
export const saveRole = (role: UserRole) => {
  localStorage.setItem(KEYS.ROLE, role);
};

export const getStoredSystemAuth = (): boolean => {
  try {
    const sess = sessionStorage.getItem('gvcn_sys_auth_v1');
    if (sess === 'true') return true;
    const local = localStorage.getItem('gvcn_sys_auth_v1');
    return local === 'true';
  } catch {
    return false;
  }
};

export const saveSystemAuth = (authenticated: boolean, remember: boolean = true) => {
  try {
    if (authenticated) {
      sessionStorage.setItem('gvcn_sys_auth_v1', 'true');
      if (remember) {
        localStorage.setItem('gvcn_sys_auth_v1', 'true');
      }
    } else {
      sessionStorage.removeItem('gvcn_sys_auth_v1');
      localStorage.removeItem('gvcn_sys_auth_v1');
    }
  } catch {
    // ignore quota/security errors
  }
};

export const getStoredClassInfo = (): ClassInfo => {
  try {
    const data = localStorage.getItem(KEYS.CLASS_INFO);
    if (!data) return INITIAL_CLASS_INFO;
    const parsed: ClassInfo = JSON.parse(data);
    if (parsed.className?.includes('12A1')) {
      const updated = {
        ...parsed,
        className: 'LỚP 11D5',
        academicYear: 'Niên khóa 2024 - 2027',
        specialization: 'Lớp 11D5 - THPT Trần Nguyên Hãn',
        streamBadge: 'Lớp 11D5',
      };
      saveClassInfo(updated);
      return updated;
    }
    return parsed;
  } catch {
    return INITIAL_CLASS_INFO;
  }
};
export const saveClassInfo = (info: ClassInfo) => {
  localStorage.setItem(KEYS.CLASS_INFO, JSON.stringify(info));
};

export const getStoredTeacherInfo = (): TeacherInfo => {
  try {
    const data = localStorage.getItem(KEYS.TEACHER_INFO);
    if (!data) return INITIAL_TEACHER_INFO;
    const parsed: TeacherInfo = JSON.parse(data);
    if (parsed.name?.includes('Nguyễn Văn An')) {
      const updated = {
        ...parsed,
        name: 'Cô Phan Thị Dạ Hương',
        title: 'Giáo viên Chủ nhiệm - Lớp 11D5',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
        email: 'dahuong.gv@tnh.edu.vn',
        subject: 'Chủ nhiệm / Ngữ Văn',
      };
      saveTeacherInfo(updated);
      return updated;
    }
    return parsed;
  } catch {
    return INITIAL_TEACHER_INFO;
  }
};
export const saveTeacherInfo = (info: TeacherInfo) => {
  localStorage.setItem(KEYS.TEACHER_INFO, JSON.stringify(info));
};

export const getStoredBghInfo = (): BghInfo => {
  try {
    const data = localStorage.getItem(KEYS.BGH_INFO);
    return data ? JSON.parse(data) : INITIAL_BGH_INFO;
  } catch {
    return INITIAL_BGH_INFO;
  }
};
export const saveBghInfo = (info: BghInfo) => {
  localStorage.setItem(KEYS.BGH_INFO, JSON.stringify(info));
};

export const getStoredSeatingChart = (): SeatingChartData => {
  try {
    const data = localStorage.getItem(KEYS.SEATING);
    if (!data) return INITIAL_SEATING_CHART;
    const parsed = JSON.parse(data);
    if (parsed && Array.isArray(parsed.columns) && parsed.columns.length > 0) {
      return parsed;
    }
    return INITIAL_SEATING_CHART;
  } catch {
    return INITIAL_SEATING_CHART;
  }
};
export const saveSeatingChart = (chart: SeatingChartData) => {
  localStorage.setItem(KEYS.SEATING, JSON.stringify(chart));
};

export const getStoredTimetable = (): TimetableData => {
  try {
    const data = localStorage.getItem(KEYS.TIMETABLE);
    if (!data) return INITIAL_TIMETABLE;
    const parsed = JSON.parse(data);
    if (parsed && Array.isArray(parsed.days) && parsed.days.length > 0) {
      return {
        academicYear: parsed.academicYear || INITIAL_TIMETABLE.academicYear,
        appliedDate: parsed.appliedDate || INITIAL_TIMETABLE.appliedDate,
        morningTime: parsed.morningTime || INITIAL_TIMETABLE.morningTime,
        morningLabel: parsed.morningLabel || INITIAL_TIMETABLE.morningLabel,
        afternoonTime: parsed.afternoonTime || INITIAL_TIMETABLE.afternoonTime,
        afternoonLabel: parsed.afternoonLabel || INITIAL_TIMETABLE.afternoonLabel,
        days: parsed.days,
      };
    }
    return INITIAL_TIMETABLE;
  } catch {
    return INITIAL_TIMETABLE;
  }
};
export const saveTimetable = (timetable: TimetableData) => {
  localStorage.setItem(KEYS.TIMETABLE, JSON.stringify(timetable));
};

export const getStoredChatMessages = (): ChatMessage[] => {
  try {
    const data = localStorage.getItem(KEYS.CHAT_MESSAGES);
    return data ? JSON.parse(data) : INITIAL_CHAT_MESSAGES;
  } catch {
    return INITIAL_CHAT_MESSAGES;
  }
};
export const saveChatMessages = (messages: ChatMessage[]) => {
  localStorage.setItem(KEYS.CHAT_MESSAGES, JSON.stringify(messages));
};

export const getStoredParentMeetings = (): ParentMeeting[] => {
  try {
    const data = localStorage.getItem(KEYS.PARENT_MEETINGS);
    return data ? JSON.parse(data) : INITIAL_PARENT_MEETINGS;
  } catch {
    return INITIAL_PARENT_MEETINGS;
  }
};
export const saveParentMeetings = (meetings: ParentMeeting[]) => {
  localStorage.setItem(KEYS.PARENT_MEETINGS, JSON.stringify(meetings));
};

export const getStoredStudyPairs = (): StudyPair[] => {
  try {
    const data = localStorage.getItem(KEYS.STUDY_PAIRS);
    return data ? JSON.parse(data) : INITIAL_STUDY_PAIRS;
  } catch {
    return INITIAL_STUDY_PAIRS;
  }
};
export const saveStudyPairs = (pairs: StudyPair[]) => {
  localStorage.setItem(KEYS.STUDY_PAIRS, JSON.stringify(pairs));
};

export const getStoredOnlineExams = (): OnlineExam[] => {
  try {
    const data = localStorage.getItem(KEYS.ONLINE_EXAMS);
    return data ? JSON.parse(data) : INITIAL_ONLINE_EXAMS;
  } catch {
    return INITIAL_ONLINE_EXAMS;
  }
};
export const saveOnlineExams = (exams: OnlineExam[]) => {
  localStorage.setItem(KEYS.ONLINE_EXAMS, JSON.stringify(exams));
};

export const getStoredExamAttempts = (): OnlineExamAttempt[] => {
  try {
    const data = localStorage.getItem(KEYS.EXAM_ATTEMPTS);
    return data ? JSON.parse(data) : INITIAL_EXAM_ATTEMPTS;
  } catch {
    return INITIAL_EXAM_ATTEMPTS;
  }
};
export const saveExamAttempts = (attempts: OnlineExamAttempt[]) => {
  localStorage.setItem(KEYS.EXAM_ATTEMPTS, JSON.stringify(attempts));
};

export const getStoredRandomPicks = (): RandomPickRecord[] => {
  try {
    const data = localStorage.getItem(KEYS.RANDOM_PICKS);
    return data ? JSON.parse(data) : INITIAL_RANDOM_PICK_RECORDS;
  } catch {
    return INITIAL_RANDOM_PICK_RECORDS;
  }
};
export const saveRandomPicks = (picks: RandomPickRecord[]) => {
  localStorage.setItem(KEYS.RANDOM_PICKS, JSON.stringify(picks));
};

export const getStoredGroupEmulationLogs = (): GroupEmulationLog[] => {
  try {
    const data = localStorage.getItem(KEYS.GROUP_EMULATION);
    return data ? JSON.parse(data) : INITIAL_GROUP_EMULATION_LOGS;
  } catch {
    return INITIAL_GROUP_EMULATION_LOGS;
  }
};
export const saveGroupEmulationLogs = (logs: GroupEmulationLog[]) => {
  localStorage.setItem(KEYS.GROUP_EMULATION, JSON.stringify(logs));
};

export const getStoredHomeroomBookData = (): HomeroomBookData => {
  try {
    const data = localStorage.getItem(KEYS.HOMEROOM_BOOK);
    if (!data) return INITIAL_HOMEROOM_BOOK_DATA;
    const parsed: HomeroomBookData = JSON.parse(data);
    return {
      ...INITIAL_HOMEROOM_BOOK_DATA,
      ...parsed,
      plan: {
        ...INITIAL_HOMEROOM_BOOK_DATA.plan,
        ...(parsed.plan || {}),
        advantages: (parsed.plan && Array.isArray(parsed.plan.advantages)) ? parsed.plan.advantages : INITIAL_HOMEROOM_BOOK_DATA.plan.advantages,
        difficulties: (parsed.plan && Array.isArray(parsed.plan.difficulties)) ? parsed.plan.difficulties : INITIAL_HOMEROOM_BOOK_DATA.plan.difficulties,
        monthlyThemes: (parsed.plan && Array.isArray(parsed.plan.monthlyThemes)) ? parsed.plan.monthlyThemes : INITIAL_HOMEROOM_BOOK_DATA.plan.monthlyThemes,
        academicTargets: {
          ...INITIAL_HOMEROOM_BOOK_DATA.plan.academicTargets,
          ...(parsed.plan?.academicTargets || {}),
        },
        conductTargets: {
          ...INITIAL_HOMEROOM_BOOK_DATA.plan.conductTargets,
          ...(parsed.plan?.conductTargets || {}),
        },
        keyMeasures: {
          ...INITIAL_HOMEROOM_BOOK_DATA.plan.keyMeasures,
          ...(parsed.plan?.keyMeasures || {}),
        },
      },
      committee: Array.isArray(parsed.committee) ? parsed.committee : INITIAL_HOMEROOM_BOOK_DATA.committee,
      parentsBoard: Array.isArray(parsed.parentsBoard) ? parsed.parentsBoard : INITIAL_HOMEROOM_BOOK_DATA.parentsBoard,
      subjectTeachers: Array.isArray(parsed.subjectTeachers) ? parsed.subjectTeachers : INITIAL_HOMEROOM_BOOK_DATA.subjectTeachers,
      specialStudents: Array.isArray(parsed.specialStudents) ? parsed.specialStudents : INITIAL_HOMEROOM_BOOK_DATA.specialStudents,
      inspections: Array.isArray(parsed.inspections) ? parsed.inspections : INITIAL_HOMEROOM_BOOK_DATA.inspections,
      meetingMinutes: Array.isArray(parsed.meetingMinutes) ? parsed.meetingMinutes : INITIAL_HOMEROOM_BOOK_DATA.meetingMinutes,
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : INITIAL_HOMEROOM_BOOK_DATA.snapshots,
    };
  } catch {
    return INITIAL_HOMEROOM_BOOK_DATA;
  }
};

export const saveHomeroomBookData = (data: HomeroomBookData) => {
  localStorage.setItem(KEYS.HOMEROOM_BOOK, JSON.stringify(data));
};

export const getStoredGoogleSheetConfig = (): GoogleSheetConfig | null => {
  try {
    const data = localStorage.getItem(KEYS.GOOGLE_SHEET);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const saveGoogleSheetConfig = (config: GoogleSheetConfig) => {
  localStorage.setItem(KEYS.GOOGLE_SHEET, JSON.stringify(config));
};

export const Storage = {
  getStudents: getStoredStudents,
  saveStudents,
  getDisciplineLogs: getStoredDisciplineLogs,
  saveDisciplineLogs,
  getJournal: getStoredJournal,
  saveJournal,
  getLeaveRequests: getStoredLeaveRequests,
  saveLeaveRequests,
  getTasks: getStoredTasks,
  saveTasks,
  getDutySchedule: getStoredDutySchedule,
  saveDutySchedule,
  getMaterials: getStoredMaterials,
  saveMaterials,
  getSubmissions: getStoredSubmissions,
  saveSubmissions,
  getRole: getStoredRole,
  saveRole,
  getClassInfo: getStoredClassInfo,
  saveClassInfo,
  getTeacherInfo: getStoredTeacherInfo,
  saveTeacherInfo,
  getSeatingChart: getStoredSeatingChart,
  saveSeatingChart,
  getTimetable: getStoredTimetable,
  saveTimetable,
  getChatMessages: getStoredChatMessages,
  saveChatMessages,
  getParentMeetings: getStoredParentMeetings,
  saveParentMeetings,
  getStudyPairs: getStoredStudyPairs,
  saveStudyPairs,
  getOnlineExams: getStoredOnlineExams,
  saveOnlineExams,
  getExamAttempts: getStoredExamAttempts,
  saveExamAttempts,
  getRandomPicks: getStoredRandomPicks,
  saveRandomPicks,
  getGroupEmulationLogs: getStoredGroupEmulationLogs,
  saveGroupEmulationLogs,
  getGoogleSheetConfig: getStoredGoogleSheetConfig,
  saveGoogleSheetConfig,
  getOnlineClasses: getStoredOnlineClasses,
  saveOnlineClasses,
  getOnlineClassSheetConfig: getStoredOnlineClassSheetConfig,
  saveOnlineClassSheetConfig,
  resetAll: () => {
    localStorage.clear();
    window.location.reload();
  },
};

const ONLINE_CLASSES_STORAGE_KEY = 'gvcn_online_classes';
const ONLINE_CLASS_SHEET_CONFIG_STORAGE_KEY = 'gvcn_online_class_sheet_config';

export const INITIAL_ONLINE_CLASSES: OnlineClass[] = [
  {
    id: 'oc-1',
    className: 'Toán 12A1 - Ôn thi Tốt nghiệp THPT QG & Vận dụng cao',
    subject: 'Toán Học',
    teacherName: 'Thầy Nguyễn Văn An (GVCN)',
    scheduleTime: 'Tối Thứ 2 & Thứ 5 (19:30 - 21:30)',
    platform: 'Google Meet',
    meetLink: 'https://meet.google.com/abc-defg-hij',
    passcode: 'Mã phòng: 12A1-TOAN',
    status: 'live',
    notes: 'Học sinh mở camera, mang đề số 8 và máy tính Casio fx-580VN.',
    documentUrl: 'https://drive.google.com',
    lastSyncedAt: new Date().toLocaleString('vi-VN'),
  },
  {
    id: 'oc-2',
    className: 'Vật Lý 12A1 - Chuyên đề Sóng Cơ & Dòng Điện Xoay Chiều',
    subject: 'Vật Lý',
    teacherName: 'Thầy Trần Đức Minh (GVBM)',
    scheduleTime: 'Tối Thứ 3 & Thứ 6 (20:00 - 21:30)',
    platform: 'Zoom',
    meetLink: 'https://zoom.us/j/9876543210',
    passcode: 'ID: 987 654 3210 | Pass: 123456',
    status: 'upcoming',
    notes: 'Luyện câu hỏi phân hóa 8.5+ chương Điện xoay chiều.',
    documentUrl: 'https://drive.google.com',
    lastSyncedAt: new Date().toLocaleString('vi-VN'),
  },
  {
    id: 'oc-3',
    className: 'Tiếng Anh 12A1 - Bứt Phá Từ Vựng & Ngữ Pháp Trắc Nghiệm',
    subject: 'Tiếng Anh',
    teacherName: 'Cô Lê Thị Mai (BGH / GVBM)',
    scheduleTime: 'Tối Thứ 4 & Chủ Nhật (19:30 - 21:00)',
    platform: 'Google Meet',
    meetLink: 'https://meet.google.com/xyz-uvwx-rst',
    passcode: 'Mã phòng: 12A1-ENGLISH',
    status: 'upcoming',
    notes: 'Làm trước 50 câu trắc nghiệm Reading Comprehension.',
    lastSyncedAt: new Date().toLocaleString('vi-VN'),
  },
  {
    id: 'oc-4',
    className: 'Sinh Hoạt Lớp 12A1 - Định Hướng Học Tập & Xét Tuyển ĐH 2027',
    subject: 'Sinh Hoạt Lớp',
    teacherName: 'Thầy Nguyễn Văn An (GVCN)',
    scheduleTime: 'Chủ Nhật Hằng Tuần (20:00 - 21:00)',
    platform: 'Google Meet',
    meetLink: 'https://meet.google.com/gvcn-12a1-meet',
    passcode: 'Phòng họp trực tuyến Lớp 12A1',
    status: 'upcoming',
    notes: 'GVCN kết nối trực tuyến cùng Phụ huynh & Học sinh.',
    lastSyncedAt: new Date().toLocaleString('vi-VN'),
  },
];

export const getStoredOnlineClasses = (): OnlineClass[] => {
  const stored = localStorage.getItem(ONLINE_CLASSES_STORAGE_KEY);
  if (!stored) return INITIAL_ONLINE_CLASSES;
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_ONLINE_CLASSES;
  }
};

export const saveOnlineClasses = (classes: OnlineClass[]) => {
  localStorage.setItem(ONLINE_CLASSES_STORAGE_KEY, JSON.stringify(classes));
};

export const getStoredOnlineClassSheetConfig = (): OnlineClassSheetConfig | null => {
  const stored = localStorage.getItem(ONLINE_CLASS_SHEET_CONFIG_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const saveOnlineClassSheetConfig = (config: OnlineClassSheetConfig) => {
  localStorage.setItem(ONLINE_CLASS_SHEET_CONFIG_STORAGE_KEY, JSON.stringify(config));
};

const SUBJECT_TEACHERS_STORAGE_KEY = 'tnh_gvcn_subject_teachers_v1';

export const getStoredSubjectTeachers = (): SubjectTeacher[] => {
  const stored = localStorage.getItem(SUBJECT_TEACHERS_STORAGE_KEY);
  if (!stored) return INITIAL_HOMEROOM_BOOK_DATA.subjectTeachers || [];
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_HOMEROOM_BOOK_DATA.subjectTeachers || [];
  }
};

export const saveSubjectTeachers = (teachers: SubjectTeacher[]) => {
  localStorage.setItem(SUBJECT_TEACHERS_STORAGE_KEY, JSON.stringify(teachers));
};



