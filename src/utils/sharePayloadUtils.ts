import { Subject, Question, EducationalGame } from '../types';

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

export function generateFallbackQuestionsBySubject(subject: Partial<Subject>): Question[] {
  const subId = subject.id || `sub-gen-${Date.now()}`;
  const stype = detectSubjectType(subject);
  const cname = extractClassName(subject);
  const grade = extractGrade(subject);
  const subName = subject.name || `${stype} lớp ${cname} - Đề kiểm tra định kỳ`;

  if (stype === 'Hóa học') {
    if (grade === '10') {
      return [
        {
          id: `q-${subId}-1`,
          subjectId: subId,
          content: `Câu 1 (Hóa học ${cname}): Trong nguyên tử, hạt mang điện tích dương nằm ở hạt nhân là:`,
          type: 'multiple_choice' as const,
          options: ['Proton (p)', 'Electron (e)', 'Neutron (n)', 'Photon'],
          correctAnswer: 0,
          explanation: 'Hạt nhân nguyên tử gồm proton (mang điện +) và neutron (không mang điện).',
          difficulty: 'easy' as const,
          topic: subName,
        },
        {
          id: `q-${subId}-2`,
          subjectId: subId,
          content: `Câu 2 (Hóa học ${cname}): Số hiệu nguyên tử (Z) của một nguyên tố hóa học cho biết:`,
          type: 'multiple_choice' as const,
          options: [
            'Số proton trong hạt nhân và số electron ở vỏ nguyên tử',
            'Số neutron trong hạt nhân',
            'Khối lượng nguyên tử tính bằng gam',
            'Bán kính của nguyên tử',
          ],
          correctAnswer: 0,
          explanation: 'Số hiệu nguyên tử Z = số proton = số electron.',
          difficulty: 'easy' as const,
          topic: subName,
        },
        {
          id: `q-${subId}-3`,
          subjectId: subId,
          content: `Câu 3 (Hóa học ${cname}): Phản ứng oxi hóa - khử là phản ứng hóa học trong đó có sự:`,
          type: 'multiple_choice' as const,
          options: [
            'Chuyển dời electron giữa các chất phản ứng (thay đổi số oxi hóa)',
            'Thay đổi màu sắc của dung dịch mà không đổi số oxi hóa',
            'Tạo ra chất kết tủa trắng',
            'Giải phóng khí không màu',
          ],
          correctAnswer: 0,
          explanation: 'Phản ứng oxi hóa - khử có sự cho và nhận electron dẫn đến thay đổi số oxi hóa.',
          difficulty: 'easy' as const,
          topic: subName,
        },
        {
          id: `q-${subId}-4`,
          subjectId: subId,
          content: `Câu 4 (Hóa học ${cname}): Liên kết cộng hóa trị là liên kết được hình thành giữa hai nguyên tử bằng:`,
          type: 'multiple_choice' as const,
          options: [
            'Một hay nhiều cặp electron chung',
            'Lực hút tĩnh điện giữa các ion trái dấu',
            'Lực hút giữa các hạt nhân',
            'Sự cho nhận hoàn toàn 1 electron',
          ],
          correctAnswer: 0,
          explanation: 'Liên kết cộng hóa trị hình thành bằng các cặp electron chung giữa hai nguyên tử.',
          difficulty: 'medium' as const,
          topic: subName,
        },
        {
          id: `q-${subId}-5`,
          subjectId: subId,
          content: `Câu 5 (Hóa học ${cname}): Quy tắc an toàn tối quan trọng trong phòng thí nghiệm Hóa học 10 là:`,
          type: 'multiple_choice' as const,
          options: [
            'Luôn đeo kính bảo hộ, tuân thủ hướng dẫn và không ngửi trực tiếp hóa chất',
            'Dùng tay cầm trực tiếp ống nghiệm đang đun nóng',
            'Ghế ngồi gần khu vực hóa chất dễ cháy',
            'Tự ý trộn các hóa chất lạ với nhau',
          ],
          correctAnswer: 0,
          explanation: 'Luôn đeo kính bảo hộ và tuân thủ an toàn thí nghiệm Hóa học SGK.',
          difficulty: 'easy' as const,
          topic: subName,
        },
      ];
    }

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

// LZString compression for URL params and QR codes (100% loss-free, high efficiency compression)
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

    const minified = {
      lz: 1,
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
        return {
          c: cleanContent || rawContent,
          o: q.options ? q.options.map((opt) => String(opt).trim()) : [],
          a: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
          e: q.explanation ? String(q.explanation).trim() : undefined,
          t: q.type || 'multiple_choice',
          p: q.points,
        };
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
          // Attempt repair
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
    return toBase64Url(JSON.stringify(compactGame));
  } catch (e) {
    console.warn('Error encoding game payload:', e);
    return '';
  }
}

export function decodeGamePayload(payloadStr: string): EducationalGame | null {
  try {
    let jsonStr = '';
    try {
      jsonStr = fromBase64Url(payloadStr);
    } catch {
      jsonStr = decodeURIComponent(payloadStr);
    }
    const parsed = JSON.parse(jsonStr);
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
