import React, { useRef, useEffect } from 'react';

export const WaveformVisualizer = ({ isActive = false, isAi = false, height = 64, color = null }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const h = canvas.height;
      const centerY = h / 2;

      const barCount = 48;
      const barWidth = width / (barCount * 1.5);
      const gap = barWidth * 0.5;

      for (let i = 0; i < barCount; i++) {
        let barHeight;
        if (isActive) {
          // Dynamic animated wave with harmonic perturbations
          const wave1 = Math.sin(i * 0.25 + phase);
          const wave2 = Math.cos(i * 0.15 - phase * 1.4);
          const noise = isAi ? 0.08 * Math.sin(i * 0.8) : (Math.random() - 0.5) * 0.3;
          barHeight = Math.abs(wave1 * 0.6 + wave2 * 0.3 + noise) * (h * 0.75);
          barHeight = Math.max(4, Math.min(barHeight, h - 6));
        } else {
          // Idle gentle ambient ripples
          barHeight = 4 + Math.abs(Math.sin(i * 0.3 + phase * 0.5)) * 8;
        }

        const x = i * (barWidth + gap) + gap;
        const y = centerY - barHeight / 2;

        let barColor;
        if (color) {
          barColor = color;
        } else if (isAi) {
          barColor = isActive ? '#e11d48' : '#fda4af'; // Rose / AI
        } else if (isActive) {
          barColor = '#3b82f6'; // Blue / Active
        } else {
          barColor = '#cbd5e1'; // Slate-300 / Idle
        }

        ctx.fillStyle = barColor;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }

      phase += isActive ? 0.08 : 0.02;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive, isAi, color]);

  return (
    <div className="w-full bg-slate-100 rounded-xl p-3 border border-slate-200/80 shadow-inner flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={560}
        height={height}
        className="w-full h-full max-w-full block"
      />
    </div>
  );
};

export default WaveformVisualizer;
