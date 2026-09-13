import { Subject, Question, EducationalGame } from '../types';

function toBase64Url(str: string): string {
  try {
    const base64 = btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return encodeURIComponent(str);
  }
}

function fromBase64Url(str: string): string {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return decodeURIComponent(
      Array.from(atob(base64))
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
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
  return `sub-custom-${normStype}_${normCname}-${Date.now()}`;
}

export function generateFallbackQuestionsBySubject(subject: Partial<Subject>): Question[] {
  const subId = subject.id || `sub-gen-${Date.now()}`;
  const subName = subject.name || 'Đề thi khảo thí';
  const stype = detectSubjectType(subject);
  const grade = extractGrade(subject);
  const cname = extractClassName(subject);

  if (stype === 'Hóa học') {
    return [
      {
        id: `q-${subId}-1`,
        subjectId: subId,
        content: `Câu 1 (Hóa học ${cname}): Theo thuyết Arrhenius về axit - bazơ, chất nào sau đây khi tan trong nước phân ly ra anion OH⁻?`,
        type: 'multiple_choice' as const,
        options: ['Base (Bazơ)', 'Acid (Axit)', 'Muối trung hòa', 'Oxit axit'],
        correctAnswer: 0,
        explanation: 'Theo thuyết Arrhenius, bazơ là chất khi tan trong nước phân ly ra anion OH⁻.',
        difficulty: 'easy' as const,
        topic: subName,
      },
      {
        id: `q-${subId}-2`,
        subjectId: subId,
        content: `Câu 2 (Hóa học ${cname}): Cho dung dịch HCl có nồng độ H⁺ là 10⁻² M. Giá trị pH của dung dịch này là:`,
        type: 'multiple_choice' as const,
        options: ['pH = 2', 'pH = 12', 'pH = 7', 'pH = 1'],
        correctAnswer: 0,
        explanation: 'pH = -lg[H⁺] = -lg(10⁻²) = 2.',
        difficulty: 'easy' as const,
        topic: subName,
      },
      {
        id: `q-${subId}-3`,
        subjectId: subId,
        content: `Câu 3 (Hóa học ${cname}): Dung dịch chất nào sau đây làm quỳ tím chuyển sang màu đỏ?`,
        type: 'multiple_choice' as const,
        options: ['Dung dịch H₂SO₄', 'Dung dịch NaOH', 'Dung dịch NaCl', 'Nước cất tinh khiết'],
        correctAnswer: 0,
        explanation: 'Dung dịch axit H₂SO₄ có pH < 7 làm quỳ tím hóa đỏ.',
        difficulty: 'easy' as const,
        topic: subName,
      },
      {
        id: `q-${subId}-4`,
        subjectId: subId,
        content: `Câu 4 (Hóa học ${cname}): Chất nào sau đây thuộc loại chất điện ly mạnh trong nước?`,
        type: 'multiple_choice' as const,
        options: ['Dung dịch muối ăn NaCl', 'Axit axetic CH₃COOH', 'Nước cất H₂O', 'Dung dịch đường saccharose'],
        correctAnswer: 0,
        explanation: 'Muối NaCl tan và phân ly hoàn toàn trong nước thành các ion Na⁺ và Cl⁻.',
        difficulty: 'medium' as const,
        topic: subName,
      },
      {
        id: `q-${subId}-5`,
        subjectId: subId,
        content: `Câu 5 (Hóa học ${cname}): Quy tắc an toàn tối quan trọng khi làm thí nghiệm hóa học là:`,
        type: 'multiple_choice' as const,
        options: [
          'Đeo kính bảo hộ, tuân thủ hướng dẫn và không tự ý ngửi hóa chất đậm đặc',
          'Sử dụng lửa trực tiếp gần hóa chất dễ cháy',
          'Đổ trực tiếp hóa chất dư vào cống rãnh',
          'Thay đổi liều lượng hóa chất theo cảm tính',
        ],
        correctAnswer: 0,
        explanation: 'Luôn tuân thủ quy tắc an toàn thí nghiệm Hóa học SGK.',
        difficulty: 'easy' as const,
        topic: subName,
      },
    ];
  }

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

  // Default / Toán học
  return [
    {
      id: `q-${subId}-1`,
      subjectId: subId,
      content: `Câu 1 (${subName}): Cho hai véctơ u và v cùng phương. Phát biểu nào sau đây là chính xác nhất?`,
      type: 'multiple_choice' as const,
      options: [
        'Hai véctơ có giá song song hoặc trùng nhau',
        'Hai véctơ có cùng độ dài và cùng hướng',
        'Hai véctơ luôn có điểm đầu trùng nhau',
        'Hai véctơ vuông góc với nhau tại gốc O',
      ],
      correctAnswer: 0,
      explanation: 'Theo chuẩn SGK, hai véctơ cùng phương khi và chỉ khi giá của chúng song song hoặc trùng nhau.',
      difficulty: 'easy' as const,
      topic: subName,
    },
    {
      id: `q-${subId}-2`,
      subjectId: subId,
      content: `Câu 2 (${subName}): Quy tắc 3 điểm đối với tổng hai véctơ AB và BC được phát biểu như thế nào?`,
      type: 'multiple_choice' as const,
      options: ['AB + BC = AC', 'AB + BC = BA', 'AB - BC = AC', 'AB + AC = BC'],
      correctAnswer: 0,
      explanation: 'Quy tắc 3 điểm: AB + BC = AC.',
      difficulty: 'easy' as const,
      topic: subName,
    },
    {
      id: `q-${subId}-3`,
      subjectId: subId,
      content: `Câu 3 (${subName}): Tập xác định của hàm số y = 1 / x là:`,
      type: 'multiple_choice' as const,
      options: ['R \\ {0}', 'R', '(0; +∞)', '[0; +∞)'],
      correctAnswer: 0,
      explanation: 'Mẫu số x phải khác 0.',
      difficulty: 'easy' as const,
      topic: subName,
    },
    {
      id: `q-${subId}-4`,
      subjectId: subId,
      content: `Câu 4 (${subName}): Nghiệm của phương trình x² - 4 = 0 là:`,
      type: 'multiple_choice' as const,
      options: ['x = 2 hoặc x = -2', 'x = 4', 'x = 0', 'x = 1'],
      correctAnswer: 0,
      explanation: 'x² = 4 => x = ±2.',
      difficulty: 'easy' as const,
      topic: subName,
    },
    {
      id: `q-${subId}-5`,
      subjectId: subId,
      content: `Câu 5 (${subName}): Phương pháp rà soát và kiểm tra lại kết quả bài thi trắc nghiệm mang lại hiệu quả cao nhất là:`,
      type: 'multiple_choice' as const,
      options: [
        'Đọc kỹ lại đề bài, đối chiếu giả thiết và kiểm tra lại từng bước tính toán',
        'Chọn lại đáp án ngẫu nhiên trước khi nộp bài',
        'Không đọc lại bài làm để tiết kiệm thời gian',
        'Sửa đáp án theo cảm tính cá nhân',
      ],
      correctAnswer: 0,
      explanation: 'Đọc kỹ đề bài và rà soát từng bước giải là phương pháp tốt nhất.',
      difficulty: 'easy' as const,
      topic: subName,
    },
  ];
}

export function encodeExamPayload(subject: Subject, questions: Question[]): string {
  try {
    const listToEncode =
      questions && questions.length > 0
        ? questions
        : generateFallbackQuestionsBySubject(subject);

    const className = extractClassName(subject);
    const grade = extractGrade(subject);
    const subjectType = detectSubjectType(subject);

    const minified = {
      i: subject.id,
      n: subject.name,
      d: (subject.description || '').slice(0, 80),
      c: className,
      g: grade,
      st: subjectType,
      q: listToEncode.slice(0, 15).map((q) => ({
        c: q.content,
        o: q.options ? q.options.map((opt) => String(opt).slice(0, 90)) : [],
        a: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        e: (q.explanation || '').slice(0, 60),
      })),
    };
    return toBase64Url(JSON.stringify(minified));
  } catch (e) {
    console.warn('Error encoding exam payload:', e);
    return '';
  }
}

export function decodeExamPayload(payloadStr: string): { subject: Subject; questions: Question[] } | null {
  try {
    let jsonStr = fromBase64Url(payloadStr);
    let data: any = null;

    try {
      data = JSON.parse(jsonStr);
    } catch {
      // Fallback direct URL decode
      try {
        const directDecoded = decodeURIComponent(payloadStr);
        data = JSON.parse(directDecoded);
      } catch {
        // Attempt to repair JSON if truncated
        const lastObjEnd = jsonStr.lastIndexOf('}');
        if (lastObjEnd > 0) {
          const repairedJson = jsonStr.substring(0, lastObjEnd + 1) + ']}';
          try {
            data = JSON.parse(repairedJson);
          } catch {
            const repairedArray = jsonStr.substring(0, lastObjEnd + 1) + ']';
            try {
              data = JSON.parse(repairedArray);
            } catch {
              // Repair failed
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
      explanation: q.e || 'Giải thích chuẩn sách giáo khoa.',
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

export function encodeGamePayload(game: EducationalGame): string {
  try {
    const jsonStr = JSON.stringify(game);
    return encodeURIComponent(jsonStr);
  } catch (e) {
    console.warn('Error encoding game payload:', e);
    return '';
  }
}

export function decodeGamePayload(payloadStr: string): EducationalGame | null {
  try {
    const jsonStr = decodeURIComponent(payloadStr);
    const game = JSON.parse(jsonStr);
    if (!game || !game.id || !game.title) return null;
    return game as EducationalGame;
  } catch (e) {
    console.warn('Error decoding game payload:', e);
    return null;
  }
}
