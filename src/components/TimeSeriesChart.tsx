'use client';

import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions,
  type ScriptableContext,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LineChart, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { TimeSeriesMetricPoint } from '@/lib/queries';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
);

type Accent = 'blue' | 'emerald' | 'purple';
type MetricKey = 'gmv' | 'orders' | 'views';

const ACCENTS: Record<Accent, { rgb: string; text: string }> = {
  blue: { rgb: '59, 130, 246', text: 'text-blue-400' },
  emerald: { rgb: '16, 185, 129', text: 'text-emerald-400' },
  purple: { rgb: '168, 85, 247', text: 'text-purple-400' },
};

const METRIC_TABS: ReadonlyArray<{ key: MetricKey; label: string }> = [
  { key: 'gmv', label: 'Doanh số (GMV)' },
  { key: 'orders', label: 'Đơn hàng' },
  { key: 'views', label: 'Lượt xem' },
];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('vi-VN').format(val);
const formatCompact = (val: number) =>
  new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(val);

function periodLabel(iso: string): string {
  try {
    return format(parseISO(iso), 'dd/MM');
  } catch {
    return iso;
  }
}

interface TimeSeriesChartProps {
  data: TimeSeriesMetricPoint[];
  loading?: boolean;
  accent?: Accent;
  title?: string;
}

export function TimeSeriesChart({
  data,
  loading = false,
  accent = 'blue',
  title = 'Xu hướng theo thời gian',
}: TimeSeriesChartProps) {
  const [metric, setMetric] = useState<MetricKey>('gmv');
  const theme = ACCENTS[accent];

  const values = useMemo(
    () =>
      data.map((d) =>
        metric === 'gmv' ? d.totalGMV : metric === 'orders' ? d.totalOrders : d.totalViews
      ),
    [data, metric]
  );

  const labels = useMemo(() => data.map((d) => periodLabel(d.periodStart)), [data]);

  const total = useMemo(() => values.reduce((sum, v) => sum + v, 0), [values]);

  // Week-over-week change: last period vs previous period.
  const wow = useMemo(() => {
    if (values.length < 2) return null;
    const last = values[values.length - 1];
    const prev = values[values.length - 2];
    if (prev === 0) return null;
    return ((last - prev) / prev) * 100;
  }, [values]);

  const isCurrency = metric === 'gmv';
  const formatValue = isCurrency ? formatCurrency : formatNumber;

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: METRIC_TABS.find((t) => t.key === metric)?.label ?? '',
          data: values,
          borderColor: `rgb(${theme.rgb})`,
          borderWidth: 2,
          pointBackgroundColor: `rgb(${theme.rgb})`,
          pointBorderColor: '#0d1117',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0.35,
          fill: true,
          backgroundColor: (ctx: ScriptableContext<'line'>) => {
            const { chartArea, ctx: c } = ctx.chart;
            if (!chartArea) return `rgba(${theme.rgb}, 0.15)`;
            const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, `rgba(${theme.rgb}, 0.35)`);
            gradient.addColorStop(1, `rgba(${theme.rgb}, 0.02)`);
            return gradient;
          },
        },
      ],
    }),
    [labels, values, metric, theme.rgb]
  );

  const options: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#161b22',
          borderColor: '#30363d',
          borderWidth: 1,
          padding: 12,
          titleColor: '#e6edf3',
          bodyColor: '#94a3b8',
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex ?? 0;
              const point = data[idx];
              if (!point) return '';
              return `${periodLabel(point.periodStart)} → ${periodLabel(point.periodEnd)}`;
            },
            label: (item) => `  ${formatValue(Number(item.parsed.y ?? 0))}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(48, 54, 61, 0.4)' },
          ticks: { color: '#94a3b8', font: { size: 11 }, maxRotation: 0, autoSkipPadding: 16 },
          border: { color: '#30363d' },
        },
        y: {
          grid: { color: 'rgba(48, 54, 61, 0.4)' },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            callback: (value) => formatCompact(Number(value)),
          },
          border: { color: '#30363d' },
        },
      },
    }),
    [data, formatValue]
  );

  return (
    <Card className="border-[#30363d] bg-[#161b22] overflow-hidden">
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#30363d] bg-[#0d1117]/50">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-[#94a3b8] flex items-center gap-2">
          <LineChart className={cn('w-4 h-4', theme.text)} />
          {title}
        </CardTitle>
        <div className="flex items-center gap-1 export-ignore">
          {METRIC_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMetric(tab.key)}
              className={cn(
                'px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-colors border',
                metric === tab.key
                  ? cn('bg-white/[0.06]', theme.text, 'border-white/10')
                  : 'text-muted-foreground hover:text-white hover:bg-white/[0.04] border-transparent'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {/* Summary row: total + week-over-week */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Tổng {METRIC_TABS.find((t) => t.key === metric)?.label}
            </p>
            <p className={cn('text-2xl font-black', theme.text)}>{formatValue(total)}</p>
          </div>
          {wow !== null && (
            <div className="flex items-center gap-1.5">
              {wow >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span
                className={cn('text-sm font-bold', wow >= 0 ? 'text-emerald-500' : 'text-red-500')}
              >
                {wow >= 0 ? '+' : ''}
                {wow.toFixed(1)}%
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                so với kỳ trước
              </span>
            </div>
          )}
        </div>

        <div className="h-64 sm:h-72 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
            </div>
          ) : data.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Chưa có dữ liệu theo thời gian cho bộ lọc hiện tại.
            </div>
          ) : (
            <Line data={chartData} options={options} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default TimeSeriesChart;
