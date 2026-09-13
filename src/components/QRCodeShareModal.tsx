import React, { useEffect, useState, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Copy,
  Check,
  Download,
  Share2,
  X,
  ExternalLink,
  MessageCircle,
  Settings2,
  Globe,
} from 'lucide-react';

import { Subject, Question, EducationalGame } from '../types';
import { encodeExamPayload, encodeGamePayload } from '../utils/sharePayloadUtils';

interface QRCodeShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  type: 'exam' | 'game';
  targetId: string; // subjectId or gameId
  subject?: Subject;
  questions?: Question[];
  game?: EducationalGame;
  metaInfo?: {
    className?: string;
    grade?: string;
    questionsCount?: number;
    gameTypeLabel?: string;
  };
}

export const QRCodeShareModal: React.FC<QRCodeShareModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  type,
  targetId,
  subject,
  questions,
  game,
  metaInfo,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedIdCode, setCopiedIdCode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showUrlSettings, setShowUrlSettings] = useState(false);

  const handleCopyIdCodeOnly = async () => {
    try {
      await navigator.clipboard.writeText(targetId);
      setCopiedIdCode(true);
      setTimeout(() => setCopiedIdCode(false), 2500);
    } catch {
      const input = document.createElement('input');
      input.value = targetId;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedIdCode(true);
      setTimeout(() => setCopiedIdCode(false), 2500);
    }
  };

  // Persistent custom base URL (for sharing to students)
  const [customBaseUrl, setCustomBaseUrl] = useState<string>(() => {
    const saved = localStorage.getItem('edu_app_public_url') || '';
    if (saved.includes('ais-pre-')) {
      localStorage.removeItem('edu_app_public_url');
      return '';
    }
    return saved;
  });

  // Calculate actual base origin to use (defaults to live domain window.location.origin)
  const resolvedBaseUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      const liveUrl = `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, '');
      if (customBaseUrl && customBaseUrl.trim() && !customBaseUrl.includes('ais-pre-')) {
        return customBaseUrl.trim().replace(/\/+$/, '');
      }
      return liveUrl;
    }
    return '';
  }, [customBaseUrl]);

  const [useCompactZaloUrl, setUseCompactZaloUrl] = useState<boolean>(false);

  // Full URL embedding entire question set from AI
  const fullPayloadUrl = useMemo(() => {
    let url = `${resolvedBaseUrl}?${type}=${encodeURIComponent(targetId)}&role=student`;
    if (type === 'exam' && subject) {
      const payload = encodeExamPayload(subject, questions || []);
      if (payload) {
        url += `&payload=${payload}`;
      }
    } else if (type === 'game' && game) {
      const payload = encodeGamePayload(game);
      if (payload) {
        url += `&payload=${payload}`;
      }
    }
    return url;
  }, [resolvedBaseUrl, type, targetId, subject, questions, game]);

  // Clean short URL for Zalo direct 1-tap browser opening
  const shortShareUrl = useMemo(() => {
    return `${resolvedBaseUrl}?${type}=${encodeURIComponent(targetId)}&role=student`;
  }, [resolvedBaseUrl, type, targetId]);

  const shareUrl = useCompactZaloUrl ? shortShareUrl : fullPayloadUrl;

  useEffect(() => {
    if (!isOpen || !targetId) return;

    let isMounted = true;

    const generateQR = async (textToRender: string) => {
      try {
        const url = await QRCode.toDataURL(textToRender, {
          width: 360,
          margin: 1,
          errorCorrectionLevel: 'L',
          color: {
            dark: type === 'exam' ? '#0f766e' : '#4338ca',
            light: '#ffffff',
          },
        });
        if (isMounted) {
          setQrDataUrl(url);
        }
      } catch (err) {
        console.warn('QR code payload too large, rendering clean short URL QR:', err);
        try {
          const fallbackUrl = await QRCode.toDataURL(shortShareUrl, {
            width: 360,
            margin: 1,
            errorCorrectionLevel: 'L',
            color: {
              dark: type === 'exam' ? '#0f766e' : '#4338ca',
              light: '#ffffff',
            },
          });
          if (isMounted) {
            setQrDataUrl(fallbackUrl);
          }
        } catch (e2) {
          console.warn('Fallback QR rendering failed:', e2);
        }
      }
    };

    generateQR(shareUrl);

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetId, shareUrl, shortShareUrl, type]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyQRImage = async () => {
    if (!qrDataUrl) return;
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      try {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
      } catch (e) {
        console.warn('Direct image clipboard copy failed, triggering automatic download', e);
        handleDownloadQR();
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
      }
    } catch (err) {
      console.warn('Blob conversion failed', err);
      handleDownloadQR();
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    const cleanName = title.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_').slice(0, 30);
    a.download = `QR_${type === 'exam' ? 'DeThi' : 'TroChoi'}_${cleanName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShareZalo = () => {
    // Zalo or Web Share API
    if (navigator.share) {
      navigator
        .share({
          title: `Làm bài: ${title}`,
          text: `Mời các em học sinh truy cập làm ${type === 'exam' ? 'đề thi' : 'trò chơi'} "${title}":`,
          url: shareUrl,
        })
        .catch(() => {});
    } else {
      // Copy link for easy pasting into Zalo
      handleCopyLink();
      alert('Đã sao chép link truy cập trực tiếp! Bạn có thể dán (Ctrl+V) ngay vào khung chat Zalo của lớp.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div
          className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${
            type === 'exam' ? 'from-teal-500 to-emerald-500' : 'from-indigo-500 to-purple-500'
          }`}
        />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center space-x-3 mb-4">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 ${
              type === 'exam' ? 'bg-teal-600' : 'bg-indigo-600'
            }`}
          >
            <QrCode className="w-6 h-6" />
          </div>
          <div className="min-w-0 pr-6">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                type === 'exam'
                  ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300'
                  : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              {type === 'exam' ? 'Mã QR Đề Thi Trắc Nghiệm' : 'Mã QR Trò Chơi Học Tập'}
            </span>
            <h3 className="text-base font-bold text-slate-800 dark:text-white truncate mt-0.5">
              {title}
            </h3>
          </div>
        </div>

        {/* Subtitle / Meta */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4 text-xs">
          {metaInfo?.className && (
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold">
              Lớp {metaInfo.className}
            </span>
          )}
          {metaInfo?.questionsCount !== undefined && (
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
              {metaInfo.questionsCount} câu hỏi
            </span>
          )}
          {metaInfo?.gameTypeLabel && (
            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-bold">
              {metaInfo.gameTypeLabel}
            </span>
          )}
          {subtitle && (
            <p className="w-full text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {subtitle}
            </p>
          )}
        </div>

        {/* Unique Access Code Box */}
        <div className="mb-4 p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border-2 border-teal-300 dark:border-teal-700/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-teal-700 dark:text-teal-300 tracking-wider flex items-center space-x-1">
              <span>🔑 MÃ ID BÀI TẬP RIÊNG:</span>
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              (Chỉ gửi mã này cho học sinh)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex-1 text-center py-2 px-3 bg-white dark:bg-slate-900 rounded-xl border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-100 font-mono text-base font-extrabold tracking-widest shadow-inner truncate">
              {targetId}
            </div>
            <button
              type="button"
              onClick={handleCopyIdCodeOnly}
              className={`px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center space-x-1.5 shrink-0 ${
                copiedIdCode
                  ? 'bg-emerald-600 text-white'
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              }`}
              title="Sao chép chỉ duy nhất chuỗi Mã ID bài tập"
            >
              {copiedIdCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedIdCode ? 'Đã Chép Mã ID!' : 'Chép Mỗi Mã ID'}</span>
            </button>
          </div>
        </div>

        {/* QR Mode Toggle */}
        <div className="mb-3 flex items-center justify-between p-1 bg-slate-100 dark:bg-slate-900 rounded-xl text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setUseCompactZaloUrl(false)}
            className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center ${
              !useCompactZaloUrl
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Mã QR nhúng đầy đủ câu hỏi AI (Khuyên dùng - Khớp 100% nội dung)"
          >
            📦 Đóng Gói Đề AI (Khớp 100%)
          </button>
          <button
            type="button"
            onClick={() => setUseCompactZaloUrl(true)}
            className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center ${
              useCompactZaloUrl
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Mã QR link ngắn Zalo (Mở 1 chạm trên ứng dụng Zalo)"
          >
            ⚡ Link Rút Gọn Zalo
          </button>
        </div>

        {/* QR Code Presentation Box */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/80 flex flex-col items-center justify-center space-y-2">
          <div 
            onClick={handleCopyQRImage}
            className="p-2 bg-white rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-teal-500 dark:hover:border-teal-400 transition-all hover:scale-102 relative group"
            title="Bấm trực tiếp vào khung ảnh để sao chép ảnh Mã QR ngay"
          >
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Mã QR Bài Tập" className="w-[220px] h-[220px] object-contain block rounded-xl" />
            ) : (
              <div className="w-[220px] h-[220px] flex items-center justify-center text-xs text-slate-400 font-bold">
                Đang tạo mã QR...
              </div>
            )}
            {copiedImage && (
              <div className="absolute inset-0 bg-teal-900/85 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white text-xs font-extrabold space-y-1 animate-fadeIn">
                <Check className="w-8 h-8 text-emerald-400" />
                <span>Đã chép ảnh QR!</span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 max-w-xs">
            👉 Bấm vào hình QR để <strong>chép ảnh ngay</strong> hoặc nhập Mã ID <strong className="text-teal-600 font-mono">{targetId}</strong>.
          </p>
        </div>

        {/* Direct Link Input Box */}
        <div className="mt-4">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <Globe className="w-3.5 h-3.5 text-teal-600" />
              <span>Link chia sẻ trực tiếp (cho học sinh):</span>
            </span>
            <button
              type="button"
              onClick={() => setShowUrlSettings(!showUrlSettings)}
              className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1"
            >
              <Settings2 className="w-3 h-3" />
              <span>{showUrlSettings ? 'Đóng cấu hình' : 'Đổi tên miền'}</span>
            </button>
          </div>

          {/* Collapsible custom URL domain config */}
          {showUrlSettings && (
            <div className="mb-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 animate-fadeIn">
              <label className="text-[10px] text-slate-500 font-semibold block">
                Tên miền công khai của ứng dụng (dành cho học sinh mở trên điện thoại không bị báo lỗi "Page not found"):
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  value={customBaseUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomBaseUrl(val);
                    localStorage.setItem('edu_app_public_url', val);
                  }}
                  placeholder="https://ais-pre-...run.app hoặc domain của bạn"
                  className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCustomBaseUrl('');
                    localStorage.removeItem('edu_app_public_url');
                  }}
                  className="px-2.5 py-1 text-[10px] bg-teal-100 dark:bg-teal-900/60 hover:bg-teal-200 text-teal-800 dark:text-teal-200 font-bold rounded-lg transition-colors cursor-pointer"
                  title="Dùng lại tên miền trực tiếp hiện tại của ứng dụng"
                >
                  Dùng tên miền hiện tại
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onClick={handleCopyLink}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 truncate cursor-pointer font-mono select-all focus:ring-2 focus:ring-teal-500 outline-hidden"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`p-2 rounded-xl border text-xs font-bold transition-all shrink-0 flex items-center space-x-1 ${
                copiedLink
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
              title="Sao chép link"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Action Buttons: Copy Image, Download, Share Zalo */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {/* Copy QR Image */}
          <button
            type="button"
            onClick={handleCopyQRImage}
            className="py-2.5 px-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition-all active:scale-95"
            title="Sao chép ảnh mã QR vào bộ nhớ tạm để dán vào Zalo"
          >
            {copiedImage ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-bold text-emerald-600">Đã chép ảnh!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-[11px]">Chép ảnh QR</span>
              </>
            )}
          </button>

          {/* Download QR PNG */}
          <button
            type="button"
            onClick={handleDownloadQR}
            className="py-2.5 px-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition-all active:scale-95"
            title="Tải ảnh mã QR dạng file PNG về máy"
          >
            <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="text-[11px]">Tải file QR</span>
          </button>

          {/* Share to Zalo / Copy with notification */}
          <button
            type="button"
            onClick={handleShareZalo}
            className="py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition-all shadow-sm active:scale-95"
            title="Gửi hoặc chép link gửi nhóm Zalo lớp"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-[11px] font-bold">Gửi qua Zalo</span>
          </button>
        </div>

        {/* Cookie check / Safari warning and direct solution note */}
        <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
          <p className="font-semibold mb-0.5 flex items-center space-x-1">
            <span>💡 Lưu ý quan trọng khi học sinh mở trên điện thoại (Zalo / iPhone):</span>
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[11px]">
            <li>
              Nếu màn hình hiện <strong>"Action required to load your app / Cookie check"</strong>: Học sinh chỉ cần bấm nút <strong>"Authenticate in new window"</strong> màu xám (hoặc bấm dấu <strong>...</strong> ở góc màn hình Zalo chọn <strong>"Mở bằng trình duyệt Safari/Chrome"</strong>) là vào được ngay!
            </li>
            <li>
              <strong>Để học sinh không bao giờ bị hỏi màn hình này:</strong> Thầy/cô chỉ cần bấm <strong>Menu ba chấm (...) ➔ Deploy to Cloud Run</strong> trên thanh Google AI Studio. Ứng dụng sẽ thành trang web độc lập công khai 100%.
            </li>
          </ul>
        </div>

        {/* Footer info note */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center space-x-1">
            <Share2 className="w-3 h-3 text-teal-600 dark:text-teal-400" />
            <span>Học sinh mở link / quét mã sẽ vào thẳng màn hình làm bài!</span>
          </p>
        </div>
      </div>
    </div>
  );
};
