import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MainTarget, KeywordData, RelevantKeyword, Folder, BulkInputResult } from '@/types/keyword';
import { User } from '@supabase/supabase-js';

export const useSupabaseKeywordStorage = () => {
  const [data, setData] = useState<KeywordData>({ mainTargets: [], folders: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Auth state management
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
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        // Load folders
        const { data: foldersData, error: foldersError } = await supabase
          .from('folders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (foldersError) throw foldersError;

        // Load main targets
        const { data: targetsData, error: targetsError } = await supabase
          .from('main_targets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (targetsError) throw targetsError;

        // Transform database data to app format
        const folders: Folder[] = (foldersData || []).map(f => ({
          id: f.id,
          name: f.name,
          icon: f.icon || undefined,
          color: f.color || undefined,
          createdAt: new Date(f.created_at),
          updatedAt: new Date(f.updated_at),
        }));

        const mainTargets: MainTarget[] = (targetsData || []).map(t => ({
          id: t.id,
          name: t.name,
          relevantKeywords: (t.relevant_keywords as any[]) || [],
          isDone: t.is_done,
          priority: t.priority as 'low' | 'medium' | 'high',
          category: t.category || undefined,
          folderId: t.folder_id || undefined,
          completedAt: t.completed_at ? new Date(t.completed_at) : undefined,
          createdAt: new Date(t.created_at),
          updatedAt: new Date(t.updated_at),
        }));

        setData({ mainTargets, folders });
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  const addMainTarget = async (name: string, folderId?: string): Promise<MainTarget> => {
    if (!user) throw new Error('User not authenticated');

    const { data: newTarget, error } = await supabase
      .from('main_targets')
      .insert({
        user_id: user.id,
        name,
        folder_id: folderId,
        relevant_keywords: [],
        is_done: false,
        priority: 'medium',
      })
      .select()
      .single();

    if (error) throw error;

    const target: MainTarget = {
      id: newTarget.id,
      name: newTarget.name,
      relevantKeywords: [],
      isDone: false,
      priority: 'medium',
      folderId: folderId,
      createdAt: new Date(newTarget.created_at),
      updatedAt: new Date(newTarget.updated_at),
    };

    setData(prev => ({
      ...prev,
      mainTargets: [...prev.mainTargets, target],
    }));

    return target;
  };

  const updateMainTarget = async (id: string, updates: Partial<MainTarget>) => {
    if (!user) throw new Error('User not authenticated');

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.relevantKeywords !== undefined) dbUpdates.relevant_keywords = updates.relevantKeywords;
    if (updates.isDone !== undefined) dbUpdates.is_done = updates.isDone;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.folderId !== undefined) dbUpdates.folder_id = updates.folderId;
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt?.toISOString();

    const { error } = await supabase
      .from('main_targets')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    setData(prev => ({
      ...prev,
      mainTargets: prev.mainTargets.map(target =>
        target.id === id
          ? { ...target, ...updates, updatedAt: new Date() }
          : target
      ),
    }));
  };

  const deleteMainTarget = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('main_targets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    setData(prev => ({
      ...prev,
      mainTargets: prev.mainTargets.filter(target => target.id !== id),
    }));
  };

  const addRelevantKeywords = (mainTargetId: string, keywords: string[]): BulkInputResult => {
    const target = data.mainTargets.find(t => t.id === mainTargetId);
    if (!target) return { added: [], skipped: keywords, duplicates: [] };

    const existing = new Set(target.relevantKeywords.map(k => k.text.toLowerCase()));
    const added: string[] = [];
    const duplicates: string[] = [];
    const skipped: string[] = [];

    keywords.forEach(keyword => {
      const trimmed = keyword.trim();
      if (!trimmed) {
        skipped.push(keyword);
        return;
      }

      if (existing.has(trimmed.toLowerCase())) {
        duplicates.push(trimmed);
        return;
      }

      added.push(trimmed);
      existing.add(trimmed.toLowerCase());
    });

    if (added.length > 0) {
      const newKeywords: RelevantKeyword[] = added.map(text => ({
        text,
        isDone: false
      }));
      
      updateMainTarget(mainTargetId, {
        relevantKeywords: [...target.relevantKeywords, ...newKeywords],
      });
    }

    return { added, skipped, duplicates };
  };

  const removeRelevantKeyword = (mainTargetId: string, keyword: string) => {
    const target = data.mainTargets.find(t => t.id === mainTargetId);
    if (!target) return;

    updateMainTarget(mainTargetId, {
      relevantKeywords: target.relevantKeywords.filter(k => k.text !== keyword),
    });
  };

  const toggleMainTargetDone = (id: string) => {
    const target = data.mainTargets.find(t => t.id === id);
    if (!target) return;

    updateMainTarget(id, {
      isDone: !target.isDone,
      completedAt: !target.isDone ? new Date() : undefined,
    });
  };

  const toggleRelevantKeywordDone = (mainTargetId: string, keywordText: string) => {
    const target = data.mainTargets.find(t => t.id === mainTargetId);
    if (!target) return;

    const updatedKeywords = target.relevantKeywords.map(k => 
      k.text === keywordText 
        ? { ...k, isDone: !k.isDone, completedAt: !k.isDone ? new Date() : undefined }
        : k
    );

    updateMainTarget(mainTargetId, {
      relevantKeywords: updatedKeywords,
    });
  };

  const searchKeywords = (query: string): Array<{ mainTarget: string; keyword: string; type: 'main' | 'relevant' }> => {
    const results: Array<{ mainTarget: string; keyword: string; type: 'main' | 'relevant' }> = [];
    const lowerQuery = query.toLowerCase();

    data.mainTargets.forEach(target => {
      if (target.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          mainTarget: target.name,
          keyword: target.name,
          type: 'main',
        });
      }

      target.relevantKeywords.forEach(keyword => {
        if (keyword.text.toLowerCase().includes(lowerQuery)) {
          results.push({
            mainTarget: target.name,
            keyword: keyword.text,
            type: 'relevant',
          });
        }
      });
    });

    return results;
  };

  const getArchivedItems = () => {
    const archived = {
      mainTargets: data.mainTargets.filter(t => t.isDone),
      relevantKeywords: [] as Array<{ mainTarget: string; keyword: RelevantKeyword }>
    };

    data.mainTargets.forEach(target => {
      target.relevantKeywords.filter(k => k.isDone).forEach(keyword => {
        archived.relevantKeywords.push({
          mainTarget: target.name,
          keyword
        });
      });
    });

    return archived;
  };

  const getActiveItems = () => {
    return {
      mainTargets: data.mainTargets.filter(t => !t.isDone).map(target => ({
        ...target,
        relevantKeywords: target.relevantKeywords.filter(k => !k.isDone)
      }))
    };
  };

  const reorderMainTargets = (oldIndex: number, newIndex: number) => {
    const newTargets = [...data.mainTargets];
    const [reorderedItem] = newTargets.splice(oldIndex, 1);
    newTargets.splice(newIndex, 0, reorderedItem);
    
    setData(prev => ({ ...prev, mainTargets: newTargets }));
  };

  const exportData = () => {
    return data;
  };

  const importData = (importedData: KeywordData) => {
    setData(importedData);
  };

  const addFolder = async (name: string, icon?: string, color?: string): Promise<Folder> => {
    if (!user) throw new Error('User not authenticated');

    const { data: newFolder, error } = await supabase
      .from('folders')
      .insert({
        user_id: user.id,
        name,
        icon,
        color,
      })
      .select()
      .single();

    if (error) throw error;

    const folder: Folder = {
      id: newFolder.id,
      name: newFolder.name,
      icon: newFolder.icon || undefined,
      color: newFolder.color || undefined,
      createdAt: new Date(newFolder.created_at),
      updatedAt: new Date(newFolder.updated_at),
    };

    setData(prev => ({
      ...prev,
      folders: [...prev.folders, folder],
    }));

    return folder;
  };

  const updateFolder = async (id: string, updates: Partial<Folder>) => {
    if (!user) throw new Error('User not authenticated');

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.color !== undefined) dbUpdates.color = updates.color;

    const { error } = await supabase
      .from('folders')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    setData(prev => ({
      ...prev,
      folders: prev.folders.map(folder =>
        folder.id === id
          ? { ...folder, ...updates, updatedAt: new Date() }
          : folder
      ),
    }));
  };

  const deleteFolder = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    setData(prev => ({
      ...prev,
      folders: prev.folders.filter(folder => folder.id !== id),
      mainTargets: prev.mainTargets.map(target =>
        target.folderId === id
          ? { ...target, folderId: undefined }
          : target
      ),
    }));
  };

  const moveToFolder = (targetId: string, folderId: string | undefined) => {
    updateMainTarget(targetId, { folderId });
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
