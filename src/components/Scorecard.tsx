import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ScorecardProps {
  label: string;
  value: string | number;
  trend?: {
    value: string;
    isUp: boolean;
  };
  className?: string;
}

export default function Scorecard({ label, value, trend, className }: ScorecardProps) {
  return (
    <div className={cn("p-6 card-premium", className)}>
      <div className="text-sm text-[#94a3b8] font-medium">{label}</div>
      <div className="text-[1.75rem] font-bold my-3">{value}</div>
      {trend && (
        <div className={cn(
          "text-[0.75rem] font-semibold",
          trend.isUp ? "text-[#10b981]" : "text-[#ef4444]"
        )}>
          {trend.isUp ? '↑' : '↓'} {trend.value} so với kỳ trước
        </div>
      )}
    </div>
  );
}
