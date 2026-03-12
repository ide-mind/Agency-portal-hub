import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  headerRight?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, headerRight }) => {
  return (
    <div className={`bg-[#111111] border border-white/5 rounded-2xl p-8 relative overflow-hidden transition-all hover:border-white/10 shadow-sm ${className}`}>
      {(title || headerRight) && (
        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
          {title && (
            <h3 className="text-zinc-400 text-[11px] font-semibold uppercase tracking-widest">
              {title}
            </h3>
          )}
          {headerRight}
        </div>
      )}
      {children}
    </div>
  );
};