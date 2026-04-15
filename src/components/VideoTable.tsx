'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Video, Profile } from '@/types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface VideoTableProps {
  videos: Video[];
  users: Profile[];
  onAssign?: (videoId: string, userId: string) => void;
  onTag?: (video: Video) => void;
}

export function VideoTable({ videos, users, onAssign, onTag }: VideoTableProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  return (
    <div className="rounded-md border border-[#30363d] bg-[#161b22]">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-[#30363d]">
            <TableHead className="w-[300px]">Video / Creator</TableHead>
            <TableHead>Nguồn</TableHead>
            <TableHead className="text-right">GMV</TableHead>
            <TableHead className="text-right">Đơn hàng</TableHead>
            <TableHead className="text-right">Lượt xem</TableHead>
            <TableHead>Tags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {videos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                Không tìm thấy dữ liệu.
              </TableCell>
            </TableRow>
          ) : (
            videos.map((video) => (
              <TableRow key={video.id} className="border-[#30363d] hover:bg-white/5 cursor-pointer" onClick={() => onTag?.(video)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://avatar.vercel.sh/${video.creator_name}.png`} />
                      <AvatarFallback>{video.creator_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{video.creator_name}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                        {video.video_title}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(
                    "text-[10px] uppercase font-bold",
                    video.source_type === 'brand' ? "border-blue-500 text-blue-500" : "border-purple-500 text-purple-500"
                  )}>
                    {video.source_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold text-emerald-500">
                  {formatCurrency(video.gmv)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(video.orders)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(video.views)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {video.tags?.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary border-none">
                        {tag}
                      </Badge>
                    ))}
                    {(video.tags?.length || 0) > 2 && (
                      <span className="text-[9px] text-muted-foreground">+{video.tags.length - 2}</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
