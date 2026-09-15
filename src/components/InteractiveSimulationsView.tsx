import React, { useState, useEffect, useRef } from 'react';
import { 
  FlaskConical, 
  Activity, 
  LineChart, 
  Atom, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Sliders, 
  Info,
  Maximize2,
  Share2,
  Plus,
  Trash2,
  CheckCircle2,
  BookOpen,
  Code,
  Edit3
} from 'lucide-react';
import { AISimulationItem } from '../types';
import { CreateSimulationModal } from './CreateSimulationModal';
import { SimulationQRModal } from './SimulationQRModal';
import { EditSimulationModal } from './EditSimulationModal';

export const InteractiveSimulationsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('pendulum');
  const [editingSimulation, setEditingSimulation] = useState<AISimulationItem | null>(null);

  // AI Generated Simulations state
  const [aiSimulations, setAiSimulations] = useState<AISimulationItem[]>(() => {
    try {
      const saved = localStorage.getItem('eduexam_ai_simulations');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Lỗi đọc danh sách mô phỏng AI:', e);
    }
    return [];
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [qrModalSimulation, setQrModalSimulation] = useState<AISimulationItem | null>(null);

  // Active AI simulation iframe ref & key for forcing reload
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState<number>(Date.now());
  const [isPausedIframe, setIsPausedIframe] = useState<boolean>(false);

  // Save AI simulations to LocalStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('eduexam_ai_simulations', JSON.stringify(aiSimulations));
    } catch (e) {
      console.warn('Lỗi lưu danh sách mô phỏng AI:', e);
    }
  }, [aiSimulations]);

  const handleSimulationCreated = (newSim: AISimulationItem) => {
    setAiSimulations((prev) => [newSim, ...prev]);
    setActiveTab(newSim.id);
    setIframeKey(Date.now());
  };

  const handleDeleteSimulation = (simId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa mô phỏng thí nghiệm AI này?')) {
      setAiSimulations((prev) => prev.filter((s) => s.id !== simId));
      if (activeTab === simId) {
        setActiveTab('pendulum');
      }
    }
  };

  const handleSaveSimulation = (updatedSim: AISimulationItem) => {
    setAiSimulations((prev) => prev.map((s) => (s.id === updatedSim.id ? updatedSim : s)));
    setIframeKey(Date.now());
  };

  // --- 1. PHYSICS PENDULUM STATES ---
  const [length, setLength] = useState<number>(1.5); // meters
  const [mass, setMass] = useState<number>(0.5); // kg
  const [gravity, setGravity] = useState<number>(9.8); // m/s^2
  const [initialAngle, setInitialAngle] = useState<number>(30); // degrees
  const [isPlayingPhysics, setIsPlayingPhysics] = useState<boolean>(true);
  
  const pendulumCanvasRef = useRef<HTMLCanvasElement>(null);
  const physicsAnimRef = useRef<number | null>(null);
  const physicsTimeRef = useRef<number>(0);

  // --- 2. MATH GRAPH STATES ---
  const [funcType, setFuncType] = useState<'cubic' | 'fraction' | 'sin'>('cubic');
  const [coefA, setCoefA] = useState<number>(1);
  const [coefB, setCoefB] = useState<number>(0);
  const [coefC, setCoefC] = useState<number>(-3);
  const [coefD, setCoefD] = useState<number>(0);
  const [hoverX, setHoverX] = useState<number>(1);
  const mathCanvasRef = useRef<HTMLCanvasElement>(null);

  // --- 3. CHEMISTRY ATOM STATES ---
  const [selectedElement, setSelectedElement] = useState<string>('O');

  const elementsData: Record<string, { name: string; symbol: string; atomicNum: number; shells: number[]; desc: string }> = {
    H: { name: 'Hidro', symbol: 'H', atomicNum: 1, shells: [1], desc: 'Khí nhẹ nhất, chiếm phần lớn khối lượng vũ trụ.' },
    C: { name: 'Cacbon', symbol: 'C', atomicNum: 6, shells: [2, 4], desc: 'Nền tảng cấu tạo của mọi hợp chất hữu cơ & sự sống.' },
    O: { name: 'Oxi', symbol: 'O', atomicNum: 8, shells: [2, 6], desc: 'Duy trì sự sống, chiếm 21% thể tích không khí.' },
    Na: { name: 'Natri', symbol: 'Na', atomicNum: 11, shells: [2, 8, 1], desc: 'Kim loại kiềm mềm, phản ứng mãnh liệt với nước.' },
    Fe: { name: 'Sắt', symbol: 'Fe', atomicNum: 26, shells: [2, 8, 14, 2], desc: 'Kim loại chuyển tiếp, thành phần chính của vỏ Trái Đất & máu.' },
  };

  // --- PHYSICS PENDULUM ANIMATION LOOP ---
  useEffect(() => {
    if (activeTab !== 'pendulum') return;
    const canvas = pendulumCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTimestamp = performance.now();

    const renderPhysics = (timestamp: number) => {
      const dt = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      if (isPlayingPhysics) {
        physicsTimeRef.current += dt;
      }

      const t = physicsTimeRef.current;
      const omega = Math.sqrt(gravity / length); // Tần số góc ω = √(g/L)
      const theta0 = (initialAngle * Math.PI) / 180;
      const currentTheta = theta0 * Math.cos(omega * t); // θ(t) = θ₀ cos(ωt)
      const currentOmega = -theta0 * omega * Math.sin(omega * t); // dθ/dt

      const width = canvas.width;
      const height = canvas.height;
      const originX = width / 2;
      const originY = 60;
      const pixelLength = length * 110; // Scale length to pixels

      const bobX = originX + pixelLength * Math.sin(currentTheta);
      const bobY = originY + pixelLength * Math.cos(currentTheta);

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw Pivot Ceiling
      ctx.fillStyle = '#64748b';
      ctx.fillRect(originX - 50, originY - 10, 100, 10);
      ctx.beginPath();
      ctx.arc(originX, originY, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#0d9488';
      ctx.fill();

      // Draw String
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(bobX, bobY);
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw Bob (Mass)
      const radius = 14 + mass * 8;
      ctx.beginPath();
      ctx.arc(bobX, bobY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#059669';
      ctx.shadowColor = 'rgba(5, 150, 105, 0.4)';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Energy Bars
      const h_max = length * (1 - Math.cos(theta0));
      const h_curr = length * (1 - Math.cos(currentTheta));
      const Et = mass * gravity * h_curr; // Thế năng E_t
      const Ek = 0.5 * mass * Math.pow(length * currentOmega, 2); // Động năng E_k
      const E_total = mass * gravity * h_max || 0.001;

      const barWidth = 14;
      const barMaxHeight = 100;
      const barX = width - 70;
      const barY = height - 40;

      // Et bar (Blue)
      const hEt = (Et / E_total) * barMaxHeight;
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(barX, barY - hEt, barWidth, hEt);
      ctx.fillStyle = '#0284c7';
      ctx.font = '10px sans-serif';
      ctx.fillText('Et (Thế)', barX - 10, barY + 15);

      // Ek bar (Rose)
      const hEk = (Ek / E_total) * barMaxHeight;
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(barX + 25, barY - hEk, barWidth, hEk);
      ctx.fillStyle = '#e11d48';
      ctx.fillText('Ek (Động)', barX + 18, barY + 15);

      physicsAnimRef.current = requestAnimationFrame(renderPhysics);
    };

    physicsAnimRef.current = requestAnimationFrame(renderPhysics);

    return () => {
      if (physicsAnimRef.current) cancelAnimationFrame(physicsAnimRef.current);
    };
  }, [activeTab, length, mass, gravity, initialAngle, isPlayingPhysics]);

  // --- MATH GRAPH CANVAS DRAWING ---
  useEffect(() => {
    if (activeTab !== 'math_graph') return;
    const canvas = mathCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const originX = width / 2;
    const originY = height / 2;
    const scale = 35; // 35 pixels per unit

    ctx.clearRect(0, 0, width, height);

    // Draw Grid Lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;

    for (let x = originX % scale; x < width; x += scale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = originY % scale; y < height; y += scale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw Axes Ox & Oy
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    ctx.fillText('x', width - 15, originY - 8);
    ctx.fillText('y', originX + 8, 15);

    // Function Evaluator
    const evalF = (x: number) => {
      if (funcType === 'cubic') {
        return coefA * Math.pow(x, 3) + coefB * Math.pow(x, 2) + coefC * x + coefD;
      } else if (funcType === 'fraction') {
        const denom = coefC * x + coefD;
        if (Math.abs(denom) < 0.001) return NaN;
        return (coefA * x + coefB) / denom;
      } else {
        return coefA * Math.sin(coefB * x);
      }
    };

    // Derivative Evaluator f'(x)
    const evalDeriv = (x: number) => {
      const h = 0.0001;
      const y1 = evalF(x - h);
      const y2 = evalF(x + h);
      if (isNaN(y1) || isNaN(y2)) return 0;
      return (y2 - y1) / (2 * h);
    };

    // Draw Function Curve
    ctx.beginPath();
    ctx.strokeStyle = '#0d9488';
    ctx.lineWidth = 3;

    let firstPoint = true;
    for (let px = 0; px < width; px += 2) {
      const x = (px - originX) / scale;
      const y = evalF(x);

      if (isNaN(y) || Math.abs(y) > 20) {
        firstPoint = true;
        continue;
      }

      const py = originY - y * scale;

      if (firstPoint) {
        ctx.moveTo(px, py);
        firstPoint = false;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // Draw Tangent Line at hoverX
    const y0 = evalF(hoverX);
    if (!isNaN(y0)) {
      const slope = evalDeriv(hoverX);
      const px0 = originX + hoverX * scale;
      const py0 = originY - y0 * scale;

      // Tangent point
      ctx.beginPath();
      ctx.arc(px0, py0, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#e11d48';
      ctx.fill();

      // Tangent line: y - y0 = m (x - hoverX)
      ctx.beginPath();
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      const dx = 3;
      const x1 = hoverX - dx;
      const y1 = y0 - slope * dx;
      const x2 = hoverX + dx;
      const y2 = y0 + slope * dx;

      ctx.moveTo(originX + x1 * scale, originY - y1 * scale);
      ctx.lineTo(originX + x2 * scale, originY - y2 * scale);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [activeTab, funcType, coefA, coefB, coefC, coefD, hoverX]);

  // Derived values for Physics
  const periodT = (2 * Math.PI * Math.sqrt(length / gravity)).toFixed(2);
  const frequencyF = (1 / parseFloat(periodT)).toFixed(2);

  // Active AI Simulation if selected
  const activeAISim = aiSimulations.find((s) => s.id === activeTab);

  const handleFullscreenIframe = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner with Prominent AI Upload Button */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-700 p-6 md:p-8 text-white shadow-xl shadow-teal-900/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-white/20 backdrop-blur-md text-teal-100 tracking-wider">
              PHÒNG THÍ NGHIỆM ẢO P5.JS &amp; AI
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Mô Phỏng Thí Nghiệm Ảo Tương Tác
            </h1>
            <p className="text-teal-100 text-xs sm:text-sm leading-relaxed">
              Trực quan hóa công thức Toán học, thí nghiệm Vật lý dao động cơ, mô hình Hóa học 3D thời gian thực và tự động tạo mô phỏng mới từ tài liệu SGK bằng AI.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-teal-950 font-black text-xs sm:text-sm shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 shrink-0 border border-white/30"
          >
            <Sparkles className="w-5 h-5 text-teal-950 animate-bounce" />
            <span>+ Tải Tài Liệu &amp; Tạo Mô Phỏng Bằng AI</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('pendulum')}
          className={`flex-1 min-w-[160px] flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'pendulum'
              ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Vật Lý: Con Lắc Đơn</span>
        </button>

        <button
          onClick={() => setActiveTab('math_graph')}
          className={`flex-1 min-w-[160px] flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'math_graph'
              ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <LineChart className="w-4 h-4" />
          <span>Toán: Đồ Thị Hàm Số</span>
        </button>

        <button
          onClick={() => setActiveTab('atom')}
          className={`flex-1 min-w-[160px] flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'atom'
              ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Atom className="w-4 h-4" />
          <span>Hóa: Cấu Trúc Nguyên Tử</span>
        </button>

        {/* AI Generated Simulations list in tabs */}
        {aiSimulations.map((sim) => (
          <div key={sim.id} className="relative group flex items-center">
            <button
              onClick={() => {
                setActiveTab(sim.id);
                setIframeKey(Date.now());
              }}
              className={`flex-1 min-w-[180px] flex items-center justify-between space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                activeTab === sim.id
                  ? 'bg-gradient-to-r from-purple-600 to-teal-600 text-white border-purple-500 shadow-md'
                  : 'bg-purple-50/60 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800 hover:bg-purple-100'
              }`}
            >
              <div className="flex items-center space-x-1.5 truncate">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">{sim.title}</span>
              </div>
              <div className="flex items-center space-x-1 shrink-0 ml-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSimulation(sim);
                  }}
                  className="opacity-60 hover:opacity-100 p-0.5 rounded hover:bg-amber-500 hover:text-white transition-all"
                  title="Chỉnh sửa nội dung mô phỏng"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteSimulation(sim.id, e)}
                  className="opacity-60 hover:opacity-100 p-0.5 rounded hover:bg-rose-500 hover:text-white transition-all"
                  title="Xóa mô phỏng này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* --- AI GENERATED SIMULATION VIEW (SANDBOXED IFRAME RUNNER) --- */}
      {activeAISim && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-600 text-white font-extrabold text-[10px]">
                  Mô phỏng AI p5.js
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold text-[10px]">
                  {activeAISim.subject}
                </span>
              </div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white">
                {activeAISim.title}
              </h3>
              {activeAISim.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{activeAISim.description}</p>
              )}
            </div>

            {/* Runner Control Toolbar */}
            <div className="flex items-center space-x-2 self-end sm:self-auto flex-wrap gap-y-2">
              <button
                type="button"
                onClick={() => setEditingSimulation(activeAISim)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs"
                title="Chỉnh sửa nội dung mô phỏng"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chỉnh sửa nội dung</span>
              </button>

              <button
                type="button"
                onClick={() => setIframeKey(Date.now())}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold flex items-center space-x-1.5 transition-colors"
                title="Chạy lại mô phỏng"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Chạy lại</span>
              </button>

              <button
                type="button"
                onClick={handleFullscreenIframe}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold flex items-center space-x-1.5 transition-colors"
                title="Toàn màn hình"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Toàn màn hình</span>
              </button>

              <button
                type="button"
                onClick={() => setQrModalSimulation(activeAISim)}
                className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-md"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Xuất Mã QR / Link Thí Nghiệm</span>
              </button>
            </div>
          </div>

          {/* Sandboxed iframe Runner */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 shadow-inner">
            <iframe
              key={iframeKey}
              ref={iframeRef}
              title={activeAISim.title}
              srcDoc={activeAISim.code}
              sandbox="allow-scripts allow-same-origin allow-modals"
              className="w-full h-[540px] border-0 bg-slate-950"
            />
          </div>
        </div>
      )}

      {/* --- TAB 1: PENDULUM SIMULATION --- */}
      {activeTab === 'pendulum' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Canvas Box */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center space-x-2">
                <Activity className="w-4 h-4 text-teal-600" />
                <span>Mô Phỏng Chuyển Động Con Lắc Đơn</span>
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsPlayingPhysics(!isPlayingPhysics)}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold flex items-center space-x-1 hover:bg-teal-700 transition-colors"
                >
                  {isPlayingPhysics ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlayingPhysics ? 'Tạm Dừng' : 'Chạy'}</span>
                </button>
                <button
                  onClick={() => (physicsTimeRef.current = 0)}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                  title="Đặt lại thời gian"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative flex justify-center bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800">
              <canvas ref={pendulumCanvasRef} width={500} height={320} className="w-full max-w-[500px]" />
            </div>

            {/* Formula Reference Box */}
            <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800 rounded-xl text-xs flex items-center justify-between text-teal-800 dark:text-teal-200">
              <div className="space-y-0.5">
                <span className="font-bold">Công thức Chu kỳ Chuẩn SGK Vật lý 12:</span>
                <p className="font-mono text-[11px] text-teal-600 dark:text-teal-400">T = 2π √(L / g) = {periodT} (giây) | Tần số f = 1/T = {frequencyF} (Hz)</p>
              </div>
              <span className="px-2 py-1 rounded-lg bg-teal-600 text-white font-bold text-[10px]">SGK Lý 12</span>
            </div>
          </div>

          {/* Controls Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-5">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Sliders className="w-4 h-4 text-teal-600" />
              <span>Điều Chỉnh Thông Số Thí Nghiệm</span>
            </h3>

            {/* Length slider */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Chiều dài dây (L):</span>
                <span className="font-bold text-teal-600">{length} m</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={length}
                onChange={(e) => setLength(parseFloat(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
            </div>

            {/* Mass slider */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Khối lượng vật (m):</span>
                <span className="font-bold text-teal-600">{mass} kg</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={mass}
                onChange={(e) => setMass(parseFloat(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
            </div>

            {/* Gravity slider */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Gia tốc trọng trường (g):</span>
                <span className="font-bold text-teal-600">{gravity} m/s²</span>
              </div>
              <input
                type="range"
                min="1.6"
                max="20.0"
                step="0.2"
                value={gravity}
                onChange={(e) => setGravity(parseFloat(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
            </div>

            {/* Initial Angle slider */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Góc lệch ban đầu (α₀):</span>
                <span className="font-bold text-teal-600">{initialAngle}°</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={initialAngle}
                onChange={(e) => setInitialAngle(parseInt(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-[11px] text-slate-500 space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">💡 Kiến thức trọng tâm:</span>
              <p>Thế năng đạt cực đại tại 2 biên. Động năng đạt cực đại tại vị trí cân bằng (thấp nhất).</p>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: MATH GRAPH SIMULATION --- */}
      {activeTab === 'math_graph' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center space-x-2">
                <LineChart className="w-4 h-4 text-teal-600" />
                <span>Đồ Thị Hàm Số &amp; Tiếp Tuyến Đạo Hàm tại Point x₀</span>
              </h3>
              <span className="text-xs font-mono bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded-lg">
                x₀ = {hoverX.toFixed(1)}
              </span>
            </div>

            <div className="relative flex justify-center bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800">
              <canvas ref={mathCanvasRef} width={500} height={320} className="w-full max-w-[500px]" />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">Ý nghĩa Hệ số góc Tiếp tuyến k = f'(x₀):</span>
              <p className="text-slate-500 text-[11px]">Đường màu đỏ đứt nét biểu diễn tiếp tuyến của đồ thị tại điểm x₀. Hệ số góc bằng đạo hàm bậc nhất của hàm số tại x₀.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-5">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Sliders className="w-4 h-4 text-teal-600" />
              <span>Cấu Hình Hàm Số SGK 12</span>
            </h3>

            {/* Select Function Type */}
            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Loại Hàm Số:</label>
              <select
                value={funcType}
                onChange={(e) => setFuncType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
              >
                <option value="cubic">Hàm bậc ba: y = ax³ + bx² + cx + d</option>
                <option value="fraction">Hàm nhất biến: y = (ax + b)/(cx + d)</option>
                <option value="sin">Hàm lượng giác: y = a.sin(b.x)</option>
              </select>
            </div>

            {/* Sliders for coefficients */}
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-semibold">
                  <span>Hệ số a:</span>
                  <span className="text-teal-600 font-bold">{coefA}</span>
                </div>
                <input
                  type="range"
                  min="-3"
                  max="3"
                  step="0.5"
                  value={coefA}
                  onChange={(e) => setCoefA(parseFloat(e.target.value))}
                  className="w-full accent-teal-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold">
                  <span>Hệ số b:</span>
                  <span className="text-teal-600 font-bold">{coefB}</span>
                </div>
                <input
                  type="range"
                  min="-4"
                  max="4"
                  step="0.5"
                  value={coefB}
                  onChange={(e) => setCoefB(parseFloat(e.target.value))}
                  className="w-full accent-teal-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold">
                  <span>Hệ số c:</span>
                  <span className="text-teal-600 font-bold">{coefC}</span>
                </div>
                <input
                  type="range"
                  min="-4"
                  max="4"
                  step="0.5"
                  value={coefC}
                  onChange={(e) => setCoefC(parseFloat(e.target.value))}
                  className="w-full accent-teal-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold">
                  <span>Vị trí tiếp điểm (x₀):</span>
                  <span className="text-rose-600 font-bold">{hoverX}</span>
                </div>
                <input
                  type="range"
                  min="-3"
                  max="3"
                  step="0.2"
                  value={hoverX}
                  onChange={(e) => setHoverX(parseFloat(e.target.value))}
                  className="w-full accent-rose-600"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: CHEMISTRY ATOM SIMULATION --- */}
      {activeTab === 'atom' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center space-x-2">
                <Atom className="w-5 h-5 text-teal-600" />
                <span>Mô Hình Nguyên Tử Bohr &amp; Cấu Hình Electron</span>
              </h3>
              <p className="text-xs text-slate-500">Chọn nguyên tố hóa học để trực quan hóa lớp vỏ Electron trong không gian.</p>
            </div>

            <div className="flex items-center space-x-2">
              {Object.keys(elementsData).map((sym) => (
                <button
                  key={sym}
                  onClick={() => setSelectedElement(sym)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                    selectedElement === sym
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* Atom Display Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="relative flex items-center justify-center h-72 bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden">
              {/* Nucleus */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white font-extrabold text-xs shadow-lg shadow-rose-500/50 z-10">
                {selectedElement}
              </div>

              {/* Electron Shells */}
              {elementsData[selectedElement].shells.map((count, shellIdx) => {
                const radius = 55 + shellIdx * 35;
                return (
                  <div
                    key={shellIdx}
                    className="absolute border border-teal-500/40 rounded-full flex items-center justify-center animate-spin"
                    style={{
                      width: radius * 2,
                      height: radius * 2,
                      animationDuration: `${(shellIdx + 1) * 6}s`,
                    }}
                  >
                    {Array.from({ length: count }).map((_, eIdx) => {
                      const angle = (eIdx * 2 * Math.PI) / count;
                      const ex = radius * Math.cos(angle);
                      const ey = radius * Math.sin(angle);
                      return (
                        <div
                          key={eIdx}
                          className="absolute w-3 h-3 rounded-full bg-teal-400 shadow-md shadow-teal-400/80"
                          style={{
                            transform: `translate(${ex}px, ${ey}px)`,
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Element Info */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-extrabold text-teal-800 dark:text-teal-200">
                    {elementsData[selectedElement].name} ({elementsData[selectedElement].symbol})
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-teal-600 text-white font-bold text-xs">
                    Z = {elementsData[selectedElement].atomicNum}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {elementsData[selectedElement].desc}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-200 block">
                  Phân bố Electron trên các lớp:
                </span>
                <div className="flex items-center space-x-3 font-mono">
                  {elementsData[selectedElement].shells.map((cnt, idx) => (
                    <div key={idx} className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-xs">
                      <span className="text-slate-400">Lớp {idx + 1}:</span>{' '}
                      <span className="font-bold text-teal-600 dark:text-teal-400">{cnt} e⁻</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE SIMULATION MODAL --- */}
      <CreateSimulationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSimulationCreated={handleSimulationCreated}
      />

      {/* --- EDIT SIMULATION MODAL --- */}
      <EditSimulationModal
        isOpen={!!editingSimulation}
        onClose={() => setEditingSimulation(null)}
        simulation={editingSimulation}
        onSaveSimulation={handleSaveSimulation}
      />

      {/* --- SIMULATION QR SHARE MODAL --- */}
      <SimulationQRModal
        isOpen={!!qrModalSimulation}
        onClose={() => setQrModalSimulation(null)}
        simulation={qrModalSimulation}
      />
    </div>
  );
};

export default InteractiveSimulationsView;
