import { Subject, Question, EducationalGame } from '../types';

export function encodeExamPayload(subject: Subject, questions: Question[]): string {
  try {
    const minified = {
      i: subject.id,
      n: subject.name,
      d: subject.description || '',
      c: subject.className || '',
      g: subject.grade || '12',
      st: subject.subjectType || 'Toán học',
      q: questions.map((q) => ({
        id: q.id,
        c: q.content,
        t: q.type || 'multiple_choice',
        o: q.options,
        a: q.correctAnswer,
        e: q.explanation || '',
        df: q.difficulty || 'medium',
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
    const data = JSON.parse(jsonStr);
    if (!data || !data.q || !Array.isArray(data.q)) return null;

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
      difficulty: q.df || 'medium',
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
