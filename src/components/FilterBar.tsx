'use client';

import React, { useEffect, useState } from 'react';
import { Search, Filter, X, ChevronDown, Tag, Package, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/lib/supabase';
import { Product, Tag as TagType } from '@/types';
import { cn } from '@/lib/utils';

export interface FilterState {
  search: string;
  productId: string;
  tagIds: string[];
  minGMV: string;
  minViews: string;
  sourceType: string;
}

interface FilterBarProps {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  onClear: () => void;
}

export default function FilterBar({ filters, setFilters, onClear }: FilterBarProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [allTags, setAllTags] = useState<TagType[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('tags').select('*').order('name'),
      ]);
      if (p) setProducts(p);
      if (t) setAllTags(t);
    }
    fetchData();
  }, []);

  const handleTagToggle = (tagId: string) => {
    const newTags = filters.tagIds.includes(tagId)
      ? filters.tagIds.filter(id => id !== tagId)
      : [...filters.tagIds, tagId];
    setFilters({ ...filters, tagIds: newTags });
  };

  const activeFilterCount = [
    filters.productId,
    filters.minGMV,
    filters.minViews,
    filters.sourceType !== 'all' ? filters.sourceType : '',
    ...filters.tagIds
  ].filter(Boolean).length;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex flex-col md:flex-row gap-3">
        {/* Main Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <Input 
            placeholder="Tìm theo creator hoặc tiêu đề video..." 
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-10 bg-[#161b22] border-[#30363d] h-11 focus-visible:ring-primary"
          />
        </div>

        {/* Source Toggle */}
        <div className="flex bg-[#161b22] border border-[#30363d] p-1 rounded-lg h-11">
          {['all', 'brand', 'koc'].map((src) => (
            <button
              key={src}
              onClick={() => setFilters({ ...filters, sourceType: src })}
              className={cn(
                "px-3 rounded-md text-xs font-bold uppercase transition-all",
                filters.sourceType === src 
                  ? "bg-primary text-white shadow-sm" 
                  : "text-[#94a3b8] hover:text-white"
              )}
            >
              {src === 'all' ? 'Tất cả' : src === 'brand' ? 'Brand' : 'KOC'}
            </button>
          ))}
        </div>

        {/* Advanced Toggle */}
        <Button 
          variant="outline" 
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "h-11 border-[#30363d] bg-[#161b22] gap-2",
            activeFilterCount > 0 && "border-primary text-primary"
          )}
        >
          <Filter className="w-4 h-4" />
          Bộ lọc nâng cao
          {activeFilterCount > 0 && (
            <Badge className="ml-1 px-1.5 h-5 bg-primary text-white border-none">
              {activeFilterCount}
            </Badge>
          )}
          <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
        </Button>

        {activeFilterCount > 0 && (
          <Button variant="ghost" onClick={onClear} className="h-11 text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <X className="w-4 h-4 mr-2" />
            Xóa lọc
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-[#161b22] border border-[#30363d] rounded-2xl animate-in zoom-in-95 duration-200">
          {/* Product Filter */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] flex items-center gap-1.5">
              <Package className="w-3 h-3" /> Sản phẩm gốc
            </label>
            <Select 
              value={filters.productId} 
              onValueChange={(val) => setFilters({ ...filters, productId: val === 'none' ? '' : val })}
            >
              <SelectTrigger className="bg-[#0d1117] border-[#30363d]">
                <SelectValue placeholder="Chọn sản phẩm..." />
              </SelectTrigger>
              <SelectContent className="bg-[#161b22] border-[#30363d] text-white">
                <SelectItem value="none">Tất cả sản phẩm</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags Filter */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] flex items-center gap-1.5">
              <Tag className="w-3 h-3" /> Theo Tag
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-[#0d1117] border-[#30363d] font-normal h-10">
                  {filters.tagIds.length === 0 
                    ? "Chọn tag..." 
                    : `Đã chọn ${filters.tagIds.length} tag`}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 bg-[#161b22] border-[#30363d] text-white">
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {allTags.map(tag => (
                    <div 
                      key={tag.id}
                      onClick={() => handleTagToggle(tag.id)}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                        filters.tagIds.includes(tag.id) ? "bg-primary/20 text-primary" : "hover:bg-white/5 text-[#94a3b8] hover:text-white"
                      )}
                    >
                      <div className={cn(
                        "w-3.5 h-3.5 border rounded-sm flex items-center justify-center",
                        filters.tagIds.includes(tag.id) ? "border-primary bg-primary" : "border-[#30363d]"
                      )}>
                        {filters.tagIds.includes(tag.id) && <X className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="text-sm">{tag.name}</span>
                    </div>
                  ))}
                  {allTags.length === 0 && <p className="text-xs text-center py-2 text-muted-foreground">Chưa có tag nào.</p>}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* GMV Range */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] flex items-center gap-1.5">
              <BarChart3 className="w-3 h-3" /> GMV tối thiểu (₫)
            </label>
            <Input 
              type="number"
              placeholder="0"
              value={filters.minGMV}
              onChange={(e) => setFilters({ ...filters, minGMV: e.target.value })}
              className="bg-[#0d1117] border-[#30363d]"
            />
          </div>

          {/* Views Range */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] flex items-center gap-1.5">
              <BarChart3 className="w-3 h-3" /> Views tối thiểu
            </label>
            <Input 
              type="number"
              placeholder="0"
              value={filters.minViews}
              onChange={(e) => setFilters({ ...filters, minViews: e.target.value })}
              className="bg-[#0d1117] border-[#30363d]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
