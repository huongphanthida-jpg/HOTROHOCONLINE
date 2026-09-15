import { AppData, SessionRecord, AISimulationItem } from '../types';

/**
 * Service to validate Apps Script URLs and sync full application data with Google Sheets.
 */

export interface GameSessionResult {
  gameId: string;
  gameTitle: string;
  gameType: string;
  studentId?: string;
  studentName?: string;
  score: number;
  totalQuestions: number;
  timeSpent: number;
  completedAt: string;
  details?: any;
}

export const formatTimeSpent = (seconds: number | undefined): string => {
  if (!seconds || seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const encodeSimulationPayload = (payload: AISimulationItem | Record<string, any>): string => {
  try {
    const jsonStr = JSON.stringify(payload);
    return btoa(encodeURIComponent(jsonStr));
  } catch (err) {
    console.error('Failed to encode simulation payload:', err);
    return '';
  }
};

export const decodeSimulationPayload = (encoded: string): AISimulationItem | Record<string, any> | null => {
  try {
    if (!encoded) return null;
    const jsonStr = decodeURIComponent(atob(encoded));
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Failed to decode simulation payload:', err);
    return null;
  }
};

export const validateAppsScriptUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'script.google.com' &&
      parsed.pathname.includes('/exec')
    );
  } catch {
    return false;
  }
};

export function getGoogleScriptUrl(): string {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlFromQuery = params.get('scriptUrl') || params.get('script_url') || params.get('webhookUrl');
      if (urlFromQuery && urlFromQuery.trim().startsWith('http')) {
        const cleaned = urlFromQuery.trim();
        localStorage.setItem('google_script_url', cleaned);
        return cleaned;
      }
    }

    const directUrl = localStorage.getItem('google_script_url') || localStorage.getItem('google_apps_script_url');
    if (directUrl && directUrl.trim().startsWith('http')) return directUrl.trim();

    const appSettingsStr = localStorage.getItem('eduexam_app_settings');
    if (appSettingsStr) {
      const parsed = JSON.parse(appSettingsStr);
      if (parsed.googleAppsScriptUrl && parsed.googleAppsScriptUrl.trim().startsWith('http')) {
        return parsed.googleAppsScriptUrl.trim();
      }
    }

    const sheetConfigStr = localStorage.getItem('eduexam_google_sheet_config');
    if (sheetConfigStr) {
      const parsed = JSON.parse(sheetConfigStr);
      if (parsed.sheetUrl && parsed.sheetUrl.trim().startsWith('http')) {
        return parsed.sheetUrl.trim();
      }
      if (parsed.scriptUrl && parsed.scriptUrl.trim().startsWith('http')) {
        return parsed.scriptUrl.trim();
      }
    }
  } catch (e) {
    console.warn('Error reading google script url:', e);
  }
  return '';
}

export const syncSessionToGoogleSheets = async (
  session: SessionRecord | any,
  scriptUrl?: string
): Promise<{ success: boolean; message: string }> => {
  const targetUrl = scriptUrl || session?.scriptUrl || session?.subject?.scriptUrl || getGoogleScriptUrl();
  if (!targetUrl || !targetUrl.startsWith('http')) {
    console.warn('Chưa có Webhook URL Google Apps Script để đồng bộ.');
    return { success: false, message: 'Chưa cấu hình URL Google Apps Script.' };
  }
  try {
    const payload = {
      action: 'syncSession',
      session,
      type: session.category || 'exam',
      studentName: session.studentInfo?.fullName || session.studentName || 'Học sinh',
      className: session.studentInfo?.className || session.className || 'Chưa xếp lớp',
      groupName: session.studentInfo?.groupName || '',
      subjectName: session.subjectName || session.title || 'Đề kiểm tra',
      score: session.score,
      totalQuestions: session.totalQuestions,
      correctAnswers: session.correctAnswers,
      timeSpent: session.timeSpent,
      submittedAt: session.date || new Date().toLocaleString('vi-VN'),
    };

    await fetch(targetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { success: true, message: 'Đã tự động gửi kết quả làm bài lên Google Sheets!' };
  } catch (err: any) {
    console.error('Error syncing session to Google Sheets:', err);
    return { success: false, message: err.message || 'Lỗi kết nối gửi về Google Sheets.' };
  }
};

export const syncGameResultToGoogleSheets = async (
  result: GameSessionResult | any,
  scriptUrl?: string
): Promise<{ success: boolean; message: string }> => {
  const targetUrl = scriptUrl || result?.scriptUrl || getGoogleScriptUrl();
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return { success: false, message: 'Chưa cấu hình URL Google Apps Script.' };
  }
  try {
    const payload = {
      action: 'syncGameResult',
      result,
      type: 'game',
      gameId: result.gameId,
      gameTitle: result.gameTitle,
      gameType: result.gameType,
      studentName: result.studentInfo?.fullName || result.studentName || 'Học sinh',
      className: result.studentInfo?.className || result.className || 'Chưa xếp lớp',
      score: result.score,
      totalQuestions: result.totalCount || result.totalQuestions,
      correctAnswers: result.correctCount || result.correctAnswers,
      timeSpent: result.timeSpent,
      submittedAt: result.submittedAt || new Date().toLocaleString('vi-VN'),
    };

    await fetch(targetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { success: true, message: 'Đã tự động gửi kết quả trò chơi lên Google Sheets!' };
  } catch (err: any) {
    console.error('Error syncing game result:', err);
    return { success: false, message: err.message || 'Lỗi gửi dữ liệu về Google Sheets.' };
  }
};

export const pullSessionsFromGoogleSheets = async (
  scriptUrl?: string
): Promise<{ success: boolean; sessions?: SessionRecord[]; message: string }> => {
  const targetUrl = scriptUrl || getGoogleScriptUrl();
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return { success: false, message: 'Chưa cấu hình Webhook URL Google Apps Script.' };
  }
  try {
    const fetchUrl = targetUrl.includes('?') ? `${targetUrl}&action=getResults` : `${targetUrl}?action=getResults`;
    const response = await fetch(fetchUrl);
    const data = await response.json();

    const rawList = data.sessions || data.results || data.rows || data.data || (Array.isArray(data) ? data : []);
    if (Array.isArray(rawList) && rawList.length > 0) {
      const parsedSessions: SessionRecord[] = rawList.map((row: any, idx: number) => {
        const studentName = row.studentName || row.fullName || row.student || row['Họ và tên'] || row['Họ tên'] || 'Học sinh';
        const className = row.className || row.class || row['Lớp'] || '12A1';
        const groupName = row.groupName || row.group || row['Nhóm/Tổ'] || row['Tổ'] || 'Tổ 1';
        const subjectName = row.subjectName || row.gameTitle || row.title || row['Nội dung'] || row['Môn học'] || 'Bài tập SGK';
        const score = typeof row.score === 'number' ? row.score : parseFloat(row.score || row['Điểm'] || '0') || 0;
        const totalQuestions = typeof row.totalQuestions === 'number' ? row.totalQuestions : parseInt(row.totalQuestions || row['Tổng số câu'] || '10') || 10;
        const correctAnswers = typeof row.correctAnswers === 'number' ? row.correctAnswers : parseInt(row.correctAnswers || row['Số câu đúng'] || '0') || 0;
        const category = row.category || row.type || (row.gameTitle ? 'game' : 'exam');

        return {
          id: row.id || `sheet-ses-${Date.now()}-${idx}`,
          subjectName,
          category,
          gameTitle: row.gameTitle || subjectName,
          gameType: row.gameType || 'quiz',
          studentInfo: {
            fullName: studentName,
            className,
            groupName,
          },
          score,
          totalQuestions,
          correctAnswers,
          timeSpent: typeof row.timeSpent === 'number' ? row.timeSpent : parseInt(row.timeSpent || '60') || 60,
          date: row.date || row.submittedAt || row['Thời gian'] || new Date().toLocaleString('vi-VN'),
          syncedToGoogleSheets: true,
        };
      });

      return {
        success: true,
        sessions: parsedSessions,
        message: `Đã tải thành công ${parsedSessions.length} kết quả mới nhất từ Google Sheets!`,
      };
    }
    return { success: false, message: 'Không tìm thấy dữ liệu kết quả nào trên Google Sheets.' };
  } catch (err: any) {
    console.error('Error pulling sessions from Google Sheets:', err);
    return { success: false, message: err.message || 'Lỗi kết nối khi tải từ Google Sheets.' };
  }
};

export const pushFullAppDataToGoogleSheets = async (
  appData: AppData | any,
  scriptUrl?: string
): Promise<{ success: boolean; message?: string }> => {
  if (!scriptUrl || !validateAppsScriptUrl(scriptUrl)) {
    return { success: false, message: 'URL Google Apps Script không hợp lệ.' };
  }
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'pushFullData', data: appData }),
    });
    const result = await response.json();
    if (result.status === 'success' || result.success === true) {
      return { success: true, message: 'Đã đẩy toàn bộ dữ liệu lên Google Sheets thành công!' };
    }
    return { success: false, message: result.message || 'Đẩy dữ liệu thất bại.' };
  } catch (err: any) {
    console.error('Error pushing app data to Google Sheets:', err);
    return { success: false, message: err.message || 'Lỗi kết nối với Google Apps Script.' };
  }
};

export const pullFullAppDataFromGoogleSheets = async (
  scriptUrl?: string
): Promise<{ success: boolean; data?: AppData | any; message?: string }> => {
  if (!scriptUrl || !validateAppsScriptUrl(scriptUrl)) {
    return { success: false, message: 'URL Google Apps Script không hợp lệ.' };
  }
  try {
    const response = await fetch(`${scriptUrl}?action=pullFullData`);
    const result = await response.json();
    if ((result.status === 'success' || result.success === true) && result.data) {
      return { success: true, data: result.data, message: 'Đồng bộ dữ liệu thành công!' };
    }
    return { success: false, message: result.message || 'Không tìm thấy dữ liệu trên Google Sheets.' };
  } catch (err: any) {
    console.error('Error pulling app data from Google Sheets:', err);
    return { success: false, message: err.message || 'Lỗi kết nối với Google Apps Script.' };
  }
};

export const fetchOnlineClassesFromGoogleSheets = async (
  scriptUrl?: string
): Promise<{ success: boolean; data?: any[]; message?: string }> => {
  if (!scriptUrl || !validateAppsScriptUrl(scriptUrl)) {
    return { success: false, message: 'URL Apps Script không hợp lệ.' };
  }
  try {
    const response = await fetch(`${scriptUrl}?action=getOnlineClasses`);
    const result = await response.json();
    if ((result.status === 'success' || result.success === true) && result.data) {
      return { success: true, data: result.data };
    }
    return { success: false, message: result.message || 'Không thể lấy dữ liệu lớp học online.' };
  } catch (err: any) {
    console.error('Error fetching online classes:', err);
    return { success: false, message: err.message || 'Lỗi kết nối với Google Apps Script.' };
  }
};

export const APPS_SCRIPT_SAMPLE_CODE = `
// Mã mẫu Google Apps Script hỗ trợ ứng dụng
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
