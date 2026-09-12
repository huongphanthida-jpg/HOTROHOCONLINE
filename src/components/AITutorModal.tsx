import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, User, Loader2, RotateCcw } from 'lucide-react';
import { askAITutor } from '../services/aiService';
import { marked } from 'marked';

interface Message {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  time: string;
}

interface AITutorModalProps {
  initialContext?: string;
}

export const AITutorModal: React.FC<AITutorModalProps> = ({ initialContext }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'tutor',
      text: `Xin chào em! Thầy/Cô là **Gia Sư AI HỌC ONLINE** 🎓
Em có bất kỳ thắc mắc nào về định lý, công thức, bài tập SGK hay cần mẹo giải nhanh, cứ hỏi Thầy/Cô nhé!`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'Mẹo tìm tiệm cận đứng và tiệm cận ngang Toán 12',
    'Phân biệt hiện tượng quang điện ngoài và quang điện trong',
    'Cách giải bài tập quy luật phân ly độc lập Menđen',
    'Cách phân biệt phản ứng este hóa và xà phòng hóa',
    'Mẹo ghi nhớ các thì tiếng Anh hay gặp trong đề thi',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim() || isLoading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const reply = await askAITutor(query.trim(), initialContext);
      const tutorMsg: Message = {
        id: `tut-${Date.now()}`,
        sender: 'tutor',
        text: reply,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, tutorMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'tutor',
        text: `Xin lỗi em, đã xảy ra lỗi kết nối: ${err.message || 'Vui lòng kiểm tra API Key trong Cài Đặt.'}`,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fadeIn" id="ai-tutor-panel">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>TRỢ GIẢNG AI BÁM SÁT SÁCH GIÁO KHOA</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Gia Sư Trực Tuyến 24/7
          </h2>
          <p className="text-teal-100 text-xs sm:text-sm max-w-xl leading-relaxed">
            Hỏi đáp mọi thắc mắc về kiến thức các môn Toán, Lý, Hóa, Sinh, Sử, Anh. Giải thích từng bước chi tiết, bẻ khóa các câu hỏi khó.
          </p>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl shrink-0 hidden sm:flex">
          🤖
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-[600px] overflow-hidden">
        {/* Messages Body */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${
                msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.sender === 'user'
                    ? 'bg-teal-600 text-white'
                    : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Speech Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-teal-600 text-white rounded-tr-none'
                    : 'bg-slate-50 dark:bg-slate-700/60 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                {msg.sender === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none break-words"
                    dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) as string }}
                  />
                )}
                <div
                  className={`text-[10px] mt-1.5 text-right ${
                    msg.sender === 'user' ? 'text-teal-200' : 'text-slate-400'
                  }`}
                >
                  {msg.time}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/60 rounded-2xl rounded-tl-none p-4 border border-slate-200/80 dark:border-slate-700 flex items-center space-x-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                <span>Thầy/Cô đang suy nghĩ và tra cứu sách giáo khoa...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt chips */}
        <div className="px-5 py-2.5 bg-slate-50/70 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700 overflow-x-auto flex items-center space-x-2 no-scrollbar">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0">Gợi ý:</span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="px-3 py-1 rounded-full bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-teal-900/40 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 text-xs border border-slate-200 dark:border-slate-600 shrink-0 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập câu hỏi lý thuyết, bài tập hoặc thắc mắc của em..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="p-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs hover:shadow-md transition-all disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Gửi câu hỏi"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
