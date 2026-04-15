'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Lightbulb, Target, Video, AlertCircle } from 'lucide-react';

export default function GuidelinePage() {
  const guidelines = [
    {
      title: "Phân loại Tag Video (Video Taxonomy)",
      icon: <Target className="h-5 w-5 text-purple-500" />,
      content: [
        { name: "Hook câu view", desc: "3-5 giây đầu tiên gây tò mò, giải quyết nỗi đau hoặc đưa ra con số gây sốc.", color: "bg-blue-500" },
        { name: "Storytelling", desc: "Kể một câu chuyện có bối cảnh, nhân vật và cao trào liên quan đến sản phẩm.", color: "bg-emerald-500" },
        { name: "Review thực tế", desc: "Trải nghiệm thật của người dùng, nêu rõ ưu và nhược điểm của sản phẩm.", color: "bg-orange-500" },
        { name: "Unboxing", desc: "Mở hộp sản phẩm, tập trung vào cảm xúc lần đầu chạm vào và ngoại quan.", color: "bg-pink-500" },
        { name: "Chuyển đổi (Hard Sell)", desc: "Tập trung vào khuyến mãi, tính năng và lời kêu gọi hành động (CTA).", color: "bg-red-500" },
      ]
    },
    {
      title: "Công thức Video triệu View",
      icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
      content: [
        { label: "0-3s (Hook)", text: "Dừng chân người xem bằng hình ảnh đẹp hoặc câu hỏi đánh vào tâm lý." },
        { label: "3-15s (Body)", text: "Cung cấp giá trị, kiến thức hoặc giải trí liên quan đến sản phẩm." },
        { label: "15-45s (Social Proof)", text: "Sử dụng feedback khách hàng hoặc hình ảnh trực quan về công năng." },
        { label: "Kết thúc (CTA)", text: "Kêu gọi bấm vào giỏ hàng hoặc follow để nhận ưu đãi." },
      ]
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Tag Guideline</h1>
        </div>
      </header>

      <div className="p-6 space-y-8 animate-in fade-in duration-700">
        <div className="max-w-4xl space-y-6">
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#30363d] pb-2">
              <Target className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-bold uppercase tracking-tight">Cấu trúc phân loại Tag</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {guidelines[0].content && (guidelines[0].content as any[]).map((tag) => (
                <Card key={tag.name} className="border-[#30363d] bg-[#161b22] hover:border-primary/50 transition-colors">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", tag.color)} />
                      <CardTitle className="text-base">{tag.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground">{tag.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#30363d] pb-2">
              <Lightbulb className="h-5 w-5 text-yellow-400" />
              <h2 className="text-xl font-bold uppercase tracking-tight">Quy chuẩn nội dung (Creative Guidelines)</h2>
            </div>
            <div className="space-y-4">
              {guidelines[1].content && (guidelines[1].content as any[]).map((item, idx) => (
                <div key={idx} className="flex gap-4 p-4 rounded-xl bg-[#161b22] border border-[#30363d]">
                   <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary">{item.label}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 flex gap-4">
               <AlertCircle className="h-6 w-6 text-primary shrink-0" />
               <div>
                  <h4 className="font-bold text-primary">Lưu ý quan trọng</h4>
                  <p className="text-sm text-primary/80 mt-1 italic">
                    Việc gắn tag chính xác giúp hệ thống phân tích đúng xu hướng. Hãy đảm bảo video được xem ít nhất 70% trước khi quyết định gắn tag "Storytelling" hay "Review".
                  </p>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
