import { SessionRecord, OnlineClass, AppData } from '../types';

export const APPS_SCRIPT_SAMPLE_CODE = `// ==========================================
// CODE GOOGLE APPS SCRIPT ĐỒNG BỘ HỌC ONLINE 2026-2027
// Hướng dẫn cài đặt trong 1 phút:
// 1. Mở Google Sheet mới hoặc hiện có của bạn
// 2. Vào Tiện ích mở rộng (Extensions) > Apps Script
// 3. Xóa code cũ, dán toàn bộ đoạn mã này vào
// 4. Nhấn "Triển khai" (Deploy) > "Tùy chọn triển khai mới" (New deployment)
// 5. Chọn loại: "Ứng dụng web" (Web app)
//    - Thực thi dưới dạng: "Tôi" (Me)
//    - Ai có quyền truy cập: "Bất kỳ ai" (Anyone)
// 6. Nhấn "Triển khai", cấp quyền và sao chép Web App URL dán vào ứng dụng HỌC ONLINE!
// ==========================================

function getOrCreateSheet(ss, name, headers, tabColor) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground(tabColor || "#0d9488");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
  }
  return sheet;
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = e && e.parameter && e.parameter.action;

  // Lấy toàn bộ bản lưu trữ AppData từ Google Sheets
  if (action === "getFullAppData") {
    var syncSheet = ss.getSheetByName("DuLieuDongBoApp");
    if (syncSheet && syncSheet.getLastRow() >= 2) {
      var jsonStr = syncSheet.getRange(2, 1).getValue();
      try {
        var parsed = JSON.parse(jsonStr);
        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          appData: parsed,
          updatedAt: syncSheet.getRange(2, 2).getValue()
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "Lỗi đọc dữ liệu JSON: " + err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Chưa có bản đồng bộ dữ liệu nào trong tab DuLieuDongBoApp."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Mặc định: Lấy danh sách Lớp học trực tuyến
  var sheet = getOrCreateSheet(ss, "LopHocTrucTuyen", [
    "ID", "Tên lớp", "Khối", "Môn học", "Giáo viên", "Lịch học", "Link phòng học", "Nền tảng", "Mã phòng", "Mật khẩu", "Trạng thái", "Ghi chú", "Thời gian Cập nhật"
  ], "#0d9488");
  
  if (sheet.getLastRow() <= 1) {
    var sampleClasses = [
      ["cls-10a1", "10A1", "10", "Toán học", "Thầy Nguyễn Văn An", "Thứ 2, 4, 6 - 08:00 - 09:30", "https://meet.google.com/abc-defg-hij", "google_meet", "abc-defg-hij", "", "live", "Ôn tập Mệnh đề & Bất phương trình bậc hai SGK 10", new Date().toISOString()],
      ["cls-11b2", "11B2", "11", "Vật lý", "Cô Trần Thị Bình", "Thứ 3, 5, 7 - 14:00 - 15:30", "https://meet.google.com/xyz-uvwx-rst", "google_meet", "xyz-uvwx-rst", "", "upcoming", "Chuyên đề Điện trường & Dao động cơ học SGK 11", new Date().toISOString()],
      ["cls-12c1", "12C1", "12", "Hóa học", "Thầy Lê Hoàng Nam", "Thứ 2, 5 - 19:30 - 21:00", "https://zoom.us/j/9876543210", "zoom", "987 654 3210", "123456", "upcoming", "Phản ứng Este - Lipit & Bài tập vận dụng cao SGK 12", new Date().toISOString()],
      ["cls-10t2", "10T2", "10", "Tiếng Anh", "Cô Phạm Mai Hương", "Thứ 4, 7 - 10:00 - 11:30", "https://teams.microsoft.com/l/meetup-join/sample", "teams", "MS Teams Room 10T2", "", "ended", "Grammar Focus: Relative Clauses SGK 10", new Date().toISOString()]
    ];
    for (var i = 0; i < sampleClasses.length; i++) {
      sheet.appendRow(sampleClasses[i]);
    }
  }

  var data = sheet.getDataRange().getValues();
  var classes = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row[1]) continue;
    classes.push({
      id: row[0] || ("cls-" + r),
      className: String(row[1]),
      grade: String(row[2] || ""),
      subject: String(row[3] || "Chung"),
      teacher: String(row[4] || ""),
      schedule: String(row[5] || ""),
      meetingLink: String(row[6] || ""),
      platform: String(row[7] || "google_meet"),
      roomCode: String(row[8] || ""),
      password: String(row[9] || ""),
      status: String(row[10] || "upcoming").toLowerCase(),
      notes: String(row[11] || ""),
      updatedAt: String(row[12] || "")
    });
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    service: "HỌC ONLINE Class Database Service",
    classes: classes,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);

    // Đồng bộ toàn bộ dữ liệu App (Subjects, Documents, Games, Classes)
    if (data.action === "syncFullAppData") {
      var syncSheet = getOrCreateSheet(ss, "DuLieuDongBoApp", ["JSON_AppData", "Thời gian Cập nhật"], "#0d9488");
      syncSheet.getRange("A2:B2").setValues([[JSON.stringify(data.appData), new Date().toLocaleString("vi-VN")]]);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Đã lưu toàn bộ dữ liệu ứng dụng (Môn học, Đề thi, Tài liệu, Games, Lớp học) lên Google Sheets!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "saveClass") {
      var classSheet = getOrCreateSheet(ss, "LopHocTrucTuyen", [
        "ID", "Tên lớp", "Khối", "Môn học", "Giáo viên", "Lịch học", "Link phòng học", "Nền tảng", "Mã phòng", "Mật khẩu", "Trạng thái", "Ghi chú", "Thời gian Cập nhật"
      ], "#0d9488");
      
      classSheet.appendRow([
        data.id || ("cls-" + Date.now()),
        data.className || "",
        data.grade || "",
        data.subject || "",
        data.teacher || "",
        data.schedule || "",
        data.meetingLink || "",
        data.platform || "google_meet",
        data.roomCode || "",
        data.password || "",
        data.status || "live",
        data.notes || "",
        new Date().toLocaleString("vi-VN")
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Đã thêm/cập nhật lớp học trực tuyến thành công!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Mặc định: Ghi kết quả điểm thi
    var examSheet = getOrCreateSheet(ss, "KetQuaThi", [
      "Thời gian nộp", "Họ và tên", "Lớp", "Nhóm / Tổ", "Môn thi", "Điểm số (thang 10)", "Số câu đúng", "Tổng số câu", "Thời gian làm bài", "Mã phiên thi"
    ], "#0d9488");

    examSheet.appendRow([
      data.submittedAt || new Date().toLocaleString("vi-VN"),
      data.fullName || "Ẩn danh",
      data.className || "Không rõ",
      data.groupName || "Không rõ",
      data.subjectName || "Chung",
      data.score !== undefined ? data.score : 0,
      data.correctAnswers !== undefined ? data.correctAnswers : 0,
      data.totalQuestions !== undefined ? data.totalQuestions : 0,
      data.timeSpentFormatted || "00:00",
      data.sessionId || "N/A"
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Đồng bộ điểm thi thành công về Google Sheets!"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
`;

export function formatTimeSpent(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function validateAppsScriptUrl(url?: string): { isValid: boolean; message?: string } {
  const trimmed = (url || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      message: 'Chưa nhập URL Google Apps Script Web App. Vui lòng dán URL Web App trong phần Cài đặt.',
    };
  }

  if (trimmed.includes('docs.google.com/spreadsheets')) {
    return {
      isValid: false,
      message: '⚠️ BẠN ĐÃ DÁN NHẦM LINK GOOGLE SHEET (docs.google.com)! Vui lòng vào Google Sheet > Tiện ích mở rộng > Apps Script > Triển khai dưới dạng Web App để lấy link có dạng https://script.google.com/macros/s/.../exec !',
    };
  }

  if (trimmed.endsWith('/dev')) {
    return {
      isValid: false,
      message: '⚠️ BẠN ĐANG DÙNG LINK THỬ NGHIỆM (/dev). Link này chỉ dùng cho tài khoản cá nhân. Vui lòng bấm Triển khai (Deploy) > Tùy chọn triển khai mới (New deployment) để lấy link chính thức kết thúc bằng /exec !',
    };
  }

  if (!trimmed.startsWith('https://script.google.com/macros/s/') && !trimmed.startsWith('http')) {
    return {
      isValid: false,
      message: 'URL không hợp lệ. Link Web App chuẩn của Google Apps Script phải có dạng https://script.google.com/macros/s/.../exec',
    };
  }

  return { isValid: true };
}

export async function pushFullAppDataToGoogleSheets(
  appData: AppData,
  customScriptUrl?: string
): Promise<{ success: boolean; message: string }> {
  const scriptUrl = customScriptUrl || localStorage.getItem('google_apps_script_url');
  const validation = validateAppsScriptUrl(scriptUrl || '');
  if (!validation.isValid) {
    return { success: false, message: validation.message || 'URL Google Apps Script không hợp lệ.' };
  }

  const payload = {
    action: 'syncFullAppData',
    timestamp: new Date().toISOString(),
    appData: {
      subjects: appData.subjects || [],
      questions: appData.questions || [],
      documents: appData.documents || [],
      games: appData.games || [],
      onlineClasses: appData.onlineClasses || [],
    },
  };

  const targetUrl = (scriptUrl || '').trim();

  try {
    const proxyRes = await fetch('/api/sync-google-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptUrl: targetUrl, payload }),
    });
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      return { success: true, message: data.result?.message || 'Đã tải toàn bộ dữ liệu ứng dụng lên Google Sheets thành công!' };
    }
  } catch (e) {
    console.warn('Proxy sync failed, falling back to direct fetch', e);
  }

  try {
    await fetch(targetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    return { success: true, message: 'Đã phát tín hiệu đồng bộ toàn bộ dữ liệu ứng dụng tới Google Sheets thành công!' };
  } catch (err: any) {
    return { success: false, message: `Lỗi kết nối: ${err?.message || err}` };
  }
}

export async function pullFullAppDataFromGoogleSheets(
  customScriptUrl?: string
): Promise<{ success: boolean; data?: Partial<AppData>; message: string }> {
  const scriptUrl = customScriptUrl || localStorage.getItem('google_apps_script_url');
  const validation = validateAppsScriptUrl(scriptUrl || '');
  if (!validation.isValid) {
    return { success: false, message: validation.message || 'URL Google Apps Script không hợp lệ.' };
  }

  const targetUrl = `${(scriptUrl || '').trim()}?action=getFullAppData&t=${Date.now()}`;

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      return { success: false, message: `Lỗi HTTP ${response.status} từ Google Apps Script` };
    }
    const json = await response.json();
    if (json.status === 'success' && json.appData) {
      return {
        success: true,
        data: json.appData,
        message: 'Đã tải toàn bộ dữ liệu mới nhất từ Google Sheets thành công!',
      };
    }
    return { success: false, message: json.message || 'Chưa tìm thấy bản sao lưu dữ liệu trên Google Sheets.' };
  } catch (err: any) {
    return { success: false, message: `Không thể kết nối đến Google Apps Script: ${err?.message || err}` };
  }
}

export async function syncSessionToGoogleSheets(
  session: SessionRecord,
  customScriptUrl?: string
): Promise<{ success: boolean; message: string }> {
  const scriptUrl = customScriptUrl || localStorage.getItem('google_apps_script_url');

  const validation = validateAppsScriptUrl(scriptUrl || '');
  if (!validation.isValid) {
    return {
      success: false,
      message: validation.message || 'URL Google Apps Script không hợp lệ.',
    };
  }

  const payload = {
    sessionId: session.id,
    submittedAt: session.date,
    fullName: session.studentInfo.fullName,
    className: session.studentInfo.className,
    groupName: session.studentInfo.groupName,
    subjectName: session.subjectName,
    score: session.score,
    correctAnswers: session.correctAnswers,
    totalQuestions: session.totalQuestions,
    timeSpentFormatted: formatTimeSpent(session.timeSpent),
  };

  const targetUrl = (scriptUrl || '').trim();

  // 1. Thử gửi qua Server proxy nếu backend có sẵn
  try {
    const proxyRes = await fetch('/api/sync-google-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptUrl: targetUrl,
        payload,
      }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.error) {
        return {
          success: false,
          message: `⚠️ Lỗi kết nối Google Sheets: ${data.error}`,
        };
      }
      return {
        success: true,
        message: data.result?.message || 'Đã đồng bộ kết quả lên Google Sheets thành công!',
      };
    }
  } catch (err) {
    console.warn('Proxy sync skipped/failed, switching to direct client fetch...', err);
  }

  // 2. Fallback trực tiếp: Gửi request mode 'no-cors' thẳng đến Google Apps Script Web App
  try {
    await fetch(targetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      message: '✅ Kết nối Google Sheets thành công! Dữ liệu đã được tự động gửi đến Google Sheets của bạn.',
    };
  } catch (directErr: any) {
    console.error('Direct sync failed:', directErr);
    return {
      success: false,
      message: `Không thể kết nối đến Google Sheets: ${directErr.message || 'Lỗi mạng'}`,
    };
  }
}

export interface GameSessionResult {
  gameId: string;
  gameTitle: string;
  gameType: 'quiz' | 'drag_drop' | 'matching';
  subject: string;
  studentInfo: {
    fullName: string;
    className: string;
    groupName?: string;
  };
  score: number;
  rawScore?: number;
  correctCount: number;
  totalCount: number;
  timeSpent: number;
  submittedAt?: string;
  detailsSummary?: string;
}

export async function syncGameResultToGoogleSheets(
  result: GameSessionResult,
  customScriptUrl?: string
): Promise<{ success: boolean; message: string }> {
  const scriptUrl = customScriptUrl || localStorage.getItem('google_apps_script_url');

  const validation = validateAppsScriptUrl(scriptUrl || '');
  if (!validation.isValid) {
    return {
      success: false,
      message: validation.message || 'URL Google Apps Script không hợp lệ.',
    };
  }

  const gameTypeLabels: Record<string, string> = {
    quiz: 'Trò chơi Quiz Tốc Độ',
    drag_drop: 'Trò chơi Kéo Thả Phân Loại',
    matching: 'Trò chơi Ghép Cặp Thuật Ngữ',
  };

  const typeLabel = gameTypeLabels[result.gameType] || 'Trò chơi học tập';
  const groupName = result.studentInfo.groupName?.trim()
    ? `${typeLabel} - ${result.studentInfo.groupName.trim()}`
    : typeLabel;

  const payload = {
    sessionId: `game-${result.gameId}-${Date.now()}`,
    submittedAt: result.submittedAt || new Date().toLocaleString('vi-VN'),
    fullName: result.studentInfo.fullName.trim(),
    className: result.studentInfo.className.trim(),
    groupName,
    subjectName: `[Trò chơi] ${result.gameTitle} (${result.subject})`,
    score: result.score,
    correctAnswers: result.correctCount,
    totalQuestions: result.totalCount,
    timeSpentFormatted: formatTimeSpent(result.timeSpent),
    gameType: result.gameType,
    rawScore: result.rawScore,
    detailsSummary: result.detailsSummary || `Đạt ${result.correctCount}/${result.totalCount}`,
  };

  // 1. Thử gửi qua Server proxy để tránh CORS
  try {
    const proxyRes = await fetch('/api/sync-google-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptUrl: scriptUrl.trim(),
        payload,
      }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      return {
        success: true,
        message: data.result?.message || 'Đã gửi kết quả trò chơi về Google Sheets thành công!',
      };
    }
  } catch (err) {
    console.warn('Game result proxy sync failed, attempting direct fetch...', err);
  }

  // 2. Thử fetch trực tiếp với mode: 'no-cors'
  try {
    await fetch(scriptUrl.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      message: 'Đã gửi yêu cầu lưu kết quả trò chơi đến Google Sheets.',
    };
  } catch (directErr: any) {
    console.error('Direct game sync failed:', directErr);
    return {
      success: false,
      message: `Không thể kết nối đến Google Sheets: ${directErr.message || 'Lỗi mạng'}`,
    };
  }
}

/**
 * Tải danh sách Lớp học Trực tuyến từ Google Sheets
 */
export async function fetchOnlineClassesFromGoogleSheets(
  customUrl?: string
): Promise<{ success: boolean; classes?: OnlineClass[]; message: string }> {
  const url =
    customUrl ||
    localStorage.getItem('online_class_sheet_url') ||
    localStorage.getItem('google_apps_script_url');

  if (!url || !url.trim().startsWith('http')) {
    return {
      success: false,
      message: 'Chưa cấu hình URL Google Sheet / Web App danh sách lớp học. Vui lòng nhập URL trong Cài đặt.',
    };
  }

  // 1. Thử qua Server proxy
  try {
    const proxyRes = await fetch('/api/fetch-google-sheet-classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
    });

    if (proxyRes.ok) {
      const result = await proxyRes.json();
      if (result.classes && Array.isArray(result.classes) && result.classes.length > 0) {
        return {
          success: true,
          classes: result.classes,
          message: `Đã kết nối thành công! Đã tải ${result.classes.length} lớp học từ Google Sheets.`,
        };
      }
    }
  } catch (err) {
    console.warn('Proxy fetch for online classes failed, attempting direct fetch...', err);
  }

  // 2. Direct fetch fallback
  try {
    const res = await fetch(url.trim());
    if (res.ok) {
      const text = await res.text();
      let classes: OnlineClass[] = [];

      try {
        const json = JSON.parse(text);
        if (json.classes && Array.isArray(json.classes)) {
          classes = json.classes;
        } else if (Array.isArray(json)) {
          classes = json;
        }
      } catch {
        // Parse CSV format if published CSV URL
        classes = parseCsvToClasses(text);
      }

      if (classes.length > 0) {
        return {
          success: true,
          classes,
          message: `Đã đồng bộ ${classes.length} lớp học trực tuyến từ Google Sheets thành công!`,
        };
      }
    }
  } catch (directErr: any) {
    console.error('Direct online classes fetch failed:', directErr);
  }

  return {
    success: false,
    message: 'Không thể đọc dữ liệu lớp học từ URL Google Sheets này. Vui lòng kiểm tra lại URL Web App hoặc link Google Sheet công khai.',
  };
}

function parseCsvToClasses(csvText: string): OnlineClass[] {
  const lines = csvText.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
  const classes: OnlineClass[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map((cell) => cell.replace(/^["']|["']$/g, '').trim());
    if (row.length === 0 || !row[0]) continue;

    const findVal = (keywords: string[]) => {
      for (const kw of keywords) {
        const idx = headers.findIndex((h) => h.includes(kw));
        if (idx !== -1 && row[idx]) return row[idx];
      }
      return '';
    };

    const className = findVal(['lớp', 'classname', 'tên lớp']) || row[1] || `Lớp ${i}`;
    const subject = findVal(['môn', 'subject']) || row[3] || 'Chung';
    const teacher = findVal(['giáo viên', 'thầy', 'cô', 'teacher']) || row[4] || '';
    const schedule = findVal(['lịch', 'thời gian', 'schedule']) || row[5] || '';
    const meetingLink = findVal(['link', 'phòng', 'meet', 'zoom', 'meeting']) || row[6] || '';
    const roomCode = findVal(['mã', 'roomcode', 'id']) || row[8] || '';
    const statusRaw = findVal(['trạng thái', 'status']) || row[10] || 'live';

    let status: 'live' | 'upcoming' | 'ended' = 'live';
    if (statusRaw.toLowerCase().includes('sắp') || statusRaw.toLowerCase().includes('upcoming')) {
      status = 'upcoming';
    } else if (statusRaw.toLowerCase().includes('kết thúc') || statusRaw.toLowerCase().includes('ended')) {
      status = 'ended';
    }

    classes.push({
      id: row[0] || `cls-${i}-${Date.now()}`,
      className,
      grade: findVal(['khối', 'grade']) || '',
      subject,
      teacher,
      schedule,
      meetingLink,
      roomCode,
      status,
      notes: findVal(['ghi chú', 'notes']) || '',
      updatedAt: new Date().toISOString(),
    });
  }

  return classes;
}

