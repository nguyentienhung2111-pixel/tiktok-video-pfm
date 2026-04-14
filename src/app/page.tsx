'use client';

import React, { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import Scorecard from '@/components/Scorecard';
import VideoTable from '@/components/VideoTable';
import { supabase } from '@/lib/supabase';
import { Video, Profile } from '@/types';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { data: videoData, error: videoError } = await supabase
          .from('videos')
          .select('*')
          .order('published_at', { ascending: false });

        if (videoError) throw videoError;

        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .filter('is_active', 'eq', true);

        if (userError) throw userError;

        if (videoData) {
          setVideos(videoData as Video[]);
        }
        if (userData) setUsers(userData as Profile[]);
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu từ Supabase:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const totalGMV = videos.reduce((sum, v) => sum + (v.gmv || 0), 0);
  const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalOrders = videos.reduce((sum, v) => sum + (v.orders || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  const handleAssign = async (videoId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ assigned_user_id: userId || null })
        .eq('id', videoId);

      if (error) throw error;

      setVideos(current => 
        current.map(v => v.id === videoId ? { ...v, assigned_user_id: userId || null } : v)
      );
    } catch (error) {
      console.error('Lỗi khi gắn nhân sự:', error);
      alert('Không thể gắn nhân sự. Vui lòng kiểm tra quyền hạn RLS.');
    }
  };

  const handleOpenTag = (video: Video) => {
    setSelectedVideo(video);
    setIsModalOpen(true);
  };

  const handleSaveTags = async (newTags: string[]) => {
    if (!selectedVideo) return;
    try {
      const { error } = await supabase
        .from('videos')
        .update({ tags: newTags })
        .eq('id', selectedVideo.id);
      
      if (error) throw error;
      
      setVideos(current => 
        current.map(v => v.id === selectedVideo.id ? { ...v, tags: newTags } : v)
      );
      setIsModalOpen(false);
    } catch (error) {
      console.error('Lỗi khi lưu tag:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b5cf6]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader 
        title="Xin chào, Trần Thị Linh"
        subtitle="Dữ liệu được đồng bộ trực tiếp từ Supabase."
      />

      <div className="p-12 space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Scorecard 
            label="Tổng GMV" 
            value={formatCurrency(totalGMV)} 
            trend={{ value: '12.4%', isUp: true }}
          />
          <Scorecard 
            label="Tổng đơn hàng" 
            value={formatNumber(totalOrders)} 
            trend={{ value: '5.1%', isUp: true }}
          />
          <Scorecard 
            label="Tổng Video" 
            value={videos.length} 
          />
          <Scorecard 
            label="Tổng lượt xem" 
            value={formatNumber(totalViews)} 
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Xem chi tiết tất cả video</h2>
            {videos.length === 0 && (
              <p className="text-[#94a3b8] text-sm">Chưa có dữ liệu. Vui lòng vào mục "Upload dữ liệu".</p>
            )}
          </div>
          <VideoTable 
            videos={videos} 
            users={users} 
            onAssign={handleAssign}
            onTag={handleOpenTag}
          />
        </div>
      </div>

      {isModalOpen && selectedVideo && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-8 w-full max-w-md animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-6">Gắn Tag: {selectedVideo.creator_name}</h2>
            <div className="flex flex-wrap gap-2 mb-8">
              {['Hook câu view', 'Storytelling', 'Review', 'Unboxing', 'Viral', 'Chuyển đổi'].map(tagName => {
                const isActive = selectedVideo.tags?.includes(tagName);
                return (
                  <button 
                    key={tagName}
                    onClick={() => {
                        const nextTags = isActive 
                            ? selectedVideo.tags.filter(t => t !== tagName)
                            : [...(selectedVideo.tags || []), tagName];
                        setSelectedVideo({ ...selectedVideo, tags: nextTags });
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl border text-sm transition-all",
                      isActive 
                        ? "bg-[#8b5cf6] border-[#8b5cf6] text-white" 
                        : "border-[#30363d] text-[#94a3b8] hover:border-[#8b5cf6]"
                    )}
                  >
                    {tagName}
                  </button>
                )
              })}
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 border border-[#30363d] rounded-xl text-sm font-semibold"
              >
                Hủy
              </button>
              <button 
                onClick={() => handleSaveTags(selectedVideo.tags)}
                className="px-6 py-2 bg-[#8b5cf6] text-white rounded-xl text-sm font-semibold"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
