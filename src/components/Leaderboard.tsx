'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Star, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LeaderboardEntry {
  id: string;
  name: string;
  value: number;
  subtitle?: string;
  imageUrl?: string;
}

interface LeaderboardProps {
  title: string;
  entries: LeaderboardEntry[];
  valueLabel: (val: number) => string;
  entityType: 'koc' | 'staff';
}

export function Leaderboard({ title, entries, valueLabel, entityType }: LeaderboardProps) {
  const maxValue = entries.length > 0 ? entries[0].value : 0;

  return (
    <Card className="border-[#30363d] bg-[#161b22] h-full overflow-hidden flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-[#30363d] bg-[#0d1117]/50">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-[#94a3b8] flex items-center gap-2">
          {entityType === 'koc' ? <Star className="w-4 h-4 text-purple-400" /> : <Trophy className="w-4 h-4 text-primary" />}
          {title}
        </CardTitle>
        <Badge variant={entityType === 'koc' ? "purple" : "blue"}>TOP {entries.length}</Badge>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
        {entries.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground italic">
            Chưa có đủ dữ liệu xếp hạng.
          </div>
        ) : (
          <div className="divide-y divide-[#30363d]">
            {entries.map((entry, index) => {
              const percentage = maxValue > 0 ? (entry.value / maxValue) * 100 : 0;
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;

              return (
                <div key={entry.id} className="p-4 group hover:bg-white/[0.02] transition-colors relative">
                  <div className="flex items-center gap-4 relative z-10">
                    {/* Rank Badge */}
                    <div className="flex-shrink-0 w-8 flex justify-center">
                      {isFirst ? (
                        <div className="bg-yellow-500 rounded-full p-1 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                          <Trophy className="w-4 h-4 text-black" />
                        </div>
                      ) : isSecond ? (
                        <div className="bg-slate-300 rounded-full p-1">
                          <Medal className="w-4 h-4 text-slate-800" />
                        </div>
                      ) : isThird ? (
                        <div className="bg-amber-600 rounded-full p-1">
                          <Medal className="w-4 h-4 text-amber-950" />
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-[#30363d]">{index + 1}</span>
                      )}
                    </div>

                    {/* Entity Info */}
                    <Avatar className={cn(
                      "h-10 w-10 border",
                      isFirst ? "border-yellow-500/50 scale-110" : "border-[#30363d]"
                    )}>
                      <AvatarImage src={entry.imageUrl || `https://avatar.vercel.sh/${entry.name}.png`} />
                      <AvatarFallback>{entry.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "font-bold truncate text-sm",
                          isFirst ? "text-white" : "text-[#c9d1d9]"
                        )}>
                          {entry.name}
                        </span>
                        <span className={cn(
                          "font-black text-sm",
                          isFirst ? "text-yellow-500" : "text-[#c9d1d9]"
                        )}>
                          {valueLabel(entry.value)}
                        </span>
                      </div>
                      
                      {/* Performance Bar Container */}
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex items-center">
                         <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-1000 ease-out",
                            isFirst ? "bg-primary shadow-[0_0_10px_rgba(139,92,246,0.3)]" : "bg-primary/40"
                          )} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      {entry.subtitle && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                           {entry.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Badge({ children, variant }: { children: React.ReactNode, variant: 'blue' | 'purple' }) {
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter",
      variant === 'purple' ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"
    )}>
      {children}
    </span>
  );
}
