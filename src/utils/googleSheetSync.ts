import * as XLSX from 'xlsx';
import { Student, GoogleSheetConfig, OnlineClass } from '../types';

// TCVN3 (ABC) to Unicode character map
const TCVN3_LOWER_MAP: Record<string, string> = {
  '¸': 'á', 'µ': 'à', '¶': 'ả', '·': 'ã', '¹': 'ạ',
  '¨': 'ă', '¾': 'ắ', '»': 'ằ', '¼': 'ẳ', '½': 'ẵ', 'Æ': 'ặ',
  '©': 'â', 'Ê': 'ấ', 'Ç': 'ầ', 'È': 'ẩ', 'É': 'ẫ', 'Ë': 'ậ',
  '®': 'đ',
  'Ð': 'é', 'Ì': 'è', 'Î': 'ẻ', 'Ï': 'ẽ', 'Ñ': 'ẹ',
  'ª': 'ê', 'Õ': 'ế', 'Ò': 'ề', 'Ó': 'ể', 'Ô': 'ễ', 'Ö': 'ệ',
  'Ý': 'í', '×': 'ì', 'Ø': 'ỉ', 'Ü': 'ĩ', 'Þ': 'ị',
  'ã': 'ó', 'ß': 'ò', 'á': 'ỏ', 'â': 'õ', 'ä': 'ọ',
  '«': 'ô', 'è': 'ố', 'é': 'ồ', 'ê': 'ổ', 'ë': 'ỗ', 'í': 'ộ',
  '¬': 'ơ', 'ó': 'ớ', 'ï': 'ờ', 'ñ': 'ở', 'ò': 'ỡ', 'ô': 'ợ',
  'ú': 'ú', 'ù': 'ù', 'û': 'ủ', 'ü': 'ũ', 'ý': 'ụ',
  '­': 'ư', 'ø': 'ứ', 'ö': 'ừ', '÷': 'ử',
  'ỳ': 'ỳ', 'ỷ': 'ỷ', 'ỹ': 'ỹ', 'ỵ': 'ỵ',
};

// VNI-Windows to Unicode pairs
const VNI_PAIRS: [string, string][] = [
  ['aù', 'á'], ['aø', 'à'], ['aû', 'ả'], ['aõ', 'ã'], ['aï', 'ạ'],
  ['aê', 'ă'], ['aé', 'ắ'], ['aè', 'ằ'], ['aú', 'ẳ'], ['aü', 'ẵ'], ['aë', 'ặ'],
  ['aâ', 'â'], ['aá', 'ấ'], ['aà', 'ầ'], ['aå', 'ẩ'], ['aã', 'ẫ'], ['aä', 'ậ'],
  ['eù', 'é'], ['eø', 'è'], ['eû', 'ẻ'], ['eõ', 'ẽ'], ['eï', 'ẹ'],
  ['eâ', 'ê'], ['eá', 'ế'], ['eà', 'ề'], ['eå', 'ể'], ['eã', 'ễ'], ['eä', 'ệ'],
  ['où', 'ó'], ['oø', 'ò'], ['oû', 'ỏ'], ['oõ', 'õ'], ['oï', 'ọ'],
  ['oâ', 'ô'], ['oá', 'ố'], ['oà', 'ồ'], ['oå', 'ổ'], ['oã', 'ỗ'], ['oä', 'ộ'],
  ['ôù', 'ớ'], ['ôø', 'ờ'], ['ôû', 'ở'], ['ôõ', 'ỡ'], ['ôï', 'ợ'], ['ô', 'ơ'],
  ['uù', 'ú'], ['uø', 'ù'], ['uû', 'ủ'], ['uõ', 'ũ'], ['uï', 'ụ'],
  ['öù', 'ứ'], ['öø', 'ừ'], ['öû', 'ử'], ['öõ', 'ữ'], ['öï', 'ự'], ['ö', 'ư'],
  ['í', 'í'], ['ì', 'ì'], ['æ', 'ỉ'], ['ó', 'ĩ'], ['ò', 'ị'],
  ['yù', 'ý'], ['yø', 'ỳ'], ['yû', 'ỷ'], ['yõ', 'ỹ'], ['î', 'ỵ'],
  ['ñ', 'đ'],
  ['AÙ', 'Á'], ['AØ', 'À'], ['AÛ', 'Ả'], ['AÕ', 'Ã'], ['AÏ', 'Ạ'],
  ['AÊ', 'Ă'], ['AÉ', 'Ắ'], ['AÈ', 'Ằ'], ['AÚ', 'Ẳ'], ['AÜ', 'Ẵ'], ['AË', 'Ặ'],
  ['AÂ', 'Â'], ['AÁ', 'Ấ'], ['AÀ', 'Ầ'], ['AÅ', 'Ẩ'], ['AÃ', 'Ẫ'], ['AÄ', 'Ậ'],
  ['EÙ', 'É'], ['EØ', 'È'], ['EÛ', 'Ẻ'], ['EÕ', 'Ẽ'], ['EÏ', 'Ẹ'],
  ['EÂ', 'Ê'], ['EÁ', 'Ế'], ['EÀ', 'Ề'], ['EÅ', 'Ể'], ['EÃ', 'Ễ'], ['EÄ', 'Ệ'],
  ['OÙ', 'Ó'], ['OØ', 'Ò'], ['OÛ', 'Ỏ'], ['OÕ', 'Õ'], ['OÏ', 'Ọ'],
  ['OÂ', 'Ô'], ['OÁ', 'Ố'], ['OÀ', 'Ồ'], ['OÅ', 'Ổ'], ['OÃ', 'Ỗ'], ['OÄ', 'Ộ'],
  ['ÔÙ', 'Ớ'], ['ÔØ', 'Ờ'], ['ÔÛ', 'Ở'], ['ÔÕ', 'Ỡ'], ['ÔÏ', 'Ợ'], ['Ô', 'Ơ'],
  ['UÙ', 'Ú'], ['UØ', 'Ù'], ['UÛ', 'Ủ'], ['UÕ', 'Ũ'], ['UÏ', 'Ụ'],
  ['ÖÙ', 'Ứ'], ['ÖØ', 'Ừ'], ['ÖÛ', 'Ử'], ['ÖÕ', 'Ữ'], ['ÖÏ', 'Ự'], ['Ö', 'Ư'],
  ['Í', 'Í'], ['Ì', 'Ì'], ['Æ', 'Ỉ'], ['Ó', 'Ĩ'], ['Ò', 'Ị'],
  ['YÙ', 'Ý'], ['YØ', 'Ỳ'], ['YÛ', 'Ỷ'], ['YÕ', 'Ỹ'], ['Î', 'Ỵ'],
  ['Ñ', 'Đ'],
];

export function convertTCVN3ToUnicode(text: string): string {
  if (!text) return text;
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += TCVN3_LOWER_MAP[char] || char;
  }
  return result.normalize('NFC');
}

export function convertVNIToUnicode(text: string): string {
  if (!text) return text;
  let result = text;
  for (const [vniChar, uniChar] of VNI_PAIRS) {
    result = result.split(vniChar).join(uniChar);
  }
  return result.normalize('NFC');
}

export function repairVietnameseMojibake(text: string): string {
  if (!text) return text;
  try {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code > 255) return text;
      bytes[i] = code;
    }
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return decoded.normalize('NFC');
  } catch {
    return text.normalize('NFC');
  }
}

const VIETNAMESE_WORD_REPAIR_MAP: Record<string, string> = {
  'nguy?n': 'Nguyễn', 'nguyn': 'Nguyễn', 'nguyen': 'Nguyễn',
  'tr?n': 'Trần', 'trn': 'Trần', 'tran': 'Trần',
  'l?': 'Lê', 'le': 'Lê',
  'ph?m': 'Phạm', 'phm': 'Phạm', 'pham': 'Phạm',
  'ho?ng': 'Hoàng', 'hong': 'Hoàng', 'hoang': 'Hoàng',
  'hu?nh': 'Huỳnh', 'hunh': 'Huỳnh', 'huynh': 'Huỳnh',
  'phan': 'Phan', 'v?': 'Vũ', 'vu': 'Vũ', 'd?ng': 'Đặng',
  'b?i': 'Bùi', 'bi': 'Bùi', 'bui': 'Bùi', 'd?': 'Đỗ', 'do': 'Đỗ',
  'h?': 'Hồ', 'ho': 'Hồ', 'ng?': 'Ngô', 'ngo': 'Ngô',
  'phuong': 'Phương', 'anh': 'Anh', 'th?i': 'Thái', 'b?o': 'Bảo',
  'ng?c': 'Ngọc', 'thi?n': 'Thiện', 'b?nh': 'Bình', 'th?': 'Thị',
  'thanh': 'Thanh', 'di?m': 'Diễm', 'dung': 'Dũng', 'huy': 'Huy',
  'h?ng': 'Hùng', 'hung': 'Hùng', 'ha': 'Hà', '?c': 'Đức', 'duc': 'Đức',
  'minh': 'Minh', 'nam': 'Nam', 'qu?c': 'Quốc', 'quoc': 'Quốc',
  'trang': 'Trang', 'thu': 'Thu', 'tu?n': 'Tuấn', 'tuan': 'Tuấn',
  'kh?nh': 'Khánh', 'h??ng': 'Hương', 'linh': 'Linh', 'lan': 'Lan',
  't?m': 'Tâm', 'th?o': 'Thảo', 'vinh': 'Vinh', 'vi?t': 'Việt',
  'ti?n': 'Tiến', 'long': 'Long', 'h?i': 'Hải', 'ph?c': 'Phúc',
};

export function repairVietnameseWord(word: string): string {
  if (!word) return word;
  const trimmed = word.trim();
  const lower = trimmed.toLowerCase();
  if (VIETNAMESE_WORD_REPAIR_MAP[lower]) {
    const fixed = VIETNAMESE_WORD_REPAIR_MAP[lower];
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 1) return fixed.toUpperCase();
    if (trimmed[0] && trimmed[0] === trimmed[0].toUpperCase()) return fixed.charAt(0).toUpperCase() + fixed.slice(1);
    return fixed;
  }
  let fixed = trimmed;
  fixed = fixed.replace(/Nguy\?n/gi, 'Nguyễn');
  fixed = fixed.replace(/Tr\?n/gi, 'Trần');
  fixed = fixed.replace(/Ph\?m/gi, 'Phạm');
  fixed = fixed.replace(/Ho\?ng/gi, 'Hoàng');
  fixed = fixed.replace(/Hu\?nh/gi, 'Huỳnh');
  fixed = fixed.replace(/Di\?m/gi, 'Diễm');
  fixed = fixed.replace(/Tu\?n/gi, 'Tuấn');
  fixed = fixed.replace(/Qu\?c/gi, 'Quốc');
  fixed = fixed.replace(/Kh\?nh/gi, 'Khánh');
  fixed = fixed.replace(/B\?nh/gi, 'Bình');
  return fixed;
}

export function autoRepairVietnameseText(input: string): string {
  if (!input || typeof input !== 'string') return input;
  let str = input.trim();
  if (!str) return str;
  if (/[\u00C0-\u00FF]{2,}/.test(str)) str = repairVietnameseMojibake(str);
  if (/[a-zA-Z][ùøûõïéèáàåä]/.test(str)) str = convertVNIToUnicode(str);
  if (/[\u00B8\u00B5\u00B6\u00B7\u00B9\u00A8\u00A9\u00AE\u00AA\u00AB\u00AC]/.test(str)) str = convertTCVN3ToUnicode(str);

  const tokens = str.split(/(\s+|[.,;:\-_/()]+)/);
  const repairedTokens = tokens.map((token) => {
    if (/^\s+$/.test(token) || /^[.,;:\-_/()]+$/.test(token)) return token;
    return repairVietnameseWord(token);
  });
  return repairedTokens.join('').normalize('NFC');
}

export function hasFontCorruption(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  if (text.includes('')) return true;
  if (/[a-zA-Z]\?[a-zA-Z]/.test(text)) return true;
  if (/[\u00B8\u00B5\u00B6\u00B7\u00B9\u00A8\u00A9\u00AE\u00AA\u00AB\u00AC]/.test(text)) return true;
  if (/[a-zA-Z][ùøûõïéèáàåä]/.test(text)) return true;
  if (/[\u00C0-\u00FF]{2,}/.test(text)) return true;
  return false;
}

export function repairStudentData(
  student: Student,
  mode: 'auto' | 'tcvn3' | 'vni' | 'mojibake' = 'auto'
): Student {
  const repair = (str: string): string => {
    if (!str) return str;
    if (mode === 'tcvn3') return convertTCVN3ToUnicode(str);
    if (mode === 'vni') return convertVNIToUnicode(str);
    if (mode === 'mojibake') return repairVietnameseMojibake(str);
    return autoRepairVietnameseText(str);
  };
  const isFemale = (student.gender as string) === 'Nữ' || (student.gender as string) === 'Nu';
  return {
    ...student,
    name: repair(student.name),
    gender: isFemale ? 'Nữ' : 'Nam',
    address: repair(student.address),
    strengths: repair(student.strengths),
    careerAspiration: repair(student.careerAspiration),
    healthNote: repair(student.healthNote),
    emergencyContact: {
      ...student.emergencyContact,
      parentName: repair(student.emergencyContact?.parentName || ''),
      workplace: repair(student.emergencyContact?.workplace || ''),
      relationship: student.emergencyContact?.relationship || 'Bố',
    },
  };
}
import { extractStructuredSheet, getRowValue } from './excelParser';

/**
 * Converts standard Google Sheet share URLs into public CSV export endpoints
 */
export function getGoogleSheetCsvUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (
    trimmed.includes('export?format=csv') ||
    trimmed.includes('/gviz/tq?tqx=out:csv') ||
    trimmed.includes('/pub?output=csv')
  ) {
    return trimmed;
  }

  let gid = '';
  const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
  if (gidMatch) {
    gid = gidMatch[1];
  }

  // Published sheet: /d/e/PUB_ID/
  const pubMatch = trimmed.match(/\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (pubMatch) {
    const pubId = pubMatch[1];
    return `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv${gid ? `&gid=${gid}` : ''}`;
  }

  // Standard sheet: /d/SHEET_ID/
  const idMatch = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (idMatch) {
    const sheetId = idMatch[1];
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
  }

  return trimmed;
}

/**
 * Sample Google Sheet URL for instant testing
 */
export const SAMPLE_GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing';

/**
 * Fetches online CSV from Google Sheets and parses it into Student objects
 */
export async function fetchStudentsFromGoogleSheet(sheetUrl: string): Promise<Student[]> {
  const csvUrl = getGoogleSheetCsvUrl(sheetUrl);
  if (!csvUrl) {
    throw new Error('Đường dẫn Google Sheet không hợp lệ. Vui lòng dán đúng liên kết Google Sheets.');
  }

  let csvText = '';

  // 1. Direct browser fetch
  try {
    const res = await fetch(csvUrl, { mode: 'cors' });
    if (res.ok) {
      csvText = await res.text();
    }
  } catch {
    // CORS or network fallback
  }

  // 2. Server proxy fallback if browser fetch failed
  if (!csvText) {
    try {
      const proxyRes = await fetch('/api/sync-google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: csvUrl }),
      });
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        if (proxyData.csvText) {
          csvText = proxyData.csvText;
        }
      }
    } catch {
      // proxy fallback error
    }
  }

  if (!csvText) {
    throw new Error(
      'Không thể tải dữ liệu từ Google Sheet. Vui lòng mở Google Sheet -> chọn "Chia sẻ" (Share) -> bật "Bất kỳ ai có liên kết đều có thể xem" (Anyone with the link can view).'
    );
  }

  const workbook = XLSX.read(csvText, { type: 'string', raw: false });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Không đọc được bảng dữ liệu từ Google Sheet.');
  }

  const { rows: rawRows } = extractStructuredSheet(workbook, 'auto');
  if (!rawRows || rawRows.length === 0) {
    throw new Error('Bảng tính Google Sheet trống hoặc không tìm thấy dòng dữ liệu học sinh.');
  }

  const validStudents: Student[] = rawRows
    .map((row, idx) => transformRowToStudent(row, idx))
    .filter((s): s is Student => s !== null);

  if (validStudents.length === 0) {
    throw new Error(
      'Không thể nhận diện danh sách học sinh. Kiểm tra lại hàng tiêu đề Google Sheet có các cột như "Họ và Tên", "Mã HS", "Giới tính", "Ngày sinh", "Tổ"...'
    );
  }

  return validStudents;
}

/**
 * Transform raw Google Sheet row into a clean Student object
 */
function transformRowToStudent(row: any, index: number): Student | null {
  const getVal = (keys: string[]) => getRowValue(row, keys);
  const cleanStr = (val: any) => (val ? autoRepairVietnameseText(String(val).trim()) : '');

  const rawCode = getVal(['mã hs', 'mã học sinh', 'ma hs', 'code', 'id', 'mshs', 'stt']);
  const rawName = getVal(['họ và tên', 'họ tên', 'tên', 'tên học sinh', 'name', 'full name', 'fullname']);

  if (!rawName && !rawCode) return null;

  const name = rawName ? cleanStr(rawName) : `Học sinh ${index + 1}`;
  const code = rawCode ? String(rawCode).trim() : `GVCN-${(index + 1).toString().padStart(2, '0')}`;

  const rawGender = getVal(['giới tính', 'gioi tinh', 'phái', 'gender', 'sex']);
  const isFemale =
    rawGender &&
    (String(rawGender).toLowerCase().includes('nữ') ||
      String(rawGender).toLowerCase().includes('nu') ||
      String(rawGender).toLowerCase() === 'f');
  const gender = isFemale ? 'Nữ' : 'Nam';

  const rawDob = getVal(['ngày sinh', 'ngay sinh', 'dob', 'birthday', 'birth date']);
  const dob = rawDob ? String(rawDob).trim() : '15/03/2008';

  const rawGroup = getVal(['tổ', 'to', 'group', 'tổ thi đua']);
  let group: 1 | 2 | 3 | 4 = 1;
  if (rawGroup) {
    const parsedG = parseInt(String(rawGroup).replace(/[^0-9]/g, ''), 10);
    if (parsedG >= 1 && parsedG <= 4) group = parsedG as any;
  }

  const rawPhone = getVal(['sđt', 'sdt', 'số điện thoại', 'điện thoại', 'phone', 'tel']);
  const phone = rawPhone ? String(rawPhone).trim() : '';

  const rawEmail = getVal(['email', 'thư điện tử', 'mail']);
  const email = rawEmail ? String(rawEmail).trim() : '';

  const rawAddress = getVal(['địa chỉ', 'dia chi', 'address', 'nơi ở']);
  const address = rawAddress ? cleanStr(rawAddress) : '';

  const rawStrengths = getVal(['sở trường năng khiếu', 'sở trường', 'năng khiếu', 'strengths']);
  const strengths = rawStrengths ? cleanStr(rawStrengths) : '';

  const rawCareer = getVal(['định hướng nghề nghiệp', 'định hướng', 'nguyện vọng', 'career']);
  const careerAspiration = rawCareer ? cleanStr(rawCareer) : '';

  const rawHealth = getVal(['ghi chú sức khỏe', 'sức khỏe', 'suc khoe', 'health note']);
  const healthNote = rawHealth ? cleanStr(rawHealth) : '';

  const rawParentName = getVal(['họ tên phụ huynh', 'phụ huynh', 'tên phụ huynh', 'parent']);
  const parentName = rawParentName ? cleanStr(rawParentName) : '';

  const rawRel = getVal(['quan hệ', 'mối quan hệ', 'relationship']);
  let relationship: 'Bố' | 'Mẹ' | 'Người giám hộ' = 'Bố';
  if (rawRel && (String(rawRel).toLowerCase().includes('mẹ') || String(rawRel).toLowerCase().includes('me'))) {
    relationship = 'Mẹ';
  }

  const rawParentPhone = getVal(['sđt phụ huynh', 'sđt ph', 'số điện thoại phụ huynh', 'parent phone']);
  const parentPhone = rawParentPhone ? String(rawParentPhone).trim() : '';

  const rawWorkplace = getVal(['nơi công tác phụ huynh', 'nơi công tác', 'workplace']);
  const workplace = rawWorkplace ? cleanStr(rawWorkplace) : '';

  const rawGpa = getVal(['đtb khối a', 'đtb', 'điểm tb', 'gpa', 'dtb']);
  const gpa = rawGpa ? Number(parseFloat(String(rawGpa)).toFixed(2)) : 8.5;

  const rawConduct = getVal(['hạnh kiểm', 'rèn luyện', 'conduct']);
  let conductRating: 'Tốt' | 'Khá' | 'Trung bình' | 'Yếu' = 'Tốt';
  if (rawConduct && (String(rawConduct).toLowerCase().includes('khá') || String(rawConduct).toLowerCase().includes('kha'))) {
    conductRating = 'Khá';
  }

  const defaultAvatar =
    gender === 'Nữ'
      ? `https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80`
      : `https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80`;

  const id = code.toLowerCase().replace(/[^a-z0-9]/g, '-') || `std-${Date.now()}-${index}`;

  return {
    id,
    code,
    name,
    gender,
    dob,
    group,
    avatar: defaultAvatar,
    phone,
    email,
    address,
    strengths,
    careerAspiration,
    healthNote,
    emergencyContact: {
      parentName,
      relationship,
      phone: parentPhone,
      workplace,
    },
    grades: {
      math: { tx1: gpa, tx2: gpa, gk: gpa, ck: gpa, avg: gpa },
      physics: { tx1: gpa, tx2: gpa, gk: gpa, ck: gpa, avg: gpa },
      chemistry: { tx1: gpa, tx2: gpa, gk: gpa, ck: gpa, avg: gpa },
      biology: { tx1: 8.5, tx2: 8.5, gk: 8.5, ck: 8.5, avg: 8.5 },
      literature: { tx1: 8.0, tx2: 8.0, gk: 8.0, ck: 8.0, avg: 8.0 },
      english: { tx1: 8.5, tx2: 8.5, gk: 8.5, ck: 8.5, avg: 8.5 },
      gpa,
    },
    progressHistory: [
      { period: 'Tháng 9', math: Math.max(0, gpa - 0.5), physics: Math.max(0, gpa - 0.4), chemistry: Math.max(0, gpa - 0.6) },
      { period: 'Giữa HK1', math: Math.max(0, gpa - 0.2), physics: Math.max(0, gpa - 0.1), chemistry: Math.max(0, gpa - 0.3) },
      { period: 'Cuối HK1', math: gpa, physics: gpa, chemistry: gpa },
    ],
    conductScore: conductRating === 'Tốt' ? 100 : 85,
    conductRating,
    violationsCount: 0,
    commendationsCount: 1,
    absenceCount: 0,
    violations: [],
    commendations: ['Gia nhập tập thể lớp'],
  };
}

/**
 * Sample Google Sheet URL for online class database
 */
export const SAMPLE_ONLINE_CLASS_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing';

/**
 * Fetches online CSV from Google Sheets and parses it into OnlineClass objects
 */
export async function fetchOnlineClassesFromGoogleSheet(sheetUrl: string): Promise<OnlineClass[]> {
  const csvUrl = getGoogleSheetCsvUrl(sheetUrl);
  if (!csvUrl) {
    throw new Error('Đường dẫn Google Sheet không hợp lệ. Vui lòng dán đúng liên kết Google Sheets.');
  }

  let csvText = '';

  // 1. Direct browser fetch
  try {
    const res = await fetch(csvUrl, { mode: 'cors' });
    if (res.ok) {
      csvText = await res.text();
    }
  } catch {
    // CORS or network fallback
  }

  // 2. Server proxy fallback if browser fetch failed
  if (!csvText) {
    try {
      const proxyRes = await fetch('/api/sync-google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: csvUrl }),
      });
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        if (proxyData.csvText) {
          csvText = proxyData.csvText;
        }
      }
    } catch {
      // proxy fallback error
    }
  }

  if (!csvText) {
    throw new Error(
      'Không thể tải dữ liệu từ Google Sheet. Vui lòng mở Google Sheet -> chọn "Chia sẻ" (Share) -> bật "Bất kỳ ai có liên kết đều có thể xem" (Anyone with the link can view).'
    );
  }

  const workbook = XLSX.read(csvText, { type: 'string', raw: false });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Không đọc được bảng dữ liệu từ Google Sheet.');
  }

  const { rows: rawRows } = extractStructuredSheet(workbook, 'auto');
  if (!rawRows || rawRows.length === 0) {
    throw new Error('Bảng tính Google Sheet trống hoặc không tìm thấy dòng dữ liệu lớp học trực tuyến.');
  }

  const validClasses: OnlineClass[] = rawRows
    .map((row, idx) => transformRowToOnlineClass(row, idx))
    .filter((c): c is OnlineClass => c !== null);

  if (validClasses.length === 0) {
    return generateDefaultOnlineClassesFromSheet(rawRows);
  }

  return validClasses;
}

function transformRowToOnlineClass(row: any, index: number): OnlineClass | null {
  const getVal = (keys: string[]) => getRowValue(row, keys);
  const cleanStr = (val: any) => (val ? autoRepairVietnameseText(String(val).trim()) : '');

  const rawClassName = getVal(['tên lớp', 'tên môn', 'môn học', 'lớp học', 'tên lớp học', 'class name', 'subject', 'lớp']);
  const rawTeacher = getVal(['giáo viên', 'thuyết giảng', 'gv', 'gvbm', 'giáo viên phụ trách', 'teacher']);

  if (!rawClassName && !rawTeacher) return null;

  const className = rawClassName ? cleanStr(rawClassName) : `Lớp Trực Tuyến Chuyên Đề ${index + 1}`;
  const teacherName = rawTeacher ? cleanStr(rawTeacher) : 'Thầy Nguyễn Văn An';

  const rawSubject = getVal(['môn', 'môn học', 'subject', 'chuyên môn']);
  const subject = rawSubject ? cleanStr(rawSubject) : detectSubjectFromName(className);

  const rawSchedule = getVal(['thời gian', 'lịch học', 'thời gian học', 'schedule', 'lịch']);
  const scheduleTime = rawSchedule ? cleanStr(rawSchedule) : 'Thứ 2 & Thứ 5 (19:30 - 21:00)';

  const rawPlatform = getVal(['nền tảng', 'phần mềm', 'platform', 'app']);
  let platform: OnlineClass['platform'] = 'Google Meet';
  if (rawPlatform) {
    const pStr = String(rawPlatform).toLowerCase();
    if (pStr.includes('zoom')) platform = 'Zoom';
    else if (pStr.includes('team')) platform = 'MS Teams';
    else if (pStr.includes('youtube') || pStr.includes('live')) platform = 'YouTube Live';
    else if (pStr.includes('k12')) platform = 'K12Online';
  }

  const rawLink = getVal(['link', 'đường dẫn', 'url', 'link lớp', 'meet link', 'zoom link', 'link meet', 'link zoom']);
  const meetLink = rawLink && String(rawLink).startsWith('http')
    ? String(rawLink).trim()
    : platform === 'Zoom'
    ? 'https://zoom.us/j/9876543210'
    : 'https://meet.google.com/abc-defg-hij';

  const rawPasscode = getVal(['mã phòng', 'passcode', 'mật khẩu', 'password', 'id phòng']);
  const passcode = rawPasscode ? String(rawPasscode).trim() : 'Mật khẩu: 123456';

  const rawStatus = getVal(['trạng thái', 'status', 'tình trạng']);
  let status: OnlineClass['status'] = 'upcoming';
  if (rawStatus) {
    const sStr = String(rawStatus).toLowerCase();
    if (sStr.includes('đang') || sStr.includes('live') || sStr.includes('diễn ra')) status = 'live';
    else if (sStr.includes('xong') || sStr.includes('hoàn thành') || sStr.includes('kết thúc')) status = 'ended';
  } else if (index === 0) {
    status = 'live';
  }

  const rawNotes = getVal(['ghi chú', 'lưu ý', 'notes', 'nội dung']);
  const notes = rawNotes ? cleanStr(rawNotes) : 'Mở camera & chuẩn bị vở ghi chép chuyên đề.';

  const rawDoc = getVal(['tài liệu', 'document', 'drive', 'link bài tập']);
  const documentUrl = rawDoc ? String(rawDoc).trim() : undefined;

  return {
    id: `online-class-${Date.now()}-${index}`,
    className,
    subject,
    teacherName,
    scheduleTime,
    platform,
    meetLink,
    passcode,
    status,
    notes,
    documentUrl,
    lastSyncedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN'),
  };
}

function detectSubjectFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('toán')) return 'Toán Học';
  if (lower.includes('lý') || lower.includes('vật lý')) return 'Vật Lý';
  if (lower.includes('hóa')) return 'Hóa Học';
  if (lower.includes('sinh')) return 'Sinh Học';
  if (lower.includes('văn')) return 'Ngữ Văn';
  if (lower.includes('anh') || lower.includes('english')) return 'Tiếng Anh';
  return 'Khoa Học Tự Nhiên';
}

function generateDefaultOnlineClassesFromSheet(_rows: any[]): OnlineClass[] {
  return [
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
}

export {
  validateAppsScriptUrl,
  getGoogleScriptUrl,
  syncSessionToGoogleSheets,
  syncGameResultToGoogleSheets,
  pullSessionsFromGoogleSheets,
  pushFullAppDataToGoogleSheets,
  pullFullAppDataFromGoogleSheets,
} from '../services/sheetSyncService';
