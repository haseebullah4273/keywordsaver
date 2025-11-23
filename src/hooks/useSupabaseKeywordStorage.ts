import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MainTarget, Folder, KeywordData, RelevantKeyword, BulkInputResult } from '@/types/keyword';
import { User } from '@supabase/supabase-js';

export const useSupabaseKeywordStorage = (projectId: string | null) => {
  const [data, setData] = useState<KeywordData>({ mainTargets: [], folders: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Initialize auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data from database
  const loadData = useCallback(async () => {
    if (!user || !projectId) {
      setData({ mainTargets: [], folders: [] });
      setIsLoading(false);
      return;
    }

    try {
      const [targetsRes, foldersRes] = await Promise.all([
        supabase
          .from('main_targets')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true }),
        supabase
          .from('folders')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true }),
      ]);

      if (targetsRes.error) throw targetsRes.error;
      if (foldersRes.error) throw foldersRes.error;

      const mainTargets: MainTarget[] = (targetsRes.data || []).map((t) => ({
        id: t.id,
        name: t.name,
        relevantKeywords: (t.relevant_keywords as any[]) || [],
        isDone: t.is_done || false,
        completedAt: t.completed_at ? new Date(t.completed_at) : undefined,
        priority: (t.priority as 'low' | 'medium' | 'high') || 'medium',
        category: t.category || undefined,
        folderId: t.folder_id || undefined,
        createdAt: new Date(t.created_at),
        updatedAt: new Date(t.updated_at),
      }));

      const folders: Folder[] = (foldersRes.data || []).map((f) => ({
        id: f.id,
        name: f.name,
        icon: f.icon || undefined,
        color: f.color || undefined,
        createdAt: new Date(f.created_at),
        updatedAt: new Date(f.updated_at),
      }));

      setData({ mainTargets, folders });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addMainTarget = async (name: string, folderId?: string): Promise<MainTarget> => {
    if (!user || !projectId) throw new Error('Not authenticated or no project selected');

    const { data: inserted, error } = await supabase
      .from('main_targets')
      .insert({
        user_id: user.id,
        project_id: projectId,
        name,
        folder_id: folderId || null,
        relevant_keywords: [],
        is_done: false,
        priority: 'medium',
      })
      .select()
      .single();

    if (error) throw error;

    const newTarget: MainTarget = {
      id: inserted.id,
      name: inserted.name,
      relevantKeywords: [],
      isDone: false,
      priority: 'medium',
      folderId: folderId,
      createdAt: new Date(inserted.created_at),
      updatedAt: new Date(inserted.updated_at),
    };

    setData((prev) => ({
      ...prev,
      mainTargets: [...prev.mainTargets, newTarget],
    }));

    return newTarget;
  };

  const updateMainTarget = async (id: string, updates: Partial<MainTarget>) => {
    if (!user) throw new Error('Not authenticated');

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.folderId !== undefined) dbUpdates.folder_id = updates.folderId;
    if (updates.isDone !== undefined) {
      dbUpdates.is_done = updates.isDone;
      dbUpdates.completed_at = updates.isDone ? new Date().toISOString() : null;
    }

    const { error } = await supabase
      .from('main_targets')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;

    setData((prev) => ({
      ...prev,
      mainTargets: prev.mainTargets.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
      ),
    }));
  };

  const deleteMainTarget = async (id: string) => {
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('main_targets').delete().eq('id', id);
    if (error) throw error;

    setData((prev) => ({
      ...prev,
      mainTargets: prev.mainTargets.filter((t) => t.id !== id),
    }));
  };

  const addRelevantKeywords = async (mainTargetId: string, keywords: string[]): Promise<BulkInputResult> => {
    if (!user) throw new Error('Not authenticated');

    const target = data.mainTargets.find((t) => t.id === mainTargetId);
    if (!target) {
      return { added: [], skipped: keywords, duplicates: [] };
    }

    const existingKeywordTexts = new Set(target.relevantKeywords.map((k) => k.text.toLowerCase()));
    const added: string[] = [];
    const duplicates: string[] = [];

    const newKeywords: RelevantKeyword[] = keywords
      .filter((text) => {
        const lowerText = text.toLowerCase();
        if (existingKeywordTexts.has(lowerText)) {
          duplicates.push(text);
          return false;
        }
        added.push(text);
        existingKeywordTexts.add(lowerText);
        return true;
      })
      .map((text) => ({
        text,
        isDone: false,
      }));

    if (newKeywords.length === 0) {
      return { added: [], skipped: [], duplicates };
    }

    const updatedKeywords = [...target.relevantKeywords, ...newKeywords];

    const { error } = await supabase
      .from('main_targets')
      .update({ relevant_keywords: updatedKeywords as any })
      .eq('id', mainTargetId);

    if (error) throw error;

    setData((prev) => ({
      ...prev,
      mainTargets: prev.mainTargets.map((t) =>
        t.id === mainTargetId
          ? { ...t, relevantKeywords: updatedKeywords, updatedAt: new Date() }
          : t
      ),
    }));

    return { added, skipped: [], duplicates };
  };

  const removeRelevantKeyword = async (mainTargetId: string, keyword: string) => {
    if (!user) throw new Error('Not authenticated');

    const target = data.mainTargets.find((t) => t.id === mainTargetId);
    if (!target) return;

    const updatedKeywords = target.relevantKeywords.filter((k) => k.text !== keyword);

    const { error } = await supabase
      .from('main_targets')
      .update({ relevant_keywords: updatedKeywords as any })
      .eq('id', mainTargetId);

    if (error) throw error;

    setData((prev) => ({
      ...prev,
      mainTargets: prev.mainTargets.map((t) =>
        t.id === mainTargetId
          ? { ...t, relevantKeywords: updatedKeywords, updatedAt: new Date() }
          : t
      ),
    }));
  };

  const toggleMainTargetDone = async (id: string) => {
    const target = data.mainTargets.find((t) => t.id === id);
    if (!target) return;

    await updateMainTarget(id, {
      isDone: !target.isDone,
      completedAt: !target.isDone ? new Date() : undefined,
    });
  };

  const toggleRelevantKeywordDone = async (mainTargetId: string, keywordText: string) => {
    if (!user) throw new Error('Not authenticated');

    const target = data.mainTargets.find((t) => t.id === mainTargetId);
    if (!target) return;

    const updatedKeywords = target.relevantKeywords.map((k) =>
      k.text === keywordText
        ? { ...k, isDone: !k.isDone, completedAt: !k.isDone ? new Date() : undefined }
        : k
    );

    const { error } = await supabase
      .from('main_targets')
      .update({ relevant_keywords: updatedKeywords as any })
      .eq('id', mainTargetId);

    if (error) throw error;

    setData((prev) => ({
      ...prev,
      mainTargets: prev.mainTargets.map((t) =>
        t.id === mainTargetId
          ? { ...t, relevantKeywords: updatedKeywords, updatedAt: new Date() }
          : t
      ),
    }));
  };

  const addFolder = async (name: string, icon?: string, color?: string): Promise<Folder> => {
    if (!user || !projectId) throw new Error('Not authenticated or no project selected');

    const { data: inserted, error } = await supabase
      .from('folders')
      .insert({
        user_id: user.id,
        project_id: projectId,
        name,
        icon: icon || null,
        color: color || null,
      })
      .select()
      .single();

    if (error) throw error;

    const newFolder: Folder = {
      id: inserted.id,
      name: inserted.name,
      icon: inserted.icon || undefined,
      color: inserted.color || undefined,
      createdAt: new Date(inserted.created_at),
      updatedAt: new Date(inserted.updated_at),
    };

    setData((prev) => ({
      ...prev,
      folders: [...prev.folders, newFolder],
    }));

    return newFolder;
  };

  const updateFolder = async (id: string, updates: Partial<Folder>) => {
    if (!user) throw new Error('Not authenticated');

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.color !== undefined) dbUpdates.color = updates.color;

    const { error } = await supabase.from('folders').update(dbUpdates).eq('id', id);
    if (error) throw error;

    setData((prev) => ({
      ...prev,
      folders: prev.folders.map((f) =>
        f.id === id ? { ...f, ...updates, updatedAt: new Date() } : f
      ),
    }));
  };

  const deleteFolder = async (id: string) => {
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('folders').delete().eq('id', id);
    if (error) throw error;

    setData((prev) => ({
      ...prev,
      folders: prev.folders.filter((f) => f.id !== id),
      mainTargets: prev.mainTargets.map((t) =>
        t.folderId === id ? { ...t, folderId: undefined } : t
      ),
    }));
  };

  const moveToFolder = async (targetId: string, folderId: string | undefined) => {
    await updateMainTarget(targetId, { folderId });
  };

  const searchKeywords = (query: string) => {
    const results: Array<{ mainTarget: string; keyword: string; type: 'main' | 'relevant' }> = [];
    const lowerQuery = query.toLowerCase();

    data.mainTargets.forEach((target) => {
      if (target.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          mainTarget: target.name,
          keyword: target.name,
          type: 'main',
        });
      }

      target.relevantKeywords.forEach((kw) => {
        if (kw.text.toLowerCase().includes(lowerQuery)) {
          results.push({
            mainTarget: target.name,
            keyword: kw.text,
            type: 'relevant',
          });
        }
      });
    });

    return results;
  };

  const getArchivedItems = () => {
    const archivedMainTargets = data.mainTargets.filter((t) => t.isDone);
    const archivedKeywords: Array<{ mainTarget: string; keyword: RelevantKeyword }> = [];

    data.mainTargets.forEach((target) => {
      target.relevantKeywords
        .filter((k) => k.isDone)
        .forEach((k) => {
          archivedKeywords.push({ mainTarget: target.name, keyword: k });
        });
    });

    return { mainTargets: archivedMainTargets, relevantKeywords: archivedKeywords };
  };

  const getActiveItems = () => {
    const activeMainTargets = data.mainTargets.filter((t) => !t.isDone);
    return { mainTargets: activeMainTargets, folders: data.folders };
  };

  const reorderMainTargets = (oldIndex: number, newIndex: number) => {
    const newTargets = [...data.mainTargets];
    const [moved] = newTargets.splice(oldIndex, 1);
    newTargets.splice(newIndex, 0, moved);
    setData((prev) => ({ ...prev, mainTargets: newTargets }));
  };

  const exportData = () => data;

  const importData = (importedData: KeywordData) => {
    setData(importedData);
  };

  return {
    data,
    isLoading,
    user,
    addMainTarget,
    updateMainTarget,
    deleteMainTarget,
    addRelevantKeywords,
    removeRelevantKeyword,
    toggleMainTargetDone,
    toggleRelevantKeywordDone,
    searchKeywords,
    getArchivedItems,
    getActiveItems,
    reorderMainTargets,
    exportData,
    importData,
    addFolder,
    updateFolder,
    deleteFolder,
    moveToFolder,
  };
};
