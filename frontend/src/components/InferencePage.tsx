import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, X, ShieldAlert, Zap, Layers, RefreshCcw, Eye, EyeOff, Info, Activity, Video, Image as ImageIcon, Maximize2, BarChart3, Gauge } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { InferenceResult, DensityLevel, AnalysisMode } from '../types';

export default function InferencePage() {
  const [mode, setMode] = useState<AnalysisMode>('image');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [showDensityMap, setShowDensityMap] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: 1280, height: 720 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setMode('stream');
        setSelectedFile(null);
        setPreviewUrl(null);
        startStreamingAnalysis();
      }
    } catch (err) {
      setError('无法访问摄像头，请检查权限。');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const startStreamingAnalysis = useCallback(() => {
    const analyze = async () => {
      if (mode === 'stream' && streamRef.current) {
        try {
          // In a real app, capture frame and send to server
          const response = await fetch('/v1/predict', { method: 'POST', body: JSON.stringify({ source: 'stream' }) });
          const data = await response.json();
          setResult({ ...data, timestamp: new Date().toLocaleTimeString(), fps: 15 });
        } catch (e) {
          console.error("Stream analysis error", e);
        }
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        // Slow down the mock analysis to avoid flooding
        setTimeout(analyze, 1000); 
      });
    };
    analyze();
  }, [mode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        stopCamera();
        setMode('image');
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setResult(null);
        setError(null);
      } else {
        setError('请上传有效的图片文件');
      }
    }
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch('/v1/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: 'base64_simulated' }),
      });
      if (!response.ok) throw new Error('模型服务不可用');
      const data = await response.json();
      setResult({ ...data, timestamp: new Date().toLocaleTimeString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Render Density Visualization
  useEffect(() => {
    if (result && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (showDensityMap) {
        // Render spatial density grid
        const cellW = width / 8;
        const cellH = height / 8;

        result.densityGrid.forEach(cell => {
          const x = cell.col * cellW;
          const y = cell.row * cellH;
          
          // Density Map Level (Colored Gradient)
          const alpha = cell.density * 0.7;
          let color = '248, 81, 73'; // Red default
          if (cell.density < 0.3) color = '63, 185, 80'; // Low
          else if (cell.density < 0.6) color = '210, 153, 34'; // Moderate
          
          ctx.fillStyle = `rgba(${color}, ${alpha})`;
          ctx.fillRect(x, y, cellW, cellH);

          // Optional Grid Lines
          if (showGrid) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.strokeRect(x, y, cellW, cellH);
          }
        });
      }
    }
  }, [result, showDensityMap, showGrid]);

  const levelConfig: Record<DensityLevel, { label: string, color: string, suggestion: string, bg: string }> = {
    'Low': { label: '低密度', color: 'text-accent-green', bg: 'bg-accent-green/20', suggestion: '当前空间分布均匀且松散，无需限制。' },
    'Moderate': { label: '中等密度', color: 'text-accent-orange', bg: 'bg-accent-orange/20', suggestion: '局部出现聚集，建议关注出入口流向。' },
    'High': { label: '高密度', color: 'accent-red-text', bg: 'bg-accent-red/20', suggestion: '区域呈块状密集分布，建议启动分流引导。' },
    'Overcrowded': { label: '极度拥挤', color: 'accent-red-text', bg: 'bg-accent-red/20', suggestion: '密集度突破安全阈值值，立即实施硬性限流！' }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex bg-brand-card p-1 rounded-xl border border-brand-border">
          <button 
            onClick={() => { stopCamera(); setMode('image'); setResult(null); }}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all", mode === 'image' ? "bg-accent-blue text-white" : "text-[#8B949E] hover:text-white")}
          >
            <ImageIcon size={16} /> 图片评估
          </button>
          <button 
            onClick={startCamera}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all", mode === 'stream' ? "bg-accent-blue text-white" : "text-[#8B949E] hover:text-white")}
          >
            <Video size={16} /> 实时流接入
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-brand-card border border-brand-border rounded-xl">
             <span className="text-[10px] text-[#8B949E] uppercase font-bold tracking-widest">渲染配置:</span>
             <button 
               onClick={() => setShowDensityMap(!showDensityMap)}
               className={cn("p-1.5 rounded transition-colors", showDensityMap ? "text-accent-blue bg-accent-blue/10" : "text-[#8B949E]")}
               title="密度热力图"
             >
               <Layers size={16} />
             </button>
             <button 
               onClick={() => setShowGrid(!showGrid)}
               className={cn("p-1.5 rounded transition-colors", showGrid ? "text-accent-blue bg-accent-blue/10" : "text-[#8B949E]")}
               title="网格结构"
             >
               <Maximize2 size={16} />
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main View Port */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="glass-panel relative aspect-video overflow-hidden group rounded-2xl bg-black/40">
            {mode === 'image' ? (
              previewUrl ? (
                <img src={previewUrl} alt="Analysis Source" className="w-full h-full object-contain pointer-events-none" referrerPolicy="no-referrer" />
              ) : (
                <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="w-16 h-16 border-2 border-brand-border border-dashed rounded-full flex items-center justify-center mb-4 text-[#8B949E]">
                    <Upload size={32} />
                  </div>
                  <p className="text-[#8B949E] text-sm">点击或拖拽图片进行评估</p>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </div>
              )
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale-[30%]" />
            )}

            <canvas ref={canvasRef} width={1280} height={720} className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-screen opacity-90" />

            {/* View Port Overlays */}
            <div className="absolute top-4 left-4 flex gap-2">
              <div className="bg-black/80 backdrop-blur px-3 py-1.5 rounded-lg border border-brand-border flex items-center gap-2">
                 <div className={cn("w-2 h-2 rounded-full", mode === 'stream' ? "bg-red-500 animate-pulse" : "bg-accent-blue")} />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                   {mode === 'stream' ? 'LIVE STREAM' : 'STATIC IMAGE'}
                 </span>
              </div>
            </div>

            {isAnalyzing && (
              <div className="absolute inset-0 bg-brand-bg/40 backdrop-blur-[2px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                  <p className="text-white text-xs font-bold tracking-widest uppercase">计算空间张量中...</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          {mode === 'image' && selectedFile && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end gap-3">
               <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); setResult(null); }} className="px-6 py-2.5 rounded-xl border border-brand-border text-sm font-bold text-[#8B949E] hover:text-white transition-colors">
                 取消
               </button>
               <button onClick={analyzeImage} disabled={isAnalyzing} className="px-8 py-2.5 rounded-xl bg-accent-blue text-white text-sm font-bold shadow-lg shadow-accent-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                 {isAnalyzing ? '分析中...' : '开始评估'}
               </button>
            </motion.div>
          )}
        </div>

        {/* Diagnostic Panel */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-panel p-8 flex flex-col items-center justify-center text-center text-[#8B949E] h-full">
                <Gauge size={48} className="mb-4 opacity-10" />
                <p className="text-xs uppercase tracking-widest leading-relaxed">等待模型回显数据<br/>Spatial Tensor Pending</p>
              </motion.div>
            ) : (
              <motion.div key="diag" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                {/* Result Headline */}
                <div className={cn("glass-panel p-6 text-center overflow-hidden relative", result.level === 'Overcrowded' && "glow-red")}>
                  <p className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest mb-6">密度评估结论</p>
                  <p className={cn("text-5xl font-black mb-2 tracking-tighter", levelConfig[result.level].color)}>
                    {levelConfig[result.level].label}
                  </p>
                  <div className={cn("inline-block px-4 py-1 rounded-full text-[10px] font-bold uppercase border", levelConfig[result.level].bg, levelConfig[result.level].color, "border-current opacity-60")}>
                    {result.level} Estimation
                  </div>
                </div>

                {/* Spatial vs Absolute Count */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="glass-panel p-4">
                     <p className="text-[9px] font-bold text-[#8B949E] uppercase tracking-widest mb-3">区域总计 (Count)</p>
                     <p className="text-3xl font-light text-white font-mono">{result.totalCount}</p>
                     <div className="mt-2 text-[9px] text-accent-blue font-bold uppercase">Absolute Value</div>
                   </div>
                   <div className="glass-panel p-4">
                     <p className="text-[9px] font-bold text-[#8B949E] uppercase tracking-widest mb-3">平均密度 (Density)</p>
                     <p className="text-3xl font-light text-white font-mono">{result.averageDensity}<span className="text-xs">/m²</span></p>
                     <div className="mt-2 text-[9px] text-accent-green font-bold uppercase">Spatial Map Ave</div>
                   </div>
                </div>

                {/* Granular Insights */}
                <div className="glass-panel p-5 space-y-4">
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2">
                    <BarChart3 size={14} className="text-accent-blue" />
                    Spatial Diagnostics
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <div className="flex justify-between text-[10px] uppercase font-bold text-[#8B949E]">
                         <span>峰值密集度 (Peak)</span>
                         <span className="text-white">{(result.peakDensity * 100).toFixed(0)}%</span>
                       </div>
                       <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-accent-blue rounded-full" style={{ width: `${result.peakDensity * 100}%` }} />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between text-[10px] uppercase font-bold text-[#8B949E]">
                         <span>模型可信度 (Conf.)</span>
                         <span className="text-white">96.4%</span>
                       </div>
                       <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-accent-green rounded-full w-[96.4%]" />
                       </div>
                    </div>
                  </div>
                </div>

                {/* Suggestions */}
                <div className="glass-panel p-5 border-l-2 border-accent-blue/40 bg-accent-blue/[0.03]">
                  <p className="text-[10px] font-bold text-white mb-2 uppercase tracking-widest">建议策略 (LOD)</p>
                  <p className="text-xs text-[#8B949E] leading-relaxed italic">{levelConfig[result.level].suggestion}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

