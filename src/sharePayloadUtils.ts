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
      content: `Câu 2 (${subName}): Phương pháp giải quyết bài tập môn ${stype} tối ưu nhất khi gặp dạng toán/câu hỏi này là:`,
      type: 'multiple_choice' as const,
      options: [
        'Áp dụng công thức và lý thuyết nền tảng SGK',
        'Lựa chọn đáp án theo cảm tính',
        'Bỏ qua các bước lập luận định tính',
        'Chỉ dùng phương pháp loại trừ đơn thuần',
      ],
      correctAnswer: 0,
      explanation: 'Áp dụng lý thuyết và công thức SGK là phương pháp giải bài tập chính xác.',
      difficulty: 'medium' as const,
      topic: subName,
    },
    {
      id: `q-${subId}-3`,
      subjectId: subId,
      content: `Câu 3 (${subName}): Nhận định nào sau đây là ĐÚNG khi nói về mối liên hệ kiến thức trong bài học này?`,
      type: 'multiple_choice' as const,
      options: [
        'Khái niệm bám sát chương trình Giáo dục phổ thông mới SGK 2026-2027',
        'Nội dung không liên quan đến chương trình học',
        'Các quy luật hoàn toàn độc lập không có mối liên hệ',
        'Lý thuyết chỉ có tính chất tham khảo không áp dụng kiểm tra',
      ],
      correctAnswer: 0,
      explanation: 'Nội dung bộ đề được biên soạn chuẩn theo chương trình SGK mới 2026-2027.',
      difficulty: 'medium' as const,
      topic: subName,
    },
  ];
}

export function encodeExamPayload(subject: Subject, questions: Question[]): string {
  try {
    const compactQuestions = questions.map((q) => ({
      i: q.id,
      c: q.content,
      t: q.type,
      o: q.options,
      a: q.correctAnswer,
      e: q.explanation,
      d: q.difficulty,
      p: q.points,
      tp: q.topic,
    }));

    const payloadObj = {
      s: {
        i: subject.id,
        n: subject.name,
        ic: subject.icon,
        cl: subject.color,
        d: subject.description,
        c: subject.className,
        g: subject.grade,
        st: subject.subjectType,
      },
      q: compactQuestions,
    };

    const jsonStr = JSON.stringify(payloadObj);

    if (typeof window !== 'undefined' && (window as any).LZString) {
      return (window as any).LZString.compressToEncodedURIComponent(jsonStr);
    }

    return toBase64Url(jsonStr);
  } catch (e) {
    console.warn('Error encoding exam payload:', e);
    return '';
  }
}

export function decodeExamPayload(payloadStr: string): { subject: Subject; questions: Question[] } | null {
  try {
    let jsonStr = '';

    if (typeof window !== 'undefined' && (window as any).LZString) {
      jsonStr = (window as any).LZString.decompressFromEncodedURIComponent(payloadStr) || '';
    }

    if (!jsonStr) {
      jsonStr = fromBase64Url(payloadStr);
    }

    if (!jsonStr) return null;

    const parsed = JSON.parse(jsonStr);
    if (!parsed || !parsed.s || !parsed.q) return null;

    const subject: Subject = {
      id: parsed.s.i,
      name: parsed.s.n,
      icon: parsed.s.ic || 'BookOpen',
      color: parsed.s.cl || 'teal',
      description: parsed.s.d || '',
      className: parsed.s.c || '10A1',
      grade: parsed.s.g || '10',
      subjectType: parsed.s.st || 'Toán học',
      questionsCount: parsed.q.length,
      createdAt: new Date().toISOString(),
    };

    const questions: Question[] = parsed.q.map((item: any, idx: number) => ({
      id: item.i || `q-${subject.id}-${idx}`,
      subjectId: subject.id,
      content: item.c,
      type: item.t || 'multiple_choice',
      options: item.o || [],
      correctAnswer: item.a !== undefined ? item.a : 0,
      explanation: item.e || '',
      difficulty: item.d || 'medium',
      points: item.p || 1,
      topic: item.tp || subject.name,
    }));

    return { subject, questions };
  } catch (e) {
    console.warn('Error decoding exam payload:', e);
    return null;
  }
}

export function encodeGamePayload(game: EducationalGame): string {
  try {
    const compactGame = {
      i: game.id,
      t: game.title,
      d: game.description,
      s: game.subject,
      tp: game.type,
      q: game.quizData,
      dd: game.dragDropData,
      m: game.matchingData,
      st: game.sourceDocTitle,
    };
    const jsonStr = JSON.stringify(compactGame);

    if (typeof window !== 'undefined' && (window as any).LZString) {
      return `lz_${(window as any).LZString.compressToEncodedURIComponent(jsonStr)}`;
    }

    return `lz_${toBase64Url(jsonStr)}`;
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
      if (typeof window !== 'undefined' && (window as any).LZString) {
        jsonStr = (window as any).LZString.decompressFromEncodedURIComponent(rawLz);
      }
      if (!jsonStr) {
        jsonStr = fromBase64Url(rawLz);
      }
    } else {
      if (typeof window !== 'undefined' && (window as any).LZString) {
        jsonStr = (window as any).LZString.decompressFromEncodedURIComponent(payloadStr);
      }
      if (!jsonStr) {
        jsonStr = fromBase64Url(payloadStr);
      }
    }

    if (!jsonStr) return null;

    let parsed: any = null;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      if (typeof window !== 'undefined' && (window as any).LZString) {
        const directDecoded = (window as any).LZString.decompressFromEncodedURIComponent(payloadStr);
        if (directDecoded) {
          try {
            parsed = JSON.parse(directDecoded);
          } catch {}
        }
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
