'use client';

import React, { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import Scorecard from '@/components/Scorecard';
import VideoTable from '@/components/VideoTable';
import { supabase } from '@/lib/supabase';
import { Video, Profile } from '@/types';

interface TeamPageProps {
  title: string;
  subtitle: string;
  sourceType: 'brand' | 'koc';
}

export default function TeamPage({ title, subtitle, sourceType }: TeamPageProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { data: videoData } = await supabase
          .from('videos')
          .select('*')
          .eq('source_type', sourceType);
        
        const { data: userData } = await supabase
          .from('profiles')
          .select('*')
          .filter('is_active', 'eq', true);

        if (videoData) setVideos(videoData as Video[]);
        if (userData) setUsers(userData as Profile[]);
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu Team:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [sourceType]);

  const handleAssign = async (videoId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ assigned_user_id: userId || null })
        .eq('id', videoId);
      
      if (error) throw error;
      setVideos(cur => cur.map(v => v.id === videoId ? { ...v, assigned_user_id: userId || null } : v));
    } catch (e) {
      console.error(e);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-[#94a3b8]">Đang tải dữ liệu team...</div>;

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title={title} subtitle={subtitle} />
      <div className="p-12 space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
           <Scorecard label="Tổng Video Team" value={videos.length} />
           <Scorecard label="Tổng GMV Team" value={formatCurrency(videos.reduce((s,v)=>s+(v.gmv||0), 0))} />
        </div>
        <VideoTable videos={videos} users={users} onAssign={handleAssign} />
      </div>
    </div>
  );
}
