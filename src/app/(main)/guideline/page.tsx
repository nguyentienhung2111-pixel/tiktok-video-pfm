'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Tags, CheckCircle2, ChevronRight, Info, AlertCircle, Sparkles, Filter, Users } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import { cn } from '@/lib/utils';

export default function GuidelinePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <DashboardHeader 
        title="Tag Guideline" 
        subtitle="Hướng dẫn phân loại & gắn thẻ cho video TikTok DECOCO"
      />

      <div className="p-6 max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Intro Section */}
        <div className="relative overflow-hidden rounded-3xl bg-[#161b22] border border-[#30363d] p-8 shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
               <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl font-black tracking-tight text-white">Tổng quan hệ thống phân loại</h2>
              <p className="text-[#94a3b8] leading-relaxed max-w-2xl text-sm">
                Hệ thống Tag giúp DECOCO phân loại và đo lường hiệu quả của từng chiến dịch, phong cách nội dung và người chịu trách nhiệm. 
                Việc gắn Tag chuẩn xác là chìa khóa để tối ưu hóa doanh thu và nội dung trong tương lai.
              </p>
            </div>
          </div>
          <Sparkles className="absolute -top-6 -right-6 h-24 w-24 text-primary/5" />
        </div>

        {/* Cấu trúc Tag chung */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Filter className="h-5 w-5 text-primary" />
            <h3 className="font-black uppercase tracking-widest text-sm text-[#94a3b8]">1. Cấu trúc Tag Hợp lệ</h3>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-[#30363d] bg-[#161b22] relative overflow-hidden transition-all hover:border-purple-500/30">
              <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
              <CardHeader className="pb-3 px-6">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
                  <Tags className="h-4 w-4 text-purple-400" />
                  Quy chuẩn Gắn Tag
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm px-6">
                <p className="text-[#94a3b8]">Mỗi video bắt buộc phải có tối thiểu 3 nhóm tag sau:</p>
                <div className="space-y-2">
                  <div className="flex gap-3 p-3 rounded-xl bg-[#0d1117] border border-[#30363d]">
                    <div className="font-black text-[10px] uppercase text-purple-400 min-w-[70px] mt-0.5">Chiến dịch:</div>
                    <div className="text-white text-xs">Tên dự án hoặc đợt Sale (VD: #TetDECOCO, #Sale66)</div>
                  </div>
                  <div className="flex gap-3 p-3 rounded-xl bg-[#0d1117] border border-[#30363d]">
                    <div className="font-black text-[10px] uppercase text-emerald-400 min-w-[70px] mt-0.5">Nội dung:</div>
                    <div className="text-white text-xs">Loại hình video (VD: #Vlog, #Review, #Tip)</div>
                  </div>
                  <div className="flex gap-3 p-3 rounded-xl bg-[#0d1117] border border-[#30363d]">
                    <div className="font-black text-[10px] uppercase text-blue-400 min-w-[70px] mt-0.5">Nhân sự:</div>
                    <div className="text-white text-xs">Người phụ trách (VD: #Content_An, #Booking_Ly)</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#30363d] bg-[#161b22] relative overflow-hidden transition-all hover:border-orange-500/30">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
              <CardHeader className="pb-3 px-6">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
                  <Info className="h-4 w-4 text-orange-400" />
                  Lưu ý về Định dạng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm px-6">
                <ul className="space-y-4">
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-white text-xs"><strong className="text-orange-400">Viết liền không dấu:</strong> Sử dụng ký tự không dấu và gạch nối dưới (VD: #review_sp).</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-white text-xs"><strong className="text-orange-400">Không dùng ký tự đặc biệt:</strong> Tránh các ký tự như @, $, %, &, ... trừ dấu # ở đầu.</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-white text-xs"><strong className="text-orange-400">Thống nhất chữ thường:</strong> Khuyến khích viết thường toàn bộ để đồng bộ dữ liệu.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Content Team Guidelines */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <h3 className="font-black uppercase tracking-widest text-sm text-[#94a3b8]">2. Hướng dẫn Content Team</h3>
          </div>
          <Card className="border-[#30363d] bg-[#161b22] overflow-hidden">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#30363d]">
                <div className="p-6 space-y-4">
                   <h4 className="font-bold flex items-center gap-2 text-emerald-400 text-sm">
                      <ChevronRight className="h-4 w-4" /> Loại hình Video (Format)
                   </h4>
                   <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] transition-colors hover:border-emerald-500/20">
                        <span className="text-emerald-400 font-mono text-xs font-bold">#daily_vlog</span>
                        <p className="text-[11px] text-[#94a3b8] mt-1">Video kể về hoạt động hàng ngày gắn liền với sản phẩm.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] transition-colors hover:border-emerald-500/20">
                        <span className="text-emerald-400 font-mono text-xs font-bold">#outfit_idea</span>
                        <p className="text-[11px] text-[#94a3b8] mt-1">Gợi ý phối đồ, mix-match sản phẩm của DECOCO.</p>
                      </div>
                   </div>
                </div>
                <div className="p-6 space-y-4">
                   <h4 className="font-bold flex items-center gap-2 text-emerald-400 text-sm">
                      <ChevronRight className="h-4 w-4" /> Mục tiêu Video
                   </h4>
                   <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] transition-colors hover:border-emerald-500/20">
                        <span className="text-emerald-400 font-mono text-xs font-bold">#brand_awareness</span>
                        <p className="text-[11px] text-[#94a3b8] mt-1">Tập trung vào hình ảnh thương hiệu, độ viral, nhận diện.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] transition-colors hover:border-emerald-500/20">
                        <span className="text-emerald-400 font-mono text-xs font-bold">#hard_sell</span>
                        <p className="text-[11px] text-[#94a3b8] mt-1">Tập trung chốt đơn ngay lập tức thông qua promotion.</p>
                      </div>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Booking Team Guidelines */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Users className="h-5 w-5 text-blue-400" />
            <h3 className="font-black uppercase tracking-widest text-sm text-[#94a3b8]">3. Hướng dẫn Booking Team</h3>
          </div>
          <Card className="border-[#30363d] bg-[#161b22] overflow-hidden">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#30363d]">
                <div className="p-6 space-y-4">
                   <h4 className="font-bold flex items-center gap-2 text-blue-400 text-sm">
                      <ChevronRight className="h-4 w-4" /> Phân loại KOC
                   </h4>
                   <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] transition-colors hover:border-blue-500/20">
                        <span className="text-blue-400 font-mono text-xs font-bold">#koc_mega</span>
                        <p className="text-[11px] text-[#94a3b8] mt-1">&gt;1M followers, có khả năng tạo xu hướng cực lớn.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] transition-colors hover:border-blue-500/20">
                        <span className="text-blue-400 font-mono text-xs font-bold">#koc_micro</span>
                        <p className="text-[11px] text-[#94a3b8] mt-1">10k - 100k followers, tỷ lệ chuyển đổi (conversion) cao.</p>
                      </div>
                   </div>
                </div>
                <div className="p-6 space-y-4">
                   <h4 className="font-bold flex items-center gap-2 text-blue-400 text-sm">
                      <ChevronRight className="h-4 w-4" /> Hình thức Hợp tác
                   </h4>
                   <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] transition-colors hover:border-blue-500/20">
                        <span className="text-blue-400 font-mono text-xs font-bold">#affiliate_only</span>
                        <p className="text-[11px] text-[#94a3b8] mt-1">Hợp tác nhận hoa hồng trực tiếp trên đơn hàng.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] transition-colors hover:border-blue-500/20">
                        <span className="text-blue-400 font-mono text-xs font-bold">#paid_review</span>
                        <p className="text-[11px] text-[#94a3b8] mt-1">Booking trả phí đăng bài cố định + hoa hồng.</p>
                      </div>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Quan trọng */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 relative overflow-hidden group">
           <div className="flex gap-4 relative z-10">
              <AlertCircle className="h-6 w-6 text-red-400 shrink-0" />
              <div className="space-y-1">
                 <h4 className="font-bold text-red-500 text-base">Điều kiện Duyệt dữ liệu & Thống kê</h4>
                 <p className="text-xs text-[#94a3b8] leading-relaxed">
                   Video không có tối thiểu 03 tag (Campaign, Nội dung, Nhân sự) sẽ được đánh giá là <strong className="text-red-400">"Chưa hoàn thiện"</strong> và không được thống kê vào báo cáo hiệu suất cá nhân cuối tuần. 
                   Vui lòng hoàn thành tagging trong vòng 24h sau khi upload dữ liệu để đảm bảo độ chính xác của báo cáo.
                 </p>
              </div>
           </div>
           <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
