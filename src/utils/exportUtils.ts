import { Question, DocumentLearning } from '../types';

/**
 * Xuất danh sách câu hỏi đề thi thành file Word (.docx) chuẩn format
 */
export function exportExamToWordDocx(
  title: string,
  questions: Question[],
  options?: { includeAnswers?: boolean; durationMinutes?: number }
) {
  const includeAnswers = options?.includeAnswers ?? true;
  const duration = options?.durationMinutes ?? 45;

  const docContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${title}</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.4; color: #000; margin: 1in; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .header-table td { text-align: center; font-size: 11pt; vertical-font-style: italic; }
        .header-title { font-size: 14pt; font-weight: bold; text-transform: uppercase; }
        .exam-title { text-align: center; font-size: 16pt; font-weight: bold; margin: 20px 0 5px 0; text-transform: uppercase; color: #0d9488; }
        .exam-meta { text-align: center; font-style: italic; font-size: 11pt; margin-bottom: 25px; }
        .question-item { margin-bottom: 18px; page-break-inside: avoid; }
        .question-title { font-weight: bold; margin-bottom: 6px; }
        .options-grid { margin-left: 20px; }
        .option-row { margin-bottom: 4px; }
        .answer-key { margin-top: 40px; border-top: 2px solid #0d9488; pt: 20px; page-break-before: always; }
        .answer-key-title { font-size: 14pt; font-weight: bold; text-transform: uppercase; color: #0d9488; margin-bottom: 15px; text-align: center; }
        .answer-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .answer-table th, .answer-table td { border: 1px solid #999; padding: 6px; text-align: center; font-size: 11pt; }
        .answer-table th { background-color: #f0fdf4; font-weight: bold; }
        .explanation-box { background-color: #f8fafc; border-left: 3px solid #0d9488; padding: 8px 12px; margin-top: 6px; font-size: 11pt; }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td style="width: 45%;">
            <strong>BỘ GIÁO DỤC VÀ ĐÀO TẠO</strong><br/>
            <strong>HỆ THỐNG HỌC ONLINE 2026-2027</strong>
          </td>
          <td style="width: 55%;">
            <strong>ĐỀ THI VÀ KIỂM TRA CHUẨN SGK</strong><br/>
            <em>Năm học: 2026 - 2027</em>
          </td>
        </tr>
      </table>

      <div class="exam-title">${title}</div>
      <div class="exam-meta">Thời gian làm bài: ${duration} phút (Không kể thời gian phát đề)<br/>Số lượng: ${questions.length} câu hỏi</div>
      <hr style="border: 0.5px solid #ccc; margin-bottom: 20px;" />

      <!-- Danh sách câu hỏi -->
      ${questions
        .map((q, idx) => {
          const optionLabels = ['A', 'B', 'C', 'D'];
          return `
            <div class="question-item">
              <div class="question-title">Câu ${idx + 1}: ${q.content}</div>
              ${
                q.options && q.options.length > 0
                  ? `
                <div class="options-grid">
                  ${q.options
                    .map(
                      (opt, optIdx) => `
                    <div class="option-row"><strong>${optionLabels[optIdx]}.</strong> ${opt}</div>
                  `
                    )
                    .join('')}
                </div>
              `
                  : ''
              }
              ${
                q.sampleAnswer
                  ? `<div style="margin-left: 20px; font-style: italic; color: #475569;">Gợi ý đáp án / Hướng dẫn chấm: ${q.sampleAnswer}</div>`
                  : ''
              }
            </div>
          `;
        })
        .join('')}

      <!-- Đáp án & Lời giải chi tiết -->
      ${
        includeAnswers
          ? `
        <div class="answer-key">
          <div class="answer-key-title">BẢNG ĐÁP ÁN & HƯỚNG DẪN GIẢI CHI TIẾT</div>
          
          <table class="answer-table">
            <thead>
              <tr>
                <th>Câu</th>
                ${questions.map((_, i) => `<th>${i + 1}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Đáp án</strong></td>
                ${questions
                  .map((q) => {
                    const optionLabels = ['A', 'B', 'C', 'D'];
                    return `<td><strong>${optionLabels[q.correctAnswer] || 'Tự luận'}</strong></td>`;
                  })
                  .join('')}
              </tr>
            </tbody>
          </table>

          <h4 style="margin-top: 25px; color: #0f766e;">Lời giải chi tiết từng câu:</h4>
          ${questions
            .map(
              (q, idx) => `
            <div style="margin-bottom: 12px;">
              <strong>Câu ${idx + 1}:</strong> ${q.explanation || 'Đang cập nhật lời giải SGK.'}
            </div>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + docContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `De_Thi_${title.replace(/[^a-zA-Z0-9_]/g, '_')}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Xuất nội dung tài liệu thành bộ slide PowerPoint (.pptx)
 */
export function exportDocumentToPowerPointPptx(doc: DocumentLearning) {
  const title = doc.title || 'Bài Giảng Học Tập';
  const keyPoints = doc.keyPoints || [];
  const summary = doc.summary || doc.content.slice(0, 300);

  const pptxContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:p='urn:schemas-microsoft-com:office:powerpoint' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${title}</title>
      <style>
        body { font-family: 'Arial', sans-serif; background-color: #f8fafc; color: #1e293b; }
        .slide { width: 10in; height: 5.625in; padding: 0.6in; background: white; margin: 20px auto; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); page-break-after: always; display: flex; flex-direction: column; justify-content: space-between; border-left: 12px solid #0d9488; }
        .slide-title { font-size: 24pt; font-weight: bold; color: #0d9488; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
        .slide-body { font-size: 14pt; line-height: 1.6; color: #334155; flex-1: 1; }
        .slide-footer { font-size: 10pt; color: #94a3b8; text-align: right; border-top: 1px solid #f1f5f9; pt: 8px; }
        .bullet-list { margin-left: 20px; }
        .bullet-item { margin-bottom: 10px; }
        .title-slide { background: linear-gradient(135deg, #0d9488, #059669); color: white; border: none; justify-content: center; align-items: center; text-align: center; }
        .title-slide h1 { font-size: 32pt; margin-bottom: 15px; text-transform: uppercase; }
        .title-slide p { font-size: 16pt; opacity: 0.9; }
      </style>
    </head>
    <body>
      <!-- Slide 1: Bìa Bài Giảng -->
      <div class="slide title-slide">
        <h1>${title}</h1>
        <p>BÀI GIẢNG ĐIỆN TỬ TỰ ĐỘNG - HỌC ONLINE 2026-2027</p>
        <p style="font-size: 12pt; margin-top: 20px;">Tự động khởi tạo từ AI bóc tách tài liệu số</p>
      </div>

      <!-- Slide 2: Tóm Tắt Nội Dung Cốt Lõi -->
      <div class="slide">
        <div class="slide-title">📌 1. TỔNG QUAN NỘI DUNG BÀI HỌC</div>
        <div class="slide-body">
          <p>${summary}</p>
        </div>
        <div class="slide-footer">HỌC ONLINE 2026-2027 • Slide 2</div>
      </div>

      <!-- Slide 3+: Các Trọng Tâm Kiến Thức -->
      ${
        keyPoints.length > 0
          ? `
        <div class="slide">
          <div class="slide-title">🎯 2. TRỌNG TÂM KIẾN THỨC BẮT BUỘC GHI NHỚ</div>
          <div class="slide-body">
            <ul class="bullet-list">
              ${keyPoints.map((kp) => `<li class="bullet-item"><strong>${kp}</strong></li>`).join('')}
            </ul>
          </div>
          <div class="slide-footer">HỌC ONLINE 2026-2027 • Slide 3</div>
        </div>
      `
          : ''
      }

      <!-- Slide Kết Thúc -->
      <div class="slide title-slide" style="background: linear-gradient(135deg, #0f766e, #047857);">
        <h1>CẢM ƠN CÁC EM ĐÃ THEO DÕI!</h1>
        <p>Chúc các em ôn tập tốt và đạt kết quả cao trong các kỳ thi sắp tới.</p>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + pptxContent], { type: 'application/vnd.ms-powerpoint' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BaiGiang_${title.replace(/[^a-zA-Z0-9_]/g, '_')}.pptx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Xuất ngân hàng câu hỏi theo định dạng Moodle GIFT Format (.txt)
 */
export function exportToMoodleGIFT(title: string, questions: Question[]) {
  let giftText = `// ==========================================\n`;
  giftText += `// MOODLE GIFT FORMAT EXPORT - HỌC ONLINE\n`;
  giftText += `// Đề thi: ${title}\n`;
  giftText += `// ==========================================\n\n`;

  questions.forEach((q, idx) => {
    giftText += `// Câu hỏi ${idx + 1}\n`;
    giftText += `::Câu ${idx + 1} - ${q.topic || 'Chung'}:: ${q.content} {\n`;

    if (q.options && q.options.length > 0) {
      q.options.forEach((opt, optIdx) => {
        const isCorrect = optIdx === q.correctAnswer;
        giftText += `  ${isCorrect ? '=' : '~'}${opt}\n`;
      });
    }

    if (q.explanation) {
      giftText += `  #### ${q.explanation}\n`;
    }

    giftText += `}\n\n`;
  });

  const blob = new Blob([giftText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Moodle_GIFT_${title.replace(/[^a-zA-Z0-9_]/g, '_')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
