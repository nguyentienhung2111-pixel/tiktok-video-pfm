import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Camera, TrendingUp, TrendingDown, Tv, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

// TODO: Thay bằng dữ liệu thật từ Supabase
const scorecards = [
  { label: 'Tổng GMV', value: '0 đ', change: '+12.4%', up: true },
  { label: 'Tổng đơn hàng', value: '0', change: '+5.1%', up: true },
  { label: 'Tổng Video', value: '0', change: '-2.3%', up: false },
  { label: 'Tổng lượt xem', value: '0', change: '+8.7%', up: true },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
        <div>
          <h1 className="text-lg font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Tổng hợp hiệu suất video</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            7 ngày qua
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground">
            <Camera className="mr-2 h-4 w-4" />
            Xuất báo cáo
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Scorecards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {scorecards.map((item) => (
            <Card key={item.label}>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-2xl font-bold">{item.value}</p>
                <div className="mt-1 flex items-center gap-1">
                  {item.up ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={cn(
                    "text-xs",
                    item.up ? "text-emerald-500" : "text-red-500"
                  )}>
                    {item.change} so với kỳ trước
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty state */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Tv className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 text-lg font-medium">Chưa có dữ liệu video</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tải lên file Excel từ TikTok Seller Center để bắt đầu phân tích
            </p>
            <Button className="mt-4" asChild>
              <a href="/admin/upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload dữ liệu ngay
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
