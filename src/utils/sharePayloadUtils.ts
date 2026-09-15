import { Subject, Question, EducationalGame, AISimulationItem } from '../types';

function toBase64Url(str: string): string {
  try {
    const bytes = new TextEncoder().encode(str);
    const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return encodeURIComponent(str);
  }
}

function fromBase64Url(str: string): string {
  if (!str) return '';
  try {
    let cleaned = str;
    try {
      cleaned = decodeURIComponent(str);
    } catch {
      cleaned = str;
    }

    let base64 = cleaned.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';

    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    try {
      return decodeURIComponent(str);
    } catch {
      return str;
    }
  }
}

export function detectSubjectType(subject: Partial<Subject>): string {
  if (subject.subjectType && subject.subjectType.trim()) return subject.subjectType.trim();
  const rawText = `${subject.name || ''} ${subject.description || ''} ${subject.id || ''}`;
  const text = rawText
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (text.includes('hoa') || text.includes('chem')) return 'Hóa học';
  if (text.includes('ly') || text.includes('phys')) return 'Vật lý';
  if (text.includes('sinh') || text.includes('bio')) return 'Sinh học';
  if (text.includes('anh') || text.includes('eng')) return 'Tiếng Anh';
  if (text.includes('su') || text.includes('his')) return 'Lịch sử';
  if (text.includes('dia') || text.includes('geo')) return 'Địa lý';
  if (text.includes('tin') || text.includes('info')) return 'Tin học';
  if (text.includes('gdcd') || text.includes('cong dan')) return 'GDCD';
  return 'Toán học';
}

export function extractGrade(subject: Partial<Subject>): string {
  if (subject.grade && subject.grade.trim()) return subject.grade.trim();
  const text = `${subject.name || ''} ${subject.description || ''} ${subject.className || ''} ${subject.id || ''}`;
  if (text.includes('12')) return '12';
  if (text.includes('11')) return '11';
  return '10';
}

export function extractClassName(subject: Partial<Subject>): string {
  if (subject.className && subject.className.trim()) return subject.className.trim();
  const text = `${subject.name || ''} ${subject.description || ''} ${subject.id || ''}`;
  const match = text.match(/1[012][A-Z0-9]+/i);
  if (match) return match[0].toUpperCase();
  const grade = extractGrade(subject);
  return grade === '12' ? '12D1' : grade === '11' ? '11A2' : '10T2';
}

export function buildSlugSubjectId(stype: string, cname: string): string {
  const normStype = (stype || 'Hoa_hoc')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_');
  const normCname = (cname || '11A2').replace(/[^a-zA-Z0-9]/g, '');
  const rand = Math.random().toString(36).substring(2, 7);
  return `sub-custom-${normStype}_${normCname}-${Date.now()}-${rand}`;
}

export function encodeSimulationPayload(sim: AISimulationItem): string {
  try {
    const compactSim = {
      i: sim.id,
      t: sim.title,
      s: sim.subject,
      d: sim.description || '',
      c: sim.code,
    };
    const jsonStr = JSON.stringify(compactSim);
    if (typeof window !== 'undefined' && (window as any).LZString) {
      return `lz_sim_${(window as any).LZString.compressToEncodedURIComponent(jsonStr)}`;
    }
    return `lz_sim_${btoa(unescape(encodeURIComponent(jsonStr)))}`;
  } catch (e) {
    console.warn('Error encoding simulation payload:', e);
    return '';
  }
}

export function decodeSimulationPayload(payloadStr: string): AISimulationItem | null {
  try {
    if (!payloadStr) return null;
    let jsonStr = '';
    if (payloadStr.startsWith('lz_sim_')) {
      const rawLz = payloadStr.slice(7);
      if (typeof window !== 'undefined' && (window as any).LZString) {
        jsonStr = (window as any).LZString.decompressFromEncodedURIComponent(rawLz);
      }
      if (!jsonStr) {
        try { jsonStr = decodeURIComponent(escape(atob(rawLz))); } catch {}
      }
    } else if (payloadStr.startsWith('lz_')) {
      const rawLz = payloadStr.slice(3);
      if (typeof window !== 'undefined' && (window as any).LZString) {
        jsonStr = (window as any).LZString.decompressFromEncodedURIComponent(rawLz);
      }
      if (!jsonStr) {
        try { jsonStr = decodeURIComponent(escape(atob(rawLz))); } catch {}
      }
    } else {
      try {
        if (typeof window !== 'undefined' && (window as any).LZString) {
          jsonStr = (window as any).LZString.decompressFromEncodedURIComponent(payloadStr);
        }
        if (!jsonStr) jsonStr = decodeURIComponent(escape(atob(payloadStr)));
      } catch {
        jsonStr = payloadStr;
      }
    }

    if (!jsonStr) return null;
    const parsed = JSON.parse(jsonStr);

    if (parsed.id && parsed.code) {
      return parsed as AISimulationItem;
    }

    if (parsed.i && parsed.c) {
      return {
        id: parsed.i,
        title: parsed.t || 'Mô phỏng thí nghiệm AI',
        subject: parsed.s || 'Vật Lý',
        description: parsed.d || '',
        code: parsed.c,
        createdAt: new Date().toISOString(),
      };
    }
    return null;
  } catch (e) {
    console.warn('Error decoding simulation payload:', e);
    return null;
  }
}

export function generateFallbackQuestionsBySubject(subject: Partial<Subject>): Question[] {
  const subId = subject.id || `sub-gen-${Date.now()}`;
  const stype = detectSubjectType(subject);
  const cname = extractClassName(subject);
  const subName = subject.name || `${stype} lớp ${cname} - Đề kiểm tra định kỳ`;

  if (stype === 'Vật lý') {
    return [
      {
        id: `q-${subId}-1`,
        subjectId: subId,
        content: `Câu 1 (Vật lý ${cname}): Đơn vị đo cường độ điện trường trong hệ SI là:`,
        type: 'multiple_choice' as const,
        options: ['Vôn trên mét (V/m)', 'Cu-lông (C)', 'Vôn (V)', 'Ampe (A)'],
        correctAnswer: 0,
        explanation: 'Cường độ điện trường E có đơn vị là V/m.',
        difficulty: 'easy' as const,
        topic: subName,
      },
      {
        id: `q-${subId}-2`,
        subjectId: subId,
        content: `Câu 2 (Vật lý ${cname}): Một vật dao động điều hòa với chu kỳ T = 2s. Tần số f của dao động là:`,
        type: 'multiple_choice' as const,
        options: ['0.5 Hz', '2 Hz', '1 Hz', '4 Hz'],
        correctAnswer: 0,
        explanation: 'Tần số f = 1 / T = 1 / 2 = 0.5 Hz.',
        difficulty: 'easy' as const,
        topic: subName,
      },
      {
        id: `q-${subId}-3`,
        subjectId: subId,
        content: `Câu 3 (Vật lý ${cname}): Cho đoạn mạch điện có điện trở R = 10 Ω, hiệu điện thế U = 20 V. Cường độ dòng điện I là:`,
        type: 'multiple_choice' as const,
        options: ['2 A', '0.5 A', '200 A', '10 A'],
        correctAnswer: 0,
        explanation: 'Theo định luật Ohm: I = U / R = 20 / 10 = 2 A.',
        difficulty: 'easy' as const,
        topic: subName,
      },
      {
        id: `q-${subId}-4`,
        subjectId: subId,
        content: `Câu 4 (Vật lý ${cname}): Tốc độ truyền ánh sáng trong chân không có giá trị xấp xỉ là:`,
        type: 'multiple_choice' as const,
        options: ['3 × 10⁸ m/s', '3 × 10⁵ m/s', '3 × 10⁶ m/s', '300 m/s'],
        correctAnswer: 0,
        explanation: 'Tốc độ ánh sáng trong chân không c ≈ 3 × 10⁸ m/s.',
        difficulty: 'easy' as const,
        topic: subName,
      },
      {
        id: `q-${subId}-5`,
        subjectId: subId,
        content: `Câu 5 (Vật lý ${cname}): Sóng cơ học KHÔNG thể truyền được trong môi trường nào?`,
        type: 'multiple_choice' as const,
        options: ['Môi trường chân không', 'Môi trường chất rắn', 'Môi trường chất lỏng', 'Môi trường chất khí'],
        correctAnswer: 0,
        explanation: 'Sóng cơ học cần môi trường vật chất đàn hồi để truyền, không truyền được trong chân không.',
        difficulty: 'easy' as const,
        topic: subName,
      },
    ];
  }

  if (stype === 'Sinh học') {
    return [
      {
        id: `q-${subId}-1`,
        subjectId: subId,
        content: `Câu 1 (Sinh học ${cname}): Bào quan nào sau đây giữ vai trò là "nhà máy năng lượng" của tế bào nhân thực?`,
        type: 'multiple_choice' as const,
        options: ['Ti thể', 'Lục lạp', 'Bộ máy Golgi', 'Lưới nội chất'],
        correctAnswer: 0,
        explanation: 'Ti thể thực hiện hô hấp tế bào tổng hợp năng lượng ATP.',
        difficulty: 'easy' as const,
        topic: subName,
      },
      {
        id: `q-${subId}-2`,
        subjectId: subId,
        content: `Câu 2 (Sinh học ${cname}): Đơn phân cấu tạo nên phân tử ADN là:`,
        type: 'multiple_choice' as const,
        options: ['Nuclêôtit', 'Axit amin', 'Glucôzơ', 'Axit béo'],
        correctAnswer: 0,
        explanation: 'ADN cấu tạo từ các đơn phân nuclêôtit (A, T, G, X).',
        difficulty: 'easy' as const,
        topic: subName,
      },
      {
        id: `q-${subId}-3`,
        subjectId: subId,
        content: `Câu 3 (Sinh học ${cname}): Trong quá trình quang hợp ở thực vật, sản phẩm khí được giải phóng ra môi trường là:`,
        type: 'multiple_choice' as const,
        options: ['Khí Oxi (O₂)', 'Khí Cacbonic (CO₂)', 'Khí Nitơ (N₂)', 'Khí Mêtan (CH₄)'],
        correctAnswer: 0,
        explanation: 'Quang hợp hấp thụ CO₂ và giải phóng O₂.',
        difficulty: 'easy' as const,
        topic: subName,
      },
      {
        id: `q-${subId}-4`,
        subjectId: subId,
        content: `Câu 4 (Sinh học ${cname}): Đơn vị cơ bản cấu trúc và chức năng của mọi cơ thể sống là:`,
        type: 'multiple_choice' as const,
        options: ['Tế bào', 'Mô', 'Cơ quan', 'Hệ cơ quan'],
        correctAnswer: 0,
        explanation: 'Tế bào là đơn vị cơ bản cấu tạo nên sinh vật.',
        difficulty: 'easy' as const,
        topic: subName,
      },
      {
        id: `q-${subId}-5`,
        subjectId: subId,
        content: `Câu 5 (Sinh học ${cname}): Quá trình tự nhân đôi ADN diễn ra theo những nguyên tắc nào?`,
        type: 'multiple_choice' as const,
        options: [
          'Nguyên tắc bổ sung và nguyên tắc bán bảo tồn',
          'Nguyên tắc bảo toàn hoàn toàn',
          'Nguyên tắc ngẫu nhiên',
          'Nguyên tắc tự do',
        ],
        correctAnswer: 0,
        explanation: 'Tự nhân đôi ADN diễn ra theo nguyên tắc bổ sung (A-T, G-X) và bán bảo tồn.',
        difficulty: 'easy' as const,
        topic: subName,
      },
    ];
  }

  if (stype === 'Tiếng Anh') {
    return [
      {
        id: `q-${subId}-1`,
        subjectId: subId,
        content: `Câu 1 (Tiếng Anh ${cname}): Choose the correct sentence in Simple Present Tense:`,
        type: 'multiple_choice' as const,
        options: [
          'She walks to school every morning.',
          'She is walk to school.',
          'She walked to school yesterday.',
          'She walking to school now.',
        ],
        correctAnswer: 0,
        explanation: 'Simple present tense for daily habit: S + V(s/es).',
        difficulty: 'easy' as const,
        topic: subName,
      },
      {
        id: `q-${subId}-2`,
        subjectId: subId,
        content: `Câu 2 (Tiếng Anh ${cname}): Choose the word that is CLOSEST in meaning to 'IMPORTANT':`,
        type: 'multiple_choice' as const,
        options: ['Crucial', 'Minor', 'Small', 'Unnecessary'],
        correctAnswer: 0,
        explanation: 'Crucial (quan trọng) is closest in meaning to Important.',
        difficulty: 'easy' as const,
        topic: subName,
      },
      {
        id: `q-${subId}-3`,
        subjectId: subId,
        content: `Câu 3 (Tiếng Anh ${cname}): Complete the sentence: 'If I study hard, I _____ pass the exam.'`,
        type: 'multiple_choice' as const,
        options: ['will', 'would', 'am', 'was'],
        correctAnswer: 0,
        explanation: 'First conditional sentence: If + Present Simple, S + will + V-bare.',
        difficulty: 'easy' as const,
        topic: subName,
      },
      {
        id: `q-${subId}-4`,
        subjectId: subId,
        content: `Câu 4 (Tiếng Anh ${cname}): Choose the correct preposition: 'He is very good _____ Mathematics.'`,
        type: 'multiple_choice' as const,
        options: ['at', 'in', 'on', 'for'],
        correctAnswer: 0,
        explanation: 'Structure: be good at something (giỏi về lĩnh vực gì).',
        difficulty: 'easy' as const,
        topic: subName,
      },
      {
        id: `q-${subId}-5`,
        subjectId: subId,
        content: `Câu 5 (Tiếng Anh ${cname}): Choose the correct passive form of: 'They built this bridge in 2020.'`,
        type: 'multiple_choice' as const,
        options: [
          'This bridge was built in 2020.',
          'This bridge is built in 2020.',
          'This bridge has been built.',
          'This bridge was build.',
        ],
        correctAnswer: 0,
        explanation: 'Past simple passive: S + was/were + V3/ed.',
        difficulty: 'easy' as const,
        topic: subName,
      },
    ];
  }

  return [
    {
      id: `q-${subId}-1`,
      subjectId: subId,
      content: `Câu 1 (${subName}): Khái niệm trọng tâm nào sau đây mô tả chính xác nhất nội dung bài học môn ${stype} (Lớp ${cname})?`,
      type: 'multiple_choice' as const,
      options: [
        `Khái niệm chuẩn xác theo nội dung trọng tâm bài học môn ${stype}`,
        'Định nghĩa chưa phản ánh đúng bản chất hiện tượng',
        'Khái niệm chỉ áp dụng cho trường hợp đặc biệt',
        'Định nghĩa bị thiếu điều kiện tiên quyết',
      ],
      correctAnswer: 0,
      explanation: `Dựa vào tài liệu bài học môn ${subName}, phương án A là chính xác nhất.`,
      difficulty: 'easy' as const,
      topic: subName,
    },
    {
      id: `q-${subId}-2`,
      subjectId: subId,
      content: `Câu 2 (${subName}): Trong quá trình giải quyết bài tập môn ${stype}, bước nào sau đây cần thực hiện đầu tiên?`,
      type: 'multiple_choice' as const,
      options: [
        'Đọc kỹ đề bài, xác định giả thiết và dữ kiện đã cho',
        'Tiến hành tính toán ngay không cần phân tích dữ liệu',
        'Lựa chọn ngẫu nhiên một công thức chưa kiểm chứng',
        'Bỏ qua các điều kiện giới hạn của bài toán',
      ],
      correctAnswer: 0,
      explanation: 'Phân tích dữ kiện đề bài luôn là bước quan trọng nhất.',
      difficulty: 'easy' as const,
      topic: subName,
    },
    {
      id: `q-${subId}-3`,
      subjectId: subId,
      content: `Câu 3 (${subName}): Phương pháp hiệu quả để ghi nhớ bền vững kiến thức môn ${stype} là:`,
      type: 'multiple_choice' as const,
      options: [
        'Sử dụng sơ đồ tư duy kết hợp luyện tập bài tập định kỳ',
        'Chỉ đọc qua lý thuyết một lần trước kỳ thi',
        'Học thuộc vẹt không liên hệ ví dụ thực tế',
        'Không ghi chép trong quá trình nghe giảng',
      ],
      correctAnswer: 0,
      explanation: 'Luyện tập định kỳ và sơ đồ tư duy giúp ghi nhớ kiến thức hiệu quả nhất.',
      difficulty: 'easy' as const,
      topic: subName,
    },
  ];
}

const LZString = {
  keyStrUriSafe: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",

  compressToEncodedURIComponent(uncompressed: string): string {
    if (uncompressed == null) return "";
    return LZString._compress(uncompressed, 6, (a) => LZString.keyStrUriSafe.charAt(a));
  },

  decompressFromEncodedURIComponent(compressed: string): string {
    if (compressed == null) return "";
    if (compressed === "") return null as any;
    compressed = compressed.replace(/ /g, "+");
    return LZString._decompress(compressed.length, 32, (index) => LZString.keyStrUriSafe.indexOf(compressed.charAt(index)));
  },

  _compress(uncompressed: string, bitsPerChar: number, getCharFromInt: (a: number) => string): string {
    if (uncompressed == null) return "";
    let i: number, value: number,
      context_dictionary: Record<string, number> = {},
      context_dictionaryToCreate: Record<string, boolean> = {},
      context_c = "",
      context_wc = "",
      context_w = "",
      context_enlargeIn = 2,
      context_dictSize = 3,
      context_numBits = 2,
      context_data: string[] = [],
      context_data_val = 0,
      context_data_position = 0,
      ii: number;

    for (ii = 0; ii < uncompressed.length; ii += 1) {
      context_c = uncompressed.charAt(ii);
      if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
        context_dictionary[context_c] = context_dictSize++;
        context_dictionaryToCreate[context_c] = true;
      }

      context_wc = context_w + context_c;
      if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
        context_w = context_wc;
      } else {
        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
          if (context_w.charCodeAt(0) < 256) {
            for (i = 0; i < context_numBits; i++) {
              context_data_val = (context_data_val << 1);
              if (context_data_position === bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
            }
            value = context_w.charCodeAt(0);
            for (i = 0; i < 8; i++) {
              context_data_val = (context_data_val << 1) | (value & 1);
              if (context_data_position === bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          } else {
            value = 1;
            for (i = 0; i < context_numBits; i++) {
              context_data_val = (context_data_val << 1) | value;
              if (context_data_position === bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = 0;
            }
            value = context_w.charCodeAt(0);
            for (i = 0; i < 16; i++) {
              context_data_val = (context_data_val << 1) | (value & 1);
              if (context_data_position === bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          }
          context_enlargeIn--;
          if (context_enlargeIn === 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
          delete context_dictionaryToCreate[context_w];
        } else {
          value = context_dictionary[context_w];
          for (i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn === 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        context_dictionary[context_wc] = context_dictSize++;
        context_w = String(context_c);
      }
    }

    if (context_w !== "") {
      if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
        if (context_w.charCodeAt(0) < 256) {
          for (i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1);
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
          }
          value = context_w.charCodeAt(0);
          for (i = 0; i < 8; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        } else {
          value = 1;
          for (i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1) | value;
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = 0;
          }
          value = context_w.charCodeAt(0);
          for (i = 0; i < 16; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn === 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        delete context_dictionaryToCreate[context_w];
      } else {
        value = context_dictionary[context_w];
        for (i = 0; i < context_numBits; i++) {
          context_data_val = (context_data_val << 1) | (value & 1);
          if (context_data_position === bitsPerChar - 1) {
            context_data_position = 0;
            context_data.push(getCharFromInt(context_data_val));
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = value >> 1;
        }
      }
      context_enlargeIn--;
      if (context_enlargeIn === 0) {
        context_enlargeIn = Math.pow(2, context_numBits);
        context_numBits++;
      }
    }

    value = 2;
    for (i = 0; i < context_numBits; i++) {
      context_data_val = (context_data_val << 1) | (value & 1);
      if (context_data_position === bitsPerChar - 1) {
        context_data_position = 0;
        context_data.push(getCharFromInt(context_data_val));
        context_data_val = 0;
      } else {
        context_data_position++;
      }
      value = value >> 1;
    }

    while (true) {
      context_data_val = (context_data_val << 1);
      if (context_data_position === bitsPerChar - 1) {
        context_data.push(getCharFromInt(context_data_val));
        break;
      } else context_data_position++;
    }
    return context_data.join("");
  },

  _decompress(length: number, resetValue: number, getNextValue: (index: number) => number): string {
    let dictionary: any[] = [],
      next: number,
      enlargeIn = 4,
      dictSize = 4,
      numBits = 3,
      entry = "",
      result: string[] = [],
      i: number,
      w: string,
      bits: number, resb: number, maxpower: number, power: number,
      c: any,
      data = { val: getNextValue(0), position: resetValue, index: 1 };

    for (i = 0; i < 3; i += 1) {
      dictionary[i] = i;
    }

    bits = 0;
    maxpower = Math.pow(2, 2);
    power = 1;
    while (power !== maxpower) {
      resb = data.val & data.position;
      data.position >>= 1;
      if (data.position === 0) {
        data.position = resetValue;
        data.val = getNextValue(data.index++);
      }
      bits |= (resb > 0 ? 1 : 0) * power;
      power <<= 1;
    }

    switch (next = bits) {
      case 0:
        bits = 0;
        maxpower = Math.pow(2, 8);
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        c = String.fromCharCode(bits);
        break;
      case 1:
        bits = 0;
        maxpower = Math.pow(2, 16);
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        c = String.fromCharCode(bits);
        break;
      case 2:
        return "";
    }
    dictionary[3] = c;
    w = c;
    result.push(c);
    while (true) {
      if (data.index > length) {
        return "";
      }

      bits = 0;
      maxpower = Math.pow(2, numBits);
      power = 1;
      while (power !== maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }

      switch (c = bits) {
        case 0:
          bits = 0;
          maxpower = Math.pow(2, 8);
          power = 1;
          while (power !== maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position === 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }

          dictionary[dictSize++] = String.fromCharCode(bits);
          c = dictSize - 1;
          enlargeIn--;
          break;
        case 1:
          bits = 0;
          maxpower = Math.pow(2, 16);
          power = 1;
          while (power !== maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position === 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          dictionary[dictSize++] = String.fromCharCode(bits);
          c = dictSize - 1;
          enlargeIn--;
          break;
        case 2:
          return result.join("");
      }

      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }

      if (dictionary[c]) {
        entry = dictionary[c];
      } else {
        if (c === dictSize) {
          entry = w + w.charAt(0);
        } else {
          return null as any;
        }
      }
      result.push(entry);

      dictionary[dictSize++] = w + entry.charAt(0);
      enlargeIn--;

      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }

      w = entry;
    }
  }
};

export function encodeExamPayload(subject: Subject, questions: Question[]): string {
  try {
    const listToEncode =
      questions && questions.length > 0
        ? questions
        : generateFallbackQuestionsBySubject(subject);

    const className = extractClassName(subject);
    const grade = extractGrade(subject);
    const subjectType = detectSubjectType(subject);

    const minified: any = {
      i: subject.id,
      n: subject.name || '',
      c: className,
      g: grade,
      st: subjectType,
      q: listToEncode.map((q) => {
        const rawContent = q.content || '';
        const cleanContent = rawContent
          .replace(/===\s*DANH MỤC[\s\S]*?===/gi, '')
          .replace(/===[\s\S]*?===/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        const item: any = {
          c: cleanContent || rawContent,
          o: q.options ? q.options.map((opt) => String(opt).trim()) : [],
          a: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        };

        if (q.explanation && q.explanation.trim()) {
          item.e = q.explanation.trim();
        }
        if (q.type && q.type !== 'multiple_choice') {
          item.t = q.type;
        }
        if (typeof q.points === 'number') {
          item.p = q.points;
        }
        return item;
      }),
    };

    const jsonStr = JSON.stringify(minified);
    const compressed = LZString.compressToEncodedURIComponent(jsonStr);
    return `lz_${compressed}`;
  } catch (e) {
    console.warn('Error encoding exam payload:', e);
    return '';
  }
}

export function decodeExamPayload(payloadStr: string): { subject: Subject; questions: Question[] } | null {
  try {
    let jsonStr = '';
    
    if (payloadStr.startsWith('lz_')) {
      const rawLz = payloadStr.slice(3);
      jsonStr = LZString.decompressFromEncodedURIComponent(rawLz);
    } else {
      jsonStr = fromBase64Url(payloadStr);
    }

    let data: any = null;
    try {
      data = JSON.parse(jsonStr);
    } catch {
      try {
        const directDecoded = decodeURIComponent(payloadStr);
        data = JSON.parse(directDecoded);
      } catch {
        try {
          const lzRaw = LZString.decompressFromEncodedURIComponent(payloadStr);
          if (lzRaw) data = JSON.parse(lzRaw);
        } catch {
          const lastObjEnd = jsonStr.lastIndexOf('}');
          if (lastObjEnd > 0) {
            const repairedJson = jsonStr.substring(0, lastObjEnd + 1) + ']}';
            try {
              data = JSON.parse(repairedJson);
            } catch {
              const repairedArray = jsonStr.substring(0, lastObjEnd + 1) + ']';
              try {
                data = JSON.parse(repairedArray);
              } catch {}
            }
          }
        }
      }
    }

    if (!data || !data.q || !Array.isArray(data.q) || data.q.length === 0) return null;

    const subjectId = data.i || `sub-shared-${Date.now()}`;
    const subjectName = data.n || 'Đề thi trắc nghiệm chia sẻ';
    const questions: Question[] = data.q.map((q: any, idx: number) => ({
      id: q.id || `q-${subjectId}-${idx + 1}`,
      subjectId: subjectId,
      content: q.c || `Câu hỏi ${idx + 1}`,
      type: q.t || 'multiple_choice',
      options: q.o && q.o.length > 0 ? q.o : ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
      correctAnswer: typeof q.a === 'number' ? q.a : 0,
      explanation: q.e || 'Giải thích chi tiết bám sát nội dung bài học.',
      points: q.p,
      difficulty: 'medium' as const,
      topic: subjectName,
    }));

    const subjectClassName = data.c || extractClassName({ name: subjectName, id: subjectId });
    const subjectGrade = data.g || extractGrade({ name: subjectName, id: subjectId, className: subjectClassName });
    const subjectType = data.st || detectSubjectType({ name: subjectName, id: subjectId });

    const subject: Subject = {
      id: subjectId,
      name: subjectName,
      description: data.d || `Đề thi trắc nghiệm chia sẻ trực tiếp (Lớp ${subjectClassName})`,
      questionsCount: questions.length,
      className: subjectClassName,
      grade: subjectGrade,
      subjectType: subjectType,
      icon: 'fa-solid fa-file-signature',
      color: 'from-teal-600 to-emerald-600',
      source: 'teacher_custom',
    };

    return { subject, questions };
  } catch (e) {
    console.warn('Error decoding exam payload:', e);
    return null;
  }
}

export function decodeSharePayload(payloadStr: string): any {
  if (!payloadStr) return null;
  try {
    const examData = decodeExamPayload(payloadStr);
    if (examData && examData.subject && examData.questions && examData.questions.length > 0) {
      return {
        type: 'exam',
        examId: examData.subject.id,
        examData: examData,
        title: examData.subject.name,
      };
    }
    const gameData = decodeGamePayload(payloadStr);
    if (gameData && gameData.id) {
      return {
        type: 'game',
        gameId: gameData.id,
        gameData: gameData,
        title: gameData.title,
      };
    }
  } catch (e) {
    console.warn('Error in decodeSharePayload:', e);
  }
  return null;
}

export function encodeGamePayload(game: EducationalGame): string {
  try {
    const compactGame: any = {
      i: game.id,
      t: game.title,
      s: game.subject,
      tp: game.type,
    };
    if (game.description && game.description.trim()) {
      compactGame.d = game.description.trim();
    }
    if (game.quizData && game.quizData.questions && game.quizData.questions.length > 0) {
      compactGame.q = {
        questions: game.quizData.questions.map((q) => {
          const item: any = {
            id: q.id,
            content: (q.content || '').replace(/\s+/g, ' ').trim(),
            options: q.options ? q.options.map((o) => String(o).trim()) : [],
            correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
          };
          if (q.explanation && q.explanation.trim()) item.explanation = q.explanation.trim();
          return item;
        }),
      };
    }
    if (game.dragDropData) {
      compactGame.dd = game.dragDropData;
    }
    if (game.matchingData) {
      compactGame.m = game.matchingData;
    }
    if (game.sourceDocTitle) {
      compactGame.st = game.sourceDocTitle;
    }

    const jsonStr = JSON.stringify(compactGame);
    const compressed = LZString.compressToEncodedURIComponent(jsonStr);
    return `lz_${compressed}`;
  } catch (e) {
    console.warn('Error encoding game payload:', e);
    return '';
  }
}

export function decodeGamePayload(payloadStr: string): EducationalGame | null {
  try {
    let jsonStr = '';

    if (payloadStr.startsWith('lz_')) {
      const rawLz = payloadStr.slice(3);
      jsonStr = LZString.decompressFromEncodedURIComponent(rawLz);
    } else {
      try {
        jsonStr = fromBase64Url(payloadStr);
      } catch {
        jsonStr = decodeURIComponent(payloadStr);
      }
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      try {
        const directDecoded = decodeURIComponent(payloadStr);
        parsed = JSON.parse(directDecoded);
      } catch {
        try {
          const lzRaw = LZString.decompressFromEncodedURIComponent(payloadStr);
          if (lzRaw) parsed = JSON.parse(lzRaw);
        } catch {}
      }
    }

    if (!parsed) return null;

    if (parsed.id && parsed.title) {
      return parsed as EducationalGame;
    }

    if (parsed.i && parsed.t) {
      const game: EducationalGame = {
        id: parsed.i,
        title: parsed.t,
        description: parsed.d || '',
        subject: parsed.s || 'Tổng hợp',
        type: parsed.tp || 'quiz',
        quizData: parsed.q,
        dragDropData: parsed.dd,
        matchingData: parsed.m,
        sourceDocTitle: parsed.st,
        playCount: 0,
        createdAt: new Date().toISOString(),
      };
      return game;
    }

    return null;
  } catch (e) {
    console.warn('Error decoding game payload:', e);
    return null;
  }
}
