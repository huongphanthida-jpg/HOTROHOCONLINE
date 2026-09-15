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

export const syncSessionToGoogleSheets = async (
  session: SessionRecord | any,
  scriptUrl?: string
): Promise<boolean> => {
  if (!scriptUrl || !validateAppsScriptUrl(scriptUrl)) {
    console.warn('Invalid Apps Script URL for session sync.');
    return false;
  }
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'syncSession', session }),
    });
    const result = await response.json();
    return result.status === 'success' || result.success === true;
  } catch (err) {
    console.error('Error syncing session to Google Sheets:', err);
    return false;
  }
};

export const syncGameResultToGoogleSheets = async (
  result: GameSessionResult | any,
  scriptUrl?: string
): Promise<boolean> => {
  if (!scriptUrl || !validateAppsScriptUrl(scriptUrl)) {
    return false;
  }
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'syncGameResult', result }),
    });
    const resData = await response.json();
    return resData.status === 'success' || resData.success === true;
  } catch (err) {
    console.error('Error syncing game result:', err);
    return false;
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
