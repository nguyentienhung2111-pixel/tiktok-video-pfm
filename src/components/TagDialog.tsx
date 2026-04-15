'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Tag, TagGroup, Video } from '@/types';
import { Check, X, Tag as TagIcon, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagDialogProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedVideo: Video) => void;
}

export default function TagDialog({ video, isOpen, onClose, onSuccess }: TagDialogProps) {
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, video]);

  async function fetchData() {
    setLoading(true);
    try {
      const [{ data: g }, { data: t }] = await Promise.all([
        supabase.from('tag_groups').select('*').order('sort_order'),
        supabase.from('tags').select('*').order('name'),
      ]);

      if (g) setGroups(g);
      if (t) setAllTags(t);

      if (video) {
        // Fetch current tags from junction table for accuracy
        const { data: currentTags } = await supabase
          .from('video_tags')
          .select('tag_id')
          .eq('video_id', video.id);
        
        if (currentTags) {
          setSelectedTagIds(currentTags.map(ct => ct.tag_id));
        } else {
          // Fallback to array if junction is empty
          setSelectedTagIds([]);
        }
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
    } finally {
      setLoading(false);
    }
  }

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  async function handleSave() {
    if (!video) return;
    setSaving(true);
    try {
      // 1. Clear existing junction entries
      await supabase.from('video_tags').delete().eq('video_id', video.id);

      // 2. Insert new junction entries
      if (selectedTagIds.length > 0) {
        const newEntries = selectedTagIds.map(tid => ({
          video_id: video.id,
          tag_id: tid
        }));
        await supabase.from('video_tags').insert(newEntries);
      }

      // 3. Update the tags array on the video for quick display
      const selectedTagNames = allTags
        .filter(t => selectedTagIds.includes(t.id))
        .map(t => t.name);

      const { data: updatedVideo, error: updateError } = await supabase
        .from('videos')
        .update({ tags: selectedTagNames })
        .eq('id', video.id)
        .select()
        .single();

      if (updateError) throw updateError;

      onSuccess(updatedVideo as Video);
      onClose();
    } catch (err) {
      console.error('Error saving tags:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#161b22] border-[#30363d] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <TagIcon className="w-5 h-5 text-primary" />
            Gắn Tag cho Video
          </DialogTitle>
          <div className="text-sm text-muted-foreground mt-1">
            "{video?.video_title || 'Video'}"
          </div>
        </DialogHeader>

        <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Đang tải danh sách tag...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Chưa có nhóm tag nào. Vui lòng tạo trong phần Quản trị.
            </div>
          ) : (
            groups.map(group => {
              const tagsInGroup = allTags.filter(t => t.group_id === group.id);
              if (tagsInGroup.length === 0) return null;

              return (
                <div key={group.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">
                      {group.name}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tagsInGroup.map(tag => {
                      const isSelected = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.id)}
                          className={cn(
                            "group flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all duration-200 outline-none",
                            isSelected 
                              ? "bg-primary/20 border-primary text-primary"
                              : "bg-[#0d1117] border-[#30363d] text-[#94a3b8] hover:border-[#8b5cf6]/50"
                          )}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 animate-in zoom-in duration-200" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={saving} className="text-[#94a3b8] hover:text-white">
            Hủy
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || loading} 
            className="bg-primary hover:bg-primary/90 text-white min-w-[100px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang lưu...
              </>
            ) : (
              'Lưu thay đổi'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
