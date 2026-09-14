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
  Maximize2,
  FlaskConical,
  Sparkles,
} from 'lucide-react';
import { AISimulationItem } from '../types';
import { encodeSimulationPayload } from '../utils/sharePayloadUtils';

interface SimulationQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulation: AISimulationItem | null;
}

export const SimulationQRModal: React.FC<SimulationQRModalProps> = ({
  isOpen,
  onClose,
  simulation,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedIdCode, setCopiedIdCode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isEnlargedQrOpen, setIsEnlargedQrOpen] = useState(false);

  // Resolved base URL for student access
  const resolvedBaseUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('edu_app_public_url') || '';
      if (saved && saved.trim()) return saved.trim().replace(/\/+$/, '');
      const liveUrl = `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, '');
      if (liveUrl.includes('localhost') || liveUrl.includes('127.0.0.1')) {
        return 'https://hotrohoconline.vercel.app';
      }
      return liveUrl;
    }
    return 'https://hotrohoconline.vercel.app';
  }, []);

  // Encoded share payload & URL
  const sharePayload = useMemo(() => {
    if (!simulation) return '';
    return encodeSimulationPayload(simulation);
  }, [simulation]);

  const fullShareUrl = useMemo(() => {
    if (!simulation || !sharePayload) return '';
    return `${resolvedBaseUrl}/?simData=${encodeURIComponent(sharePayload)}&t=${Date.now()}`;
  }, [resolvedBaseUrl, simulation, sharePayload]);

  // Generate QR Code with errorCorrectionLevel: 'L' for ultra-fast scanning
  useEffect(() => {
    if (!isOpen || !fullShareUrl) return;

    let isMounted = true;
    QRCode.toDataURL(fullShareUrl, {
      errorCorrectionLevel: 'L',
      margin: 2,
      scale: 8,
      color: {
        dark: '#0f766e', // Teal 700 theme
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.warn('Error generating simulation QR code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, fullShareUrl]);

  if (!isOpen || !simulation) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      const input = document.createElement('input');
      input.value = fullShareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyIdCode = async () => {
    try {
      await navigator.clipboard.writeText(simulation.id);
      setCopiedIdCode(true);
      setTimeout(() => setCopiedIdCode(false), 2500);
    } catch {
      const input = document.createElement('input');
      input.value = simulation.id;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedIdCode(true);
      setTimeout(() => setCopiedIdCode(false), 2500);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `Ma_QR_Thi_Nghiem_${simulation.subject}_${simulation.title.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0 relative my-8">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
                <span>Xuất Mã QR Thí Nghiệm Ảo</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-teal-950 text-[10px] font-black uppercase">
                  {simulation.subject}
                </span>
              </h3>
              <p className="text-teal-100 text-xs truncate max-w-xs">{simulation.title}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 flex flex-col items-center">
          {/* QR Code Container */}
          <div className="relative group p-4 bg-white rounded-3xl border-2 border-teal-500/30 shadow-xl flex flex-col items-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code Thí nghiệm ảo"
                className="w-52 h-52 object-contain rounded-2xl"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-teal-600">
                <QrCode className="w-12 h-12 animate-pulse" />
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsEnlargedQrOpen(true)}
              className="absolute top-2 right-2 p-2 rounded-xl bg-slate-900/80 text-white hover:bg-slate-900 transition-colors shadow-md"
              title="Phóng to mã QR"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400 px-4">
            Học sinh dùng Zalo hoặc camera điện thoại quét mã QR để vào thẳng màn hình thực hành thí nghiệm ảo độc lập (ẩn Sidebar quản trị).
          </p>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs font-bold flex items-center justify-center space-x-2 hover:bg-teal-100 transition-all"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Đã sao chép Link!' : 'Sao chép Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadQr}
              className="px-4 py-2.5 rounded-2xl bg-teal-600 text-white text-xs font-bold flex items-center justify-center space-x-2 hover:bg-teal-700 transition-all shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Tải Mã QR (PNG)</span>
            </button>
          </div>

          {/* ID Code box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 w-full flex items-center justify-between text-xs">
            <div className="truncate pr-2">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Mã ID Thí nghiệm:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">{simulation.id}</span>
            </div>

            <button
              type="button"
              onClick={handleCopyIdCode}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-100 transition-colors shrink-0"
            >
              {copiedIdCode ? 'Đã chép ID!' : 'Chép ID'}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <a
            href={fullShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1"
          >
            <span>Thử mở trên Tab mới</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-bold text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Enlarged QR Modal */}
      {isEnlargedQrOpen && qrDataUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setIsEnlargedQrOpen(false)}
        >
          <div className="p-6 bg-white rounded-3xl shadow-2xl flex flex-col items-center space-y-4 max-w-sm">
            <img src={qrDataUrl} alt="Mã QR phóng to" className="w-72 h-72 object-contain" />
            <span className="text-sm font-extrabold text-slate-800 text-center">{simulation.title}</span>
            <p className="text-xs text-slate-500 text-center">Bấm bất kỳ đâu để đóng</p>
          </div>
        </div>
      )}
    </div>
  );
};
