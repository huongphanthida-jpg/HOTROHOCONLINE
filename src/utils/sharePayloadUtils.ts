import { Subject, Question, EducationalGame } from '../types';

export function encodeExamPayload(subject: Subject, questions: Question[]): string {
  try {
    const listToEncode = questions && questions.length > 0 ? questions : [];

    const minified = {
      i: subject.id,
      n: subject.name,
      d: (subject.description || '').slice(0, 60),
      c: subject.className || '',
      g: subject.grade || '12',
      st: subject.subjectType || 'Toán học',
      q: listToEncode.slice(0, 20).map((q) => ({
        c: q.content,
        o: q.options ? q.options.map((opt) => String(opt).slice(0, 80)) : [],
        a: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        e: (q.explanation || '').slice(0, 60),
      })),
    };
    return encodeURIComponent(JSON.stringify(minified));
  } catch (e) {
    console.warn('Error encoding exam payload:', e);
    return '';
  }
}

export function decodeExamPayload(payloadStr: string): { subject: Subject; questions: Question[] } | null {
  try {
    const jsonStr = decodeURIComponent(payloadStr);
    let data: any = null;

    try {
      data = JSON.parse(jsonStr);
    } catch {
      // Attempt to repair JSON if truncated by Zalo or mobile browsers
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

    if (!data || !data.q || !Array.isArray(data.q) || data.q.length === 0) return null;

    const subjectId = data.i || `sub-shared-${Date.now()}`;
    const subjectName = data.n || 'Đề thi trắc nghiệm chia sẻ';
    const questions: Question[] = data.q.map((q: any, idx: number) => ({
      id: q.id || `q-${subjectId}-${idx + 1}`,
      subjectId: subjectId,
      content: q.c || `Câu hỏi ${idx + 1}`,
      type: q.t || 'multiple_choice',
      options: q.o || ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
      correctAnswer: typeof q.a === 'number' ? q.a : 0,
      explanation: q.e || 'Giải thích chuẩn sách giáo khoa.',
      difficulty: 'medium' as const,
      topic: subjectName,
    }));

    const subject: Subject = {
      id: subjectId,
      name: subjectName,
      description: data.d || `Đề thi trắc nghiệm chia sẻ trực tiếp (Lớp ${data.c || '12D1'})`,
      questionsCount: questions.length,
      className: data.c || undefined,
      grade: data.g || '12',
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
