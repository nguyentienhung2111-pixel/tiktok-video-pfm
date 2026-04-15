'use client';

import React, { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import { supabase } from '@/lib/supabase';
import { TagGroup, Tag } from '@/types';

interface TagWithGroup extends Tag {
  tag_groups?: TagGroup | null;
}

export default function GuidelinePage() {
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [tags, setTags] = useState<TagWithGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [{ data: groupsData }, { data: tagsData }] = await Promise.all([
        supabase.from('tag_groups').select('*').order('sort_order'),
        supabase.from('tags').select('*, tag_groups(*)').order('sort_order'),
      ]);
      if (groupsData) setTagGroups(groupsData as TagGroup[]);
      if (tagsData) setTags(tagsData as TagWithGroup[]);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Fallback static guidelines if DB is empty
  const staticGuidelines = [
    { name: 'Hook câu view', group: 'Hook Style', desc: '3 giây đầu tiên phải gây được sự chú ý cực mạnh (giảm giá sâu, bí mật, drama...). Mục tiêu: completion rate > 50%.', color: '#06b6d4' },
    { name: 'Storytelling', group: 'Content Format', desc: 'Kể chuyện về quá trình sản xuất, hành trình của creator, hoặc trải nghiệm khách hàng thực tế. Tạo kết nối cảm xúc.', color: '#8b5cf6' },
    { name: 'Review', group: 'Content Format', desc: 'Đánh giá chi tiết tính năng, độ bền, phong cách, và so sánh với đối thủ. Cần chứng minh bằng demo thực tế.', color: '#8b5cf6' },
    { name: 'Unboxing', group: 'Content Format', desc: 'Cảm giác khui hộp sang chảnh, âm thanh ASMR, trình bày bao bì và phụ kiện. Kéo dài khoảnh khắc mở hộp.', color: '#8b5cf6' },
    { name: 'Viral', group: 'Conversion', desc: 'Video đạt > 100K views. Phân tích hook, music trend, và timing đăng bài để nhân rộng công thức thành công.', color: '#10b981' },
    { name: 'Chuyển đổi', group: 'Conversion', desc: 'Video có CTR > 5% hoặc conversion rate > 3%. Tập trung vào CTA rõ ràng và link sản phẩm dễ tiếp cận.', color: '#10b981' },
  ];

  const hasDBData = tagGroups.length > 0 || tags.length > 0;

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Tag Guideline"
        subtitle="Hướng dẫn phân loại nội dung cho Team Content & Booking."
      />

      <div className="p-12 space-y-8 max-w-4xl animate-in fade-in duration-500">
        {loading ? (
          <div className="py-20 text-center text-[#94a3b8] animate-pulse">Đang tải hướng dẫn...</div>
        ) : hasDBData ? (
          // Render from DB grouped by tag_group
          tagGroups.map(group => {
            const groupTags = tags.filter(t => t.group_id === group.id);
            if (groupTags.length === 0) return null;
            return (
              <div key={group.id}>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">
                    {group.name}
                  </h2>
                </div>
                <div className="space-y-3">
                  {groupTags.map(tag => (
                    <div key={tag.id} className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl hover:border-[#8b5cf6]/50 transition-colors">
                      <h3
                        className="text-lg font-bold"
                        style={{ color: group.color }}
                      >
                        {tag.name}
                      </h3>
                      {tag.description && (
                        <p className="text-[#94a3b8] mt-2 text-sm leading-relaxed">{tag.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          // Fallback to static
          <>
            {['Hook Style', 'Content Format', 'Conversion'].map(groupName => {
              const groupItems = staticGuidelines.filter(g => g.group === groupName);
              return (
                <div key={groupName}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 rounded-full bg-[#8b5cf6]" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">{groupName}</h2>
                  </div>
                  <div className="space-y-3">
                    {groupItems.map(g => (
                      <div key={g.name} className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl hover:border-[#8b5cf6]/50 transition-colors">
                        <h3 className="text-lg font-bold" style={{ color: g.color }}>
                          {g.name}
                        </h3>
                        <p className="text-[#94a3b8] mt-2 text-sm leading-relaxed">{g.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
