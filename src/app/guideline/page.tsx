'use client';

import React from 'react';
import DashboardHeader from '@/components/DashboardHeader';

export default function GuidelinePage() {
  const guidelines = [
    { name: 'Hook câu view', desc: '3 giây đầu tiên phải gây được sự chú ý cực mạnh (giảm giá sâu, bí mật, drama...).' },
    { name: 'Storytelling', desc: 'Kể chuyện về quá trình sản xuất hoặc trải nghiệm khách hàng.' },
    { name: 'Review', desc: 'Đánh giá chi tiết tính năng, độ bền và phong cách của sản phẩm.' },
    { name: 'Unboxing', desc: 'Cảm giác khui hộp sang chảnh, âm thanh ASMR.' }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader 
        title="Tag Guideline"
        subtitle="Hướng dẫn phân loại nội dung cho Team Content & Booking."
      />
      <div className="p-12 space-y-6 max-w-4xl">
        {guidelines.map(g => (
          <div key={g.name} className="p-6 card-premium bg-white/5 border border-[#30363d] rounded-2xl">
            <h2 className="text-xl font-bold bg-gradient-to-r from-[#8b5cf6] to-[#c084fc] bg-clip-text text-transparent">
              {g.name}
            </h2>
            <p className="text-[#94a3b8] mt-2">{g.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
