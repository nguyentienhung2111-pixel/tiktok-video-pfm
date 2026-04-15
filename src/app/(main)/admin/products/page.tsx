'use client';

import React, { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';
import { Plus, Trash2, Link as LinkIcon, AlertCircle, CheckCircle2, Search, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ProductSKUMapping {
  id: string;
  raw_name: string;
  product_id: string;
  products?: Product;
}

type TabType = 'master' | 'mappings' | 'unmapped';

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('master');
  const [products, setProducts] = useState<Product[]>([]);
  const [mappings, setMappings] = useState<ProductSKUMapping[]>([]);
  const [unmappedNames, setUnmappedNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', category: '', price: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === 'master') {
        const { data } = await supabase.from('products').select('*').order('name');
        if (data) setProducts(data as Product[]);
      } else if (activeTab === 'mappings') {
        const { data } = await supabase.from('product_sku_mappings').select('*, products(*)').order('raw_name');
        if (data) setMappings(data as ProductSKUMapping[]);
      } else if (activeTab === 'unmapped') {
        // Find raw product names from videos that aren't in mappings
        const { data: videoProducts } = await supabase.from('videos').select('product_name');
        const { data: existingMappings } = await supabase.from('product_sku_mappings').select('raw_name');
        
        const allVideoNames = Array.from(new Set(videoProducts?.map(v => v.product_name).filter(Boolean) || []));
        const mappedNames = new Set(existingMappings?.map(m => m.raw_name) || []);
        
        const unmapped = (allVideoNames as string[]).filter(name => !mappedNames.has(name));
        setUnmappedNames(unmapped);
        
        // Also fetch products to allow mapping
        const { data: p } = await supabase.from('products').select('*').order('name');
        if (p) setProducts(p as Product[]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function createProduct() {
    if (!newProduct.name.trim()) {
      setMsg({ type: 'error', text: 'Vui lòng nhập tên sản phẩm.' });
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
      setMsg({ type: 'error', text: 'Lỗi: ' + error.message });
    } else {
      setMsg({ type: 'success', text: 'Thêm sản phẩm thành công!' });
      setNewProduct({ name: '', sku: '', category: '', price: '' });
      setShowForm(false);
      fetchData();
      setTimeout(() => setMsg(null), 3000);
    }
    setSaving(false);
  }

  async function deleteProduct(id: string) {
    if (!confirm('Xoá sản phẩm này? Tất cả mapping liên quan cũng sẽ bị xoá.')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchData();
  }

  async function deleteMapping(id: string) {
    if (!confirm('Xoá mapping này?')) return;
    await supabase.from('product_sku_mappings').delete().eq('id', id);
    fetchData();
  }

  async function mapProduct(rawName: string, productId: string) {
    if (!productId) return;
    
    // 1. Create the mapping
    const { error: mapError } = await supabase.from('product_sku_mappings').insert({
      raw_name: rawName,
      product_id: productId
    });
    
    if (mapError) {
      setMsg({ type: 'error', text: 'Lỗi mapping: ' + mapError.message });
      return;
    }

    // 2. Update existing videos to link them to the master product
    const { error: videoError } = await supabase
      .from('videos')
      .update({ product_id: productId })
      .eq('product_name', rawName);

    if (videoError) {
      setMsg({ type: 'error', text: 'Đã tạo mapping nhưng không thể cập nhật video: ' + videoError.message });
    } else {
      setMsg({ type: 'success', text: `Đã map "${rawName}" thành công và cập nhật video liên quan!` });
      fetchData();
      setTimeout(() => setMsg(null), 3000);
    }
  }

  const fmtVND = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Quản lý Sản phẩm & Mapping"
        subtitle="Quản lý sản phẩm gốc và ánh xạ tên từ TikTok Seller Center."
      />

      <div className="p-6 md:p-10 space-y-6 max-w-6xl mx-auto w-full">
        {msg && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top duration-300 ${
            msg.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {msg.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {msg.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex p-1 bg-[#161b22] border border-[#30363d] rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('master')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'master' ? 'bg-[#30363d] text-white shadow-sm' : 'text-[#94a3b8] hover:text-white'}`}
          >
            Sản phẩm gốc
          </button>
          <button
            onClick={() => setActiveTab('mappings')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'mappings' ? 'bg-[#30363d] text-white shadow-sm' : 'text-[#94a3b8] hover:text-white'}`}
          >
            Lịch sử Mapping
          </button>
          <button
            onClick={() => setActiveTab('unmapped')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all relative ${activeTab === 'unmapped' ? 'bg-[#30363d] text-white shadow-sm' : 'text-[#94a3b8] hover:text-white'}`}
          >
            Chưa map
            {unmappedNames.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                {unmappedNames.length}
              </span>
            )}
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <Input
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#161b22] border-[#30363d] focus-visible:ring-primary h-10"
            />
          </div>
          {activeTab === 'master' && (
            <Button onClick={() => setShowForm(!showForm)} className="bg-primary hover:bg-primary/90 w-full md:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Thêm sản phẩm
            </Button>
          )}
        </div>

        {activeTab === 'master' && showForm && (
          <Card className="border-[#30363d] bg-[#161b22] overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-lg">Thêm sản phẩm gốc mới</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#94a3b8]">Tên sản phẩm *</label>
                  <Input
                    placeholder="VD: Vòng tay Flower"
                    value={newProduct.name}
                    onChange={e => setNewProduct(u => ({ ...u, name: e.target.value }))}
                    className="bg-[#0d1117] border-[#30363d]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#94a3b8]">SKU chính (nếu có)</label>
                  <Input
                    placeholder="VD: VT-FLOWER-01"
                    value={newProduct.sku}
                    onChange={e => setNewProduct(u => ({ ...u, sku: e.target.value }))}
                    className="bg-[#0d1117] border-[#30363d]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#94a3b8]">Danh mục</label>
                  <Input
                    placeholder="VD: Trang sức"
                    value={newProduct.category}
                    onChange={e => setNewProduct(u => ({ ...u, category: e.target.value }))}
                    className="bg-[#0d1117] border-[#30363d]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#94a3b8]">Giá niêm yết</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newProduct.price}
                    onChange={e => setNewProduct(u => ({ ...u, price: e.target.value }))}
                    className="bg-[#0d1117] border-[#30363d]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>Hủy</Button>
                <Button onClick={createProduct} disabled={saving} className="bg-primary hover:bg-primary/90">
                  {saving ? 'Đang lưu...' : 'Lưu sản phẩm'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table Content */}
        <Card className="border-[#30363d] bg-[#161b22] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0d1117] border-b border-[#30363d]">
                  {activeTab === 'master' ? (
                    <>
                      <th className="p-4 text-left text-[0.7rem] uppercase text-[#94a3b8] font-bold tracking-wider">Sản phẩm gốc</th>
                      <th className="p-4 text-left text-[0.7rem] uppercase text-[#94a3b8] font-bold tracking-wider">SKU</th>
                      <th className="p-4 text-left text-[0.7rem] uppercase text-[#94a3b8] font-bold tracking-wider">Danh mục</th>
                      <th className="p-4 text-right text-[0.7rem] uppercase text-[#94a3b8] font-bold tracking-wider">Giá</th>
                      <th className="p-4 text-center text-[0.7rem] uppercase text-[#94a3b8] font-bold tracking-wider">Xoá</th>
                    </>
                  ) : activeTab === 'mappings' ? (
                    <>
                      <th className="p-4 text-left text-[0.7rem] uppercase text-[#94a3b8] font-bold tracking-wider">Tên raw từ Excel</th>
                      <th className="p-4 text-center text-[0.7rem] font-bold"><ArrowRight className="w-4 h-4 mx-auto text-[#30363d]" /></th>
                      <th className="p-4 text-left text-[0.7rem] uppercase text-[#94a3b8] font-bold tracking-wider">Sản phẩm gốc (Master)</th>
                      <th className="p-4 text-center text-[0.7rem] uppercase text-[#94a3b8] font-bold tracking-wider">Thao tác</th>
                    </>
                  ) : (
                    <>
                      <th className="p-4 text-left text-[0.7rem] uppercase text-[#94a3b8] font-bold tracking-wider">Tên sản phẩm lạ từ video</th>
                      <th className="p-4 text-left text-[0.7rem] uppercase text-[#94a3b8] font-bold tracking-wider w-1/2">Chọn sản phẩm gốc để ánh xạ</th>
                      <th className="p-4 text-right text-[0.7rem] uppercase text-[#94a3b8] font-bold tracking-wider">Thao tác</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]">
                {loading ? (
                  <tr><td colSpan={6} className="p-12 text-center text-[#94a3b8] animate-pulse">Đang tải dữ liệu...</td></tr>
                ) : (
                  <>
                    {activeTab === 'master' && (
                      products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                        <tr><td colSpan={5} className="p-12 text-center text-[#94a3b8]">Không có sản phẩm nào.</td></tr>
                      ) : (
                        products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((p) => (
                          <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="p-4">
                              <div className="font-semibold text-foreground">{p.name}</div>
                              <div className="text-[10px] text-[#94a3b8] mt-0.5">ID: {p.id.substring(0, 8)}...</div>
                            </td>
                            <td className="p-4 font-mono text-xs text-[#94a3b8]">{p.sku || '—'}</td>
                            <td className="p-4 text-[#94a3b8]">{p.category || '—'}</td>
                            <td className="p-4 text-right font-medium text-emerald-500">{p.price > 0 ? fmtVND(p.price) : '—'}</td>
                            <td className="p-4 text-center">
                              <button onClick={() => deleteProduct(p.id)} className="text-[#94a3b8] hover:text-red-500 transition-colors p-2">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )
                    )}

                    {activeTab === 'mappings' && (
                      mappings.filter(m => m.raw_name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                        <tr><td colSpan={4} className="p-12 text-center text-[#94a3b8]">Chưa có mapping nào được tạo.</td></tr>
                      ) : (
                        mappings.filter(m => m.raw_name.toLowerCase().includes(searchQuery.toLowerCase())).map((m) => (
                          <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-4 font-medium text-[#94a3b8] italic">{m.raw_name}</td>
                            <td className="p-4 text-center text-[#30363d]"><ArrowRight className="w-4 h-4 mx-auto" /></td>
                            <td className="p-4">
                              <Badge variant="secondary" className="bg-primary/20 text-primary border-none font-semibold">
                                {m.products?.name || 'Sản phẩm đã bị xóa'}
                              </Badge>
                            </td>
                            <td className="p-4 text-center">
                              <button onClick={() => deleteMapping(m.id)} className="text-[#94a3b8] hover:text-red-500 p-2">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )
                    )}

                    {activeTab === 'unmapped' && (
                      unmappedNames.filter(name => name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                        <tr><td colSpan={3} className="p-12 text-center text-[#94a3b8]">Tuyệt vời! Tất cả sản phẩm đã được mapping.</td></tr>
                      ) : (
                        unmappedNames.filter(name => name.toLowerCase().includes(searchQuery.toLowerCase())).map((name) => (
                          <tr key={name} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-4 font-medium text-orange-400">{name}</td>
                            <td className="p-4">
                              <select 
                                className="w-full bg-[#0d1117] border border-[#30363d] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                                onChange={(e) => mapProduct(name, e.target.value)}
                                defaultValue=""
                              >
                                <option value="" disabled>Chọn sản phẩm gốc để map...</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-4 text-right">
                              <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
                                <LinkIcon className="w-4 h-4 mr-2" /> Map ngay
                              </Button>
                            </td>
                          </tr>
                        ))
                      )
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
