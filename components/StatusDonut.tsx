import React from 'react';

export const StatusDonut = ({ data, total }: { data: { name: string; value: number; fill: string }[], total: number }) => {
  const size = 160;
  const strokeWidth = 12; // Thinner stroke
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  let accumulatedOffset = 0;

  const completionRate = total > 0 
    ? Math.round((data.find(d => ['COMPLETE', 'DONE', 'CLOSED'].includes(d.name))?.value || 0) / total * 100) 
    : 0;

  return (
    <div className="flex flex-col items-center justify-center h-full py-4">
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          {data.map((item, index) => {
             const percentage = total > 0 ? item.value / total : 0;
             const dashArray = percentage * circumference;
             const offset = accumulatedOffset;
             accumulatedOffset += dashArray;
             
             const finalDashArray = total > 0 && item.value === total ? circumference : dashArray;
             
             return (
               <circle
                 key={item.name}
                 cx={size/2} cy={size/2} r={radius}
                 fill="transparent"
                 stroke={item.fill}
                 strokeWidth={strokeWidth}
                 strokeDasharray={`${finalDashArray} ${circumference}`}
                 strokeDashoffset={-offset}
                 strokeLinecap={data.length > 1 ? "round" : "butt"}
                 className="transition-all duration-1000 ease-out"
               />
             );
          })}
          {total === 0 && (
             <circle
               cx={size/2} cy={size/2} r={radius}
               fill="transparent"
               stroke="#27272a"
               strokeWidth={strokeWidth}
             />
          )}
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-mono font-bold tracking-tight text-white">{completionRate}%</span>
          <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-widest mt-1">Done</span>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-8 space-y-3 w-full max-w-[200px]">
        {data.slice(0, 4).map(item => (
           <div key={item.name} className="flex items-center justify-between group">
             <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.fill }} />
               <span className="text-[11px] font-medium text-zinc-500 uppercase group-hover:text-zinc-300 transition-colors truncate max-w-[100px]">{item.name}</span>
             </div>
             <span className="text-[11px] font-medium text-zinc-400 group-hover:text-white transition-colors">
               {total > 0 ? Math.round((item.value / total) * 100) : 0}%
             </span>
           </div>
        ))}
      </div>
    </div>
  );
};
