import React from 'react';

interface MetricCardProps {
  title: string;
  value: number | string;
  subValue?: string;
  icon?: React.ReactNode;
  active?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, subValue, icon, active }) => {
  return (
    <div className={`relative h-full overflow-hidden rounded-2xl border transition-all duration-500 group
      ${active 
        ? 'bg-[#111111] border-orange-500/30 shadow-[0_4px_20px_-10px_rgba(249,115,22,0.15)]' 
        : 'bg-[#111111] border-white/5 hover:border-orange-500/20 hover:shadow-lg'
      } p-8 flex flex-col justify-between`}
    >
      <div className="flex justify-between items-start z-10">
        <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-widest">
          {title}
        </p>
        {icon && (
          <div className={`${active ? 'text-orange-500' : 'text-zinc-600 group-hover:text-zinc-400'} transition-colors`}>
            {icon}
          </div>
        )}
      </div>
      
      <div className="mt-6 z-10">
        <div className="flex items-baseline gap-1">
          <p className="text-5xl font-bold text-white tracking-tight leading-none group-hover:scale-105 transition-transform duration-500 origin-left">
            {value}
          </p>
        </div>
        
        {subValue && (
          <div className="flex items-center gap-2 mt-4">
            <div className={`h-px w-4 ${active ? 'bg-orange-500' : 'bg-zinc-800'}`}></div>
            <p className={`text-[10px] font-medium uppercase tracking-wider ${active ? 'text-orange-500' : 'text-zinc-500'}`}>
              {subValue}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};