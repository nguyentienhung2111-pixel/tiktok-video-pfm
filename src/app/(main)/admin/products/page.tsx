'use client';

import React, { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';
import { Plus, Trash2 } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', category: '', price: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data as Product[]);
    setLoading(false);
  }

  async function createProduct() {
    if (!newProduct.name.trim()) {
      setMsg('Vui lòng nhập tên sản phẩm.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('products').insert({
      name: newProduct.name.trim(),
      sku: newProduct.sku.trim() || null,
      category: newProduct.category.trim() || null,
      price: parseFloat(newProduct.price) || 0,
    });
    if (error) {
      setMsg('Lỗi: ' + error.message);
    } else {
      setMsg('Thêm sản phẩm thành công!');
      setNewProduct({ name: '', sku: '', category: '', price: '' });
      setShowForm(false);
      fetchProducts();
      setTimeout(() => setMsg(''), 3000);
    }
    setSaving(false);
  }

  async function deleteProduct(id: string) {
    if (!confirm('Xoá sản phẩm này?')) return;
    await supabase.from('products').delete().eq('id', id);
    setProducts(p => p.filter(x => x.id !== id));
  }

  const fmtVND = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Quản lý Sản phẩm"
        subtitle="Danh sách sản phẩm DECOCO dùng để mapping với video."
      />

      <div className="p-12 space-y-6 animate-in fade-in duration-500 max-w-5xl">
        {msg && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium ${msg.includes('Lỗi') ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {msg}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#8b5cf6] text-white rounded-xl text-sm font-semibold hover:bg-[#7c3aed] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm sản phẩm
          </button>
        </div>

        {showForm && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold">Thêm sản phẩm mới</h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                placeholder="Tên sản phẩm *"
                value={newProduct.name}
                onChange={e => setNewProduct(u => ({ ...u, name: e.target.value }))}
                className="bg-[#0d1117] border border-[#30363d] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#8b5cf6]"
              />
              <input
                placeholder="SKU"
                value={newProduct.sku}
                onChange={e => setNewProduct(u => ({ ...u, sku: e.target.value }))}
                className="bg-[#0d1117] border border-[#30363d] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#8b5cf6]"
              />
              <input
                placeholder="Danh mục"
                value={newProduct.category}
                onChange={e => setNewProduct(u => ({ ...u, category: e.target.value }))}
                className="bg-[#0d1117] border border-[#30363d] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#8b5cf6]"
              />
              <input
                type="number"
                placeholder="Giá (VND)"
                value={newProduct.price}
                onChange={e => setNewProduct(u => ({ ...u, price: e.target.value }))}
                className="bg-[#0d1117] border border-[#30363d] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#8b5cf6]"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-[#30363d] rounded-xl text-sm">Hủy</button>
              <button onClick={createProduct} disabled={saving} className="px-5 py-2 bg-[#8b5cf6] text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {saving ? 'Đang lưu...' : 'Thêm'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0d1117] border-b border-[#30363d]">
                <th className="p-4 text-left text-[0.7rem] uppercase text-[#94a3b8] font-semibold tracking-wider">Tên sản phẩm</th>
                <th className="p-4 text-left text-[0.7rem] uppercase text-[#94a3b8] font-semibold tracking-wider">SKU</th>
                <th className="p-4 text-left text-[0.7rem] uppercase text-[#94a3b8] font-semibold tracking-wider">Danh mục</th>
                <th className="p-4 text-right text-[0.7rem] uppercase text-[#94a3b8] font-semibold tracking-wider">Giá</th>
                <th className="p-4 text-center text-[0.7rem] uppercase text-[#94a3b8] font-semibold tracking-wider">Trạng thái</th>
                <th className="p-4 text-center text-[0.7rem] uppercase text-[#94a3b8] font-semibold tracking-wider">Xoá</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center text-[#94a3b8] animate-pulse">Đang tải...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-[#94a3b8]">Chưa có sản phẩm nào.</td></tr>
              ) : products.map((p, i) => (
                <tr key={p.id} className={`border-b border-[#30363d] hover:bg-white/[0.02] ${i % 2 ? 'bg-white/[0.01]' : ''}`}>
                  <td className="p-4 font-medium">{p.name}</td>
                  <td className="p-4 font-mono text-xs text-[#94a3b8]">{p.sku || '—'}</td>
                  <td className="p-4 text-[#94a3b8] text-xs">{p.category || '—'}</td>
                  <td className="p-4 text-right font-semibold text-[#8b5cf6]">{p.price > 0 ? fmtVND(p.price) : '—'}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-md text-[0.65rem] font-bold uppercase ${p.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#30363d] text-[#94a3b8]'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => deleteProduct(p.id)} className="text-[#94a3b8] hover:text-[#ef4444] transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
