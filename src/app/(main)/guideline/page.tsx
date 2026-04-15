'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Tags, CheckCircle2, ChevronRight, Info, AlertCircle, Sparkles, Filter, Users } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';

export default function GuidelinePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader 
        title="Tag Guideline" 
        subtitle="Hướng dẫn gắn thẻ (Tagging) cho video TikTok DECOCO"
      />

      <div className="p-6 max-w-5xl mx-auto space-y-8 pb-16 text-foreground">
        {/* Intro Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8">
          <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
               <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl font-bold tracking-tight">Tổng quan hệ thống phân loại</h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                Hệ thống Tag giúp DECOCO phân loại và đo lường hiệu quả của từng chiến dịch, phong cách nội dung và người chịu trách nhiệm. 
                Việc gắn Tag chuẩn xác là chìa khóa để tối ưu hóa doanh thu và nội dung trong tương lai.
              </p>
            </div>
          </div>
          {/* Decorative icons */}
          <Sparkles className="absolute top-4 right-4 h-12 w-12 text-primary/10" />
        </div>

        {/* Cấu trúc Tag chung */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold">1. Cấu trúc Tag Hợp lệ</h3>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-[#30363d] bg-[#161b22] relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
              <CardHeader className="pb-3 px-6">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tags className="h-4 w-4 text-purple-400" />
                  Quy chuẩn Gắn Tag
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm px-6">
                <p className="text-muted-foreground">Mỗi video bắt buộc phải có tối thiểu 3 tag:</p>
                <div className="space-y-3">
                  <div className="flex gap-3 p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
                    <div className="font-bold text-purple-400 min-w-[80px]">Chiến dịch:</div>
                    <div className="text-foreground">Dự án hoặc đợt Sale (VD: #TetDECOCO, #Sale66)</div>
                  </div>
                  <div className="flex gap-3 p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
                    <div className="font-bold text-emerald-400 min-w-[80px]">Nội dung:</div>
                    <div className="text-foreground">Loại hình video (VD: #Vlog, #Review, #Tip)</div>
                  </div>
                  <div className="flex gap-3 p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
                    <div className="font-bold text-blue-400 min-w-[80px]">Nhân sự:</div>
                    <div className="text-foreground">Người quản lý (VD: #Content_An, #Booking_Ly)</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#30363d] bg-[#161b22] relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
              <CardHeader className="pb-3 px-6">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-orange-400" />
                  Lưu ý về Định dạng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm px-6">
                <ul className="space-y-3">
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Viết liền không dấu:</strong> Sử dụng ký tự không dấu và gạch nối dưới <code>(_)</code> (VD: #review_sp).</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Không dùng ký tự đặc biệt:</strong> Tránh các ký tự như @, $, %, &, ...</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Thống nhất chữ thường:</strong> Khuyến khích viết thường toàn bộ để đồng bộ dữ liệu.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Content Team Guidelines */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <h3 className="text-xl font-bold">2. Hướng dẫn Content Team</h3>
          </div>
          <Card className="border-[#30363d] bg-[#161b22]">
            <CardContent className="p-6">
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-4">
                   <h4 className="font-bold flex items-center gap-2 text-emerald-400">
                      <ChevronRight className="h-4 w-4" />
                      Loại hình Video (Format)
                   </h4>
                   <div className="grid grid-cols-1 gap-2">
                      <div className="p-2 rounded bg-[#0d1117] border border-[#30363d]">
                        <span className="text-emerald-400 font-mono text-xs">#daily_vlog</span>
                        <p className="text-xs text-muted-foreground mt-1">Video kể về hoạt động hàng ngày gắn liền với SP.</p>
                      </div>
                      <div className="p-2 rounded bg-[#0d1117] border border-[#30363d]">
                        <span className="text-emerald-400 font-mono text-xs">#outfit_idea</span>
                        <p className="text-xs text-muted-foreground mt-1">Gợi ý phối đồ, mix-match sản phẩm của DECOCO.</p>
                      </div>
                      <div className="p-2 rounded bg-[#0d1117] border border-[#30363d]">
                        <span className="text-emerald-400 font-mono text-xs">#unboxing_review</span>
                        <p className="text-xs text-muted-foreground mt-1">Mở hộp và đánh giá chi tiết chất liệu, phom dáng.</p>
                      </div>
                   </div>
                </div>
                <div className="space-y-4">
                   <h4 className="font-bold flex items-center gap-2 text-emerald-400">
                      <ChevronRight className="h-4 w-4" />
                      Mục tiêu Video
                   </h4>
                   <div className="grid grid-cols-1 gap-2">
                      <div className="p-2 rounded bg-[#0d1117] border border-[#30363d]">
                        <span className="text-emerald-400 font-mono text-xs">#brand_awareness</span>
                        <p className="text-xs text-muted-foreground mt-1">Video tập trung vào hình ảnh thương hiệu, độ viral.</p>
                      </div>
                      <div className="p-2 rounded bg-[#0d1117] border border-[#30363d]">
                        <span className="text-emerald-400 font-mono text-xs">#hard_sell</span>
                        <p className="text-xs text-muted-foreground mt-1">Video tập trung chốt đơn, tập trung vào khuyến mãi.</p>
                      </div>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Booking Team Guidelines */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            <h3 className="text-xl font-bold">3. Hướng dẫn Booking Team</h3>
          </div>
          <Card className="border-[#30363d] bg-[#161b22]">
            <CardContent className="p-6">
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-4">
                   <h4 className="font-bold flex items-center gap-2 text-blue-400">
                      <ChevronRight className="h-4 w-4" />
                      Phân loại KOC
                   </h4>
                   <div className="grid grid-cols-1 gap-2">
                      <div className="p-2 rounded bg-[#0d1117] border border-[#30363d]">
                        <span className="text-blue-400 font-mono text-xs">#koc_mega</span>
                        <p className="text-xs text-muted-foreground mt-1">&gt;1M followers, sức ảnh hưởng cực lớn.</p>
                      </div>
                      <div className="p-2 rounded bg-[#0d1117] border border-[#30363d]">
                        <span className="text-blue-400 font-mono text-xs">#koc_macro</span>
                        <p className="text-xs text-muted-foreground mt-1">100k - 1M followers, ngách thời trang mạnh.</p>
                      </div>
                      <div className="p-2 rounded bg-[#0d1117] border border-[#30363d]">
                        <span className="text-blue-400 font-mono text-xs">#koc_micro</span>
                        <p className="text-xs text-muted-foreground mt-1">10k - 100k followers, tỷ lệ chuyển đổi cao.</p>
                      </div>
                   </div>
                </div>
                <div className="space-y-4">
                   <h4 className="font-bold flex items-center gap-2 text-blue-400">
                      <ChevronRight className="h-4 w-4" />
                      Hình thức Hợp tác
                   </h4>
                   <div className="grid grid-cols-1 gap-2">
                      <div className="p-2 rounded bg-[#0d1117] border border-[#30363d]">
                        <span className="text-blue-400 font-mono text-xs">#affiliate_only</span>
                        <p className="text-xs text-muted-foreground mt-1">Nhận hoa hồng trực tiếp trên đơn hàng.</p>
                      </div>
                      <div className="p-2 rounded bg-[#0d1117] border border-[#30363d]">
                        <span className="text-blue-400 font-mono text-xs">#paid_review</span>
                        <p className="text-xs text-muted-foreground mt-1">Booking trả phí + hoa hồng (nếu có).</p>
                      </div>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Quan trọng */}
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-6">
             <div className="flex gap-4">
                <AlertCircle className="h-6 w-6 text-red-400 shrink-0" />
                <div className="space-y-1">
                   <h4 className="font-bold text-red-400">Điều kiện Duyệt dữ liệu</h4>
                   <p className="text-sm text-red-400/80 leading-relaxed">
                     Video không có tối thiểu 03 tag (Campaign, Nội dung, Nhân sự) sẽ được đánh giá là "Chưa hoàn thiện" và không được thống kê vào báo cáo hiệu suất cá nhân cuối tuần. 
                     Vui lòng hoàn thành tagging trong vòng 24h sau khi upload dữ liệu.
                   </p>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
