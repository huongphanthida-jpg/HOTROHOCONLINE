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

export function encodeExamPayload(subject: Subject, questions: Question[]): string {
  try {
    const listToEncode =
      questions && questions.length > 0
        ? questions
        : [
            {
              id: `q-${subject.id}-1`,
              subjectId: subject.id,
              content: `Câu 1 (${subject.name}): Khái niệm trọng tâm nào sau đây là chính xác theo chuẩn chương trình?`,
              type: 'multiple_choice' as const,
              options: [
                'Phương án A: Khái niệm đúng theo định nghĩa chuẩn SGK',
                'Phương án B: Chưa phản ánh đúng bản chất hiện tượng',
                'Phương án C: Định nghĩa bị thiếu điều kiện tiên quyết',
                'Phương án D: Định nghĩa dành riêng cho trường hợp cá biệt',
              ],
              correctAnswer: 0,
              explanation: `Theo tài liệu chuẩn môn ${subject.name}, phương án A là chính xác và đầy đủ nhất.`,
              difficulty: 'easy' as const,
              topic: subject.name,
            },
            {
              id: `q-${subject.id}-2`,
              subjectId: subject.id,
              content: `Câu 2 (${subject.name}): Cho hai véctơ u và v cùng phương. Khẳng định nào sau đây là đúng?`,
              type: 'multiple_choice' as const,
              options: [
                'Hai véctơ có giá song song hoặc trùng nhau',
                'Hai véctơ có cùng độ dài và cùng hướng',
                'Hai véctơ luôn có điểm đầu trùng nhau',
                'Hai véctơ vuông góc với nhau tại gốc O',
              ],
              correctAnswer: 0,
              explanation: 'Hai véctơ cùng phương khi và chỉ khi giá của chúng song song hoặc trùng nhau.',
              difficulty: 'easy' as const,
              topic: subject.name,
            },
            {
              id: `q-${subject.id}-3`,
              subjectId: subject.id,
              content: `Câu 3 (${subject.name}): Quy tắc 3 điểm đối với tổng hai véctơ AB và BC là:`,
              type: 'multiple_choice' as const,
              options: [
                'AB + BC = AC',
                'AB + BC = BA',
                'AB - BC = AC',
                'AB + AC = BC',
              ],
              correctAnswer: 0,
              explanation: 'Quy tắc 3 điểm: AB + BC = AC.',
              difficulty: 'easy' as const,
              topic: subject.name,
            },
            {
              id: `q-${subject.id}-4`,
              subjectId: subject.id,
              content: `Câu 4 (${subject.name}): Điều kiện cần và đủ để hai véctơ u và v khác 0 vuông góc với nhau là:`,
              type: 'multiple_choice' as const,
              options: [
                'Tích vô hướng u . v = 0',
                'Tổng độ dài |u| + |v| = 0',
                'Hiệu hai véctơ u - v = 0',
                'Tích độ dài |u| . |v| = 1',
              ],
              correctAnswer: 0,
              explanation: 'Hai véctơ vuông góc khi tích vô hướng u . v = 0.',
              difficulty: 'medium' as const,
              topic: subject.name,
            },
            {
              id: `q-${subject.id}-5`,
              subjectId: subject.id,
              content: `Câu 5 (${subject.name}): Trong quá trình làm bài thi trắc nghiệm, phương pháp tối ưu để rà soát là:`,
              type: 'multiple_choice' as const,
              options: [
                'Đọc kỹ lại đề bài, đối chiếu giả thiết và kiểm tra các bước suy luận',
                'Chọn lại ngẫu nhiên các phương án khác',
                'Không kiểm tra lại bài làm',
                'Thay đổi đáp án theo cảm tính',
              ],
              correctAnswer: 0,
              explanation: 'Rà soát kỹ đề bài và suy luận để tránh sai sót.',
              difficulty: 'easy' as const,
              topic: subject.name,
            },
          ];

    const minified = {
      i: subject.id,
      n: subject.name,
      d: (subject.description || '').slice(0, 80),
      c: subject.className || '10T2',
      g: subject.grade || '10',
      st: subject.subjectType || 'Toán học',
      q: listToEncode.slice(0, 25).map((q) => ({
        c: q.content,
        o: q.options ? q.options.map((opt) => String(opt).slice(0, 100)) : [],
        a: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        e: (q.explanation || '').slice(0, 80),
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

    const subject: Subject = {
      id: subjectId,
      name: subjectName,
      description: data.d || `Đề thi trắc nghiệm chia sẻ trực tiếp (Lớp ${data.c || '10T2'})`,
      questionsCount: questions.length,
      className: data.c || '10T2',
      grade: data.g || '10',
      subjectType: data.st || 'Toán học',
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
