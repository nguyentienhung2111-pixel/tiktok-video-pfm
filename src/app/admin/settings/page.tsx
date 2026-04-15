'use client';

import React, { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import { supabase } from '@/lib/supabase';
import { HighlightRule } from '@/types';
import { Plus, Trash2, Save } from 'lucide-react';

const METRICS = [
  { value: 'views', label: 'Lượt xem (Views)' },
  { value: 'gmv', label: 'Doanh thu (GMV)' },
  { value: 'orders', label: 'Đơn hàng (Orders)' },
  { value: 'ctr', label: 'CTR (%)' },
  { value: 'completion_rate', label: 'Xem hết (%)' },
  { value: 'conversion_rate', label: 'Chuyển đổi (%)' },
  { value: 'new_followers', label: 'Follow mới' },
  { value: 'engagement', label: 'Tương tác' },
];

const OPERATORS = [
  { value: 'gte', label: '>= (lớn hơn hoặc bằng)' },
  { value: 'gt', label: '> (lớn hơn)' },
  { value: 'lte', label: '<= (nhỏ hơn hoặc bằng)' },
  { value: 'lt', label: '< (nhỏ hơn)' },
  { value: 'eq', label: '= (bằng)' },
];

export default function SettingsPage() {
  const [rules, setRules] = useState<HighlightRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase
      .from('highlight_rules')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setRules(data as HighlightRule[]);
        setLoading(false);
      });
  }, []);

  const addRule = () => {
    const newRule: Partial<HighlightRule> = {
      id: `new_${Date.now()}`,
      metric: 'views',
      operator: 'gte',
      threshold: 100000,
      color: '#10b981',
      label: 'Viral',
      is_active: true,
      sort_order: rules.length,
    };
    setRules(r => [...r, newRule as HighlightRule]);
  };

  const updateRule = (id: string, field: string, value: unknown) => {
    setRules(r => r.map(rule => rule.id === id ? { ...rule, [field]: value } : rule));
  };

  const deleteRule = async (id: string) => {
    if (!id.startsWith('new_')) {
      await supabase.from('highlight_rules').delete().eq('id', id);
    }
    setRules(r => r.filter(rule => rule.id !== id));
  };

  const saveAll = async () => {
    setSaving(true);
    setMsg('');
    try {
      for (const rule of rules) {
        const { id, ...data } = rule;
        if (id.startsWith('new_')) {
          await supabase.from('highlight_rules').insert(data);
        } else {
          await supabase.from('highlight_rules').update(data).eq('id', id);
        }
      }
      // Reload
      const { data } = await supabase.from('highlight_rules').select('*').order('sort_order');
      if (data) setRules(data as HighlightRule[]);
      setMsg('Đã lưu thành công!');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      console.error(e);
      setMsg('Lỗi khi lưu. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Cài đặt hệ thống"
        subtitle="Cấu hình quy tắc highlight và các tùy chỉnh hiển thị."
      />

      <div className="p-12 space-y-8 animate-in fade-in duration-500 max-w-4xl">
        {/* Highlight Rules */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold">Quy tắc Highlight</h2>
              <p className="text-[#94a3b8] text-sm mt-1">
                Tô màu các chỉ số nổi bật trong bảng video.
              </p>
            </div>
            <button
              onClick={addRule}
              className="flex items-center gap-2 px-4 py-2 bg-[#8b5cf6] text-white rounded-xl text-sm font-semibold hover:bg-[#7c3aed] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm quy tắc
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-[#94a3b8] animate-pulse">Đang tải...</div>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => (
                <div key={rule.id} className="flex items-center gap-3 p-4 bg-[#0d1117] rounded-xl border border-[#30363d]">
                  {/* Color swatch */}
                  <input
                    type="color"
                    value={rule.color}
                    onChange={e => updateRule(rule.id, 'color', e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                    title="Màu highlight"
                  />

                  {/* Metric */}
                  <select
                    value={rule.metric}
                    onChange={e => updateRule(rule.id, 'metric', e.target.value)}
                    className="bg-[#161b22] border border-[#30363d] text-white rounded-lg px-3 py-2 text-sm outline-none flex-1"
                  >
                    {METRICS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>

                  {/* Operator */}
                  <select
                    value={rule.operator}
                    onChange={e => updateRule(rule.id, 'operator', e.target.value)}
                    className="bg-[#161b22] border border-[#30363d] text-white rounded-lg px-3 py-2 text-sm outline-none"
                  >
                    {OPERATORS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>

                  {/* Threshold */}
                  <input
                    type="number"
                    value={rule.threshold}
                    onChange={e => updateRule(rule.id, 'threshold', parseFloat(e.target.value) || 0)}
                    className="bg-[#161b22] border border-[#30363d] text-white rounded-lg px-3 py-2 text-sm outline-none w-28"
                    placeholder="Ngưỡng"
                  />

                  {/* Label */}
                  <input
                    type="text"
                    value={rule.label || ''}
                    onChange={e => updateRule(rule.id, 'label', e.target.value)}
                    className="bg-[#161b22] border border-[#30363d] text-white rounded-lg px-3 py-2 text-sm outline-none w-28"
                    placeholder="Nhãn"
                  />

                  {/* Active toggle */}
                  <button
                    onClick={() => updateRule(rule.id, 'is_active', !rule.is_active)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      rule.is_active
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-[#30363d] text-[#94a3b8]'
                    }`}
                  >
                    {rule.is_active ? 'Bật' : 'Tắt'}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="text-[#94a3b8] hover:text-[#ef4444] transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {rules.length === 0 && (
                <div className="py-8 text-center text-[#94a3b8] text-sm">
                  Chưa có quy tắc nào. Nhấn "Thêm quy tắc" để bắt đầu.
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#30363d]">
            {msg ? (
              <span className={`text-sm font-medium ${msg.includes('Lỗi') ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                {msg}
              </span>
            ) : (
              <span />
            )}
            <button
              onClick={saveAll}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#8b5cf6] text-white rounded-xl text-sm font-semibold hover:bg-[#7c3aed] disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Đang lưu...' : 'Lưu tất cả'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
