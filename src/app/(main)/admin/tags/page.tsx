'use client';

import React, { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import { supabase } from '@/lib/supabase';
import { TagGroup, Tag } from '@/types';
import { Plus, Trash2 } from 'lucide-react';

interface TagWithGroup extends Tag {
  tag_groups?: TagGroup | null;
}

export default function TagsPage() {
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [tags, setTags] = useState<TagWithGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', color: '#8b5cf6' });
  const [newTag, setNewTag] = useState({ name: '', group_id: '', description: '' });
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showTagForm, setShowTagForm] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const [{ data: g }, { data: t }] = await Promise.all([
      supabase.from('tag_groups').select('*').order('sort_order'),
      supabase.from('tags').select('*, tag_groups(*)').order('sort_order'),
    ]);
    if (g) setGroups(g as TagGroup[]);
    if (t) setTags(t as TagWithGroup[]);
    setLoading(false);
  }

  async function createGroup() {
    if (!newGroup.name.trim()) return;
    const { error } = await supabase.from('tag_groups').insert({ ...newGroup, sort_order: groups.length });
    if (!error) {
      setMsg('Tạo nhóm thành công!');
      setNewGroup({ name: '', description: '', color: '#8b5cf6' });
      setShowGroupForm(false);
      fetchAll();
      setTimeout(() => setMsg(''), 3000);
    }
  }

  async function createTag() {
    if (!newTag.name.trim() || !newTag.group_id) {
      setMsg('Vui lòng chọn nhóm và nhập tên tag.');
      return;
    }
    const { error } = await supabase.from('tags').insert({
      name: newTag.name.trim(),
      group_id: newTag.group_id,
      description: newTag.description.trim() || null,
      sort_order: tags.filter(t => t.group_id === newTag.group_id).length,
    });
    if (!error) {
      setMsg('Tạo tag thành công!');
      setNewTag({ name: '', group_id: '', description: '' });
      setShowTagForm(false);
      fetchAll();
      setTimeout(() => setMsg(''), 3000);
    }
  }

  async function deleteGroup(id: string) {
    if (!confirm('Xoá nhóm này? Tất cả tag trong nhóm cũng sẽ bị xoá.')) return;
    await supabase.from('tag_groups').delete().eq('id', id);
    fetchAll();
  }

  async function deleteTag(id: string) {
    await supabase.from('tags').delete().eq('id', id);
    setTags(t => t.filter(x => x.id !== id));
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Quản lý Tag"
        subtitle="Tạo và quản lý nhóm tag và tag cho nội dung video."
      />

      <div className="p-12 space-y-8 animate-in fade-in duration-500 max-w-5xl">
        {msg && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium ${msg.includes('Lỗi') ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {msg}
          </div>
        )}

        {/* Tag Groups */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Nhóm Tag</h2>
            <button
              onClick={() => setShowGroupForm(!showGroupForm)}
              className="flex items-center gap-2 px-4 py-2 bg-[#8b5cf6] text-white rounded-xl text-sm font-semibold hover:bg-[#7c3aed]"
            >
              <Plus className="w-4 h-4" />Thêm nhóm
            </button>
          </div>

          {showGroupForm && (
            <div className="flex gap-3 items-end">
              <input
                placeholder="Tên nhóm"
                value={newGroup.name}
                onChange={e => setNewGroup(u => ({ ...u, name: e.target.value }))}
                className="flex-1 bg-[#0d1117] border border-[#30363d] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#8b5cf6]"
              />
              <input
                type="color"
                value={newGroup.color}
                onChange={e => setNewGroup(u => ({ ...u, color: e.target.value }))}
                className="w-10 h-10 rounded-lg cursor-pointer border border-[#30363d] bg-transparent"
              />
              <button onClick={createGroup} className="px-4 py-2.5 bg-[#8b5cf6] text-white rounded-xl text-sm font-semibold">Tạo</button>
              <button onClick={() => setShowGroupForm(false)} className="px-4 py-2.5 border border-[#30363d] rounded-xl text-sm">Hủy</button>
            </div>
          )}

          {loading ? (
            <div className="py-6 text-center text-[#94a3b8] animate-pulse">Đang tải...</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {groups.map(g => (
                <div key={g.id} className="flex items-center gap-2 px-3 py-2 bg-[#0d1117] rounded-xl border border-[#30363d]">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="text-sm font-medium">{g.name}</span>
                  <span className="text-xs text-[#94a3b8]">({tags.filter(t => t.group_id === g.id).length})</span>
                  <button onClick={() => deleteGroup(g.id)} className="text-[#94a3b8] hover:text-[#ef4444] ml-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {groups.length === 0 && <p className="text-sm text-[#94a3b8]">Chưa có nhóm nào.</p>}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Tags</h2>
            <button
              onClick={() => setShowTagForm(!showTagForm)}
              className="flex items-center gap-2 px-4 py-2 bg-[#8b5cf6] text-white rounded-xl text-sm font-semibold hover:bg-[#7c3aed]"
            >
              <Plus className="w-4 h-4" />Thêm tag
            </button>
          </div>

          {showTagForm && (
            <div className="flex gap-3 items-end">
              <select
                value={newTag.group_id}
                onChange={e => setNewTag(u => ({ ...u, group_id: e.target.value }))}
                className="bg-[#0d1117] border border-[#30363d] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#8b5cf6]"
              >
                <option value="">Chọn nhóm</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <input
                placeholder="Tên tag"
                value={newTag.name}
                onChange={e => setNewTag(u => ({ ...u, name: e.target.value }))}
                className="flex-1 bg-[#0d1117] border border-[#30363d] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#8b5cf6]"
              />
              <input
                placeholder="Mô tả (tuỳ chọn)"
                value={newTag.description}
                onChange={e => setNewTag(u => ({ ...u, description: e.target.value }))}
                className="flex-1 bg-[#0d1117] border border-[#30363d] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#8b5cf6]"
              />
              <button onClick={createTag} className="px-4 py-2.5 bg-[#8b5cf6] text-white rounded-xl text-sm font-semibold">Tạo</button>
              <button onClick={() => setShowTagForm(false)} className="px-4 py-2.5 border border-[#30363d] rounded-xl text-sm">Hủy</button>
            </div>
          )}

          <div className="space-y-4">
            {groups.map(group => {
              const groupTags = tags.filter(t => t.group_id === group.id);
              if (groupTags.length === 0) return null;
              return (
                <div key={group.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">{group.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {groupTags.map(tag => (
                      <div key={tag.id} className="flex items-center gap-2 px-3 py-1.5 bg-[#0d1117] rounded-lg border border-[#30363d] text-sm">
                        <span>{tag.name}</span>
                        {tag.description && <span className="text-xs text-[#94a3b8]">— {tag.description}</span>}
                        <button onClick={() => deleteTag(tag.id)} className="text-[#94a3b8] hover:text-[#ef4444] ml-1">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {!loading && tags.length === 0 && (
              <p className="text-sm text-[#94a3b8]">Chưa có tag nào. Tạo nhóm trước rồi thêm tag.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
