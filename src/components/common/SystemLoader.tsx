import React from 'react';

interface SystemLoaderProps {
  message?: string;
  submessage?: string;
  fullScreen?: boolean;
  compact?: boolean;
}

export const SystemLoader: React.FC<SystemLoaderProps> = ({
  message = 'Carregando sistema...',
  submessage,
  fullScreen = true,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center p-8 select-none" role="status" aria-label={message}>
        <div className="relative flex items-center justify-center mb-3">
          {/* Subtle pulse aura */}
          <div className="absolute -inset-2 rounded-2xl border border-purple-500/20 animate-loader-ripple pointer-events-none" />
          
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-purple-500/20 animate-loader-float">
            <svg viewBox="0 0 240 240" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <rect width="240" height="240" rx="60" fill="#a855f7" />
              <g transform="translate(60, 60) scale(5)">
                <rect width="7" height="9" x="3" y="3" rx="1" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <rect width="7" height="5" x="14" y="3" rx="1" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <rect width="7" height="9" x="14" y="12" rx="1" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <rect width="7" height="5" x="3" y="16" rx="1" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </svg>
          </div>
        </div>

        <p className="text-[11px] font-bold text-slate-400 cyber-font tracking-wide uppercase">
          {message}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none overflow-hidden ${
        fullScreen ? 'fixed inset-0 min-h-screen z-[9999] bg-[#020617]' : 'w-full py-16'
      }`}
      aria-label="Carregamento do Sistema"
      role="status"
    >
      {/* Ambient background glow layers */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Favicon container with concentric pulsing auras */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Ripple Auras */}
        <div className="absolute -inset-3.5 rounded-[26px] border border-purple-500/30 animate-loader-ripple pointer-events-none" />
        <div className="absolute -inset-3.5 rounded-[26px] border border-purple-400/20 animate-loader-ripple delay-300 pointer-events-none" />

        {/* Floating animated Favicon */}
        <div className="relative w-20 h-20 rounded-[22px] overflow-hidden animate-loader-float shadow-[0_12px_40px_rgba(168,85,247,0.45)] ring-1 ring-purple-400/30">
          <svg
            viewBox="0 0 240 240"
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="240" height="240" rx="60" fill="#a855f7" />
            <g transform="translate(60, 60) scale(5)">
              <rect
                width="7"
                height="9"
                x="3"
                y="3"
                rx="1"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                width="7"
                height="5"
                x="14"
                y="3"
                rx="1"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                width="7"
                height="9"
                x="14"
                y="12"
                rx="1"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                width="7"
                height="5"
                x="3"
                y="16"
                rx="1"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </svg>

          {/* Glass sheen shimmer sweep */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent pointer-events-none -translate-x-full animate-loader-sheen" />
        </div>
      </div>

      {/* Brand Identity */}
      <div className="flex flex-col items-center gap-1 mb-5">
        <span className="text-xl font-black cyber-font tracking-tighter text-white leading-none">
          FRELLA<span className="text-purple-400">SYSTEM</span>
        </span>
        <span className="text-[10px] font-black tracking-[0.35em] text-slate-400 uppercase opacity-80">
          WORKSPACE
        </span>
      </div>

      {/* Indeterminate High-Tech Loading Progress Bar */}
      <div className="w-36 h-1 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 relative">
        <div className="absolute inset-y-0 h-full w-1/2 bg-gradient-to-r from-purple-500 via-fuchsia-400 to-sky-400 rounded-full animate-loader-bar" />
      </div>

      {/* Status Message */}
      <p className="mt-3 text-xs font-medium text-slate-300 tracking-wide animate-pulse">
        {message}
      </p>

      {submessage && (
        <p className="text-[11px] text-slate-500 mt-1 font-mono tracking-wider">
          {submessage}
        </p>
      )}
    </div>
  );
};

export default SystemLoader;
