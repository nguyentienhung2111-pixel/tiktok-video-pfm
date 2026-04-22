'use client';

import React, { useState } from 'react';
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
import { Video, VideoWithMetrics, Profile } from '@/types';
import { cn } from '@/lib/utils';
import TagDialog from './TagDialog';
import { Tag as TagIcon, Plus } from 'lucide-react';

type VideoLike = Video | VideoWithMetrics;

interface VideoTableProps {
  videos: VideoLike[];
  users: Profile[];
  onAssign?: (videoId: string, userId: string) => void;
  onRefresh?: () => void;
}

export function VideoTable({ videos, users, onAssign, onRefresh }: VideoTableProps) {
  const [selectedVideo, setSelectedVideo] = useState<VideoLike | null>(null);
  const [localVideos, setLocalVideos] = useState<VideoLike[]>(videos);

  // Update local videos when props change
  React.useEffect(() => {
    setLocalVideos(videos);
  }, [videos]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  const handleTagSuccess = (updatedVideo: VideoLike) => {
    setLocalVideos(prev =>
      prev.map(v => v.id === updatedVideo.id ? updatedVideo : v)
    );
    if (onRefresh) onRefresh();
  };

  return (
    <div className="rounded-md border border-[#30363d] bg-[#161b22] overflow-hidden">
      <Table>
        <TableHeader>
          <tr className="bg-[#0d1117] border-b border-[#30363d]">
            <TableHead className="w-[300px] text-[0.7rem] uppercase font-bold text-[#94a3b8]">Video / Creator</TableHead>
            <TableHead className="text-[0.7rem] uppercase font-bold text-[#94a3b8]">Nguồn</TableHead>
            <TableHead className="text-right text-[0.7rem] uppercase font-bold text-[#94a3b8]">GMV</TableHead>
            <TableHead className="text-right text-[0.7rem] uppercase font-bold text-[#94a3b8]">Đơn hàng</TableHead>
            <TableHead className="text-right text-[0.7rem] uppercase font-bold text-[#94a3b8]">Lượt xem</TableHead>
            <TableHead className="text-[0.7rem] uppercase font-bold text-[#94a3b8]">Tags</TableHead>
            <TableHead className="w-[80px] text-center text-[0.7rem] uppercase font-bold text-[#94a3b8]">Action</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {localVideos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                Không tìm thấy dữ liệu.
              </TableCell>
            </TableRow>
          ) : (
            localVideos.map((video) => (
              <TableRow key={video.id} className="border-[#30363d] hover:bg-white/5 transition-colors group">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-[#30363d]">
                      <AvatarImage src={`https://avatar.vercel.sh/${video.creator_name}.png`} />
                      <AvatarFallback>{video.creator_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm truncate">{video.creator_name}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={video.video_title || ''}>
                        {video.video_title}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(
                    "text-[9px] px-1.5 py-0 uppercase font-bold border-none",
                    video.source_type === 'brand' ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                  )}>
                    {video.source_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-bold text-emerald-500">
                  {formatCurrency(video.gmv)}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {formatNumber(video.orders)}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {formatNumber(video.views)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {video.tags?.slice(0, 2).map(tag => (
                      <Badge key={tag} className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary hover:bg-primary/20 border-none">
                        {tag}
                      </Badge>
                    ))}
                    {(video.tags?.length || 0) > 2 && (
                      <span className="text-[9px] text-[#94a3b8] font-medium">+{video.tags.length - 2}</span>
                    )}
                    {(video.tags?.length || 0) === 0 && (
                      <span className="text-[9px] text-muted-foreground italic">No tags</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                   <button 
                    onClick={() => setSelectedVideo(video)}
                    className="p-1.5 rounded-lg text-[#94a3b8] hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Gắn tag"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <TagDialog 
        video={selectedVideo}
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        onSuccess={handleTagSuccess}
      />
    </div>
  );
}
