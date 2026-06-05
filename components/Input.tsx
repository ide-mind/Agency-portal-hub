import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, className, ...props }) => {
  return (
    <div className="mb-5">
      <label className="block text-[11px] font-semibold text-zinc-400 mb-2 tracking-wide">
        {label}
      </label>
      <input
        className={`w-full bg-[#040404] border border-white/5 text-zinc-200 text-sm rounded-lg focus:ring-1 focus:ring-[#ff4d00]/50 focus:border-[#ff4d00]/50 block p-3.5 placeholder-zinc-600 transition-all shadow-sm ${className}`}
        {...props}
      />
    </div>
  );
};