'use client';

import React, { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import Scorecard from '@/components/Scorecard';
import VideoTable from '@/components/VideoTable';
import { supabase } from '@/lib/supabase';
import { Video, Profile } from '@/types';

export default function ContentTeamPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: videoData } = await supabase
        .from('videos')
        .select('*')
        .eq('source_type', 'brand');
      
      const { data: userData } = await supabase
        .from('profiles')
        .select('*');

      if (videoData) setVideos(videoData as Video[]);
      if (userData) setUsers(userData as Profile[]);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <div className="p-20 text-center">Loading...</div>;

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader 
        title="Team Thương hiệu"
        subtitle="Quản lý hiệu suất nội bộ từ kênh Official."
      />
      <div className="p-12 space-y-8">
        <div className="grid grid-cols-3 gap-5">
           <Scorecard label="Video Thương hiệu" value={videos.length} />
           <Scorecard label="Tổng GMV Team" value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(videos.reduce((s,v)=>s+v.gmv, 0))} />
        </div>
        <VideoTable videos={videos} users={users} />
      </div>
    </div>
  );
}
