import { useState, useEffect } from 'react';
import { MainTarget, KeywordData, RelevantKeyword } from '@/types/keyword';

const STORAGE_KEY = 'pinterest-keyword-manager';

export const useKeywordStorage = () => {
  const [data, setData] = useState<KeywordData>({ mainTargets: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Convert date strings back to Date objects and migrate old data
          parsed.mainTargets = parsed.mainTargets.map((target: any) => ({
            ...target,
            createdAt: new Date(target.createdAt),
            updatedAt: new Date(target.updatedAt),
            // Migration: add missing fields for existing data
            isDone: target.isDone ?? false,
            priority: target.priority ?? 'medium',
            category: target.category,
            completedAt: target.completedAt ? new Date(target.completedAt) : undefined,
            // Migration: convert string arrays to RelevantKeyword objects
            relevantKeywords: Array.isArray(target.relevantKeywords) 
              ? target.relevantKeywords.map((kw: any) => 
                  typeof kw === 'string' 
                    ? { text: kw, isDone: false }
                    : {
                        text: kw.text,
                        isDone: kw.isDone ?? false,
                        completedAt: kw.completedAt ? new Date(kw.completedAt) : undefined
                      }
                )
              : []
          }));
          setData(parsed);
        }
      } catch (error) {
        console.error('Error loading keyword data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const saveData = (newData: KeywordData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      setData(newData);
    } catch (error) {
      console.error('Error saving keyword data:', error);
    }
  };

  const addMainTarget = (name: string): MainTarget => {
    const newTarget: MainTarget = {
      id: crypto.randomUUID(),
      name,
      relevantKeywords: [],
      isDone: false,
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newData = {
      ...data,
      mainTargets: [...data.mainTargets, newTarget],
    };

    saveData(newData);
    return newTarget;
  };

  const updateMainTarget = (id: string, updates: Partial<MainTarget>) => {
    const newData = {
      ...data,
      mainTargets: data.mainTargets.map(target =>
        target.id === id
          ? { ...target, ...updates, updatedAt: new Date() }
          : target
      ),
    };

    saveData(newData);
  };

  const deleteMainTarget = (id: string) => {
    const newData = {
      ...data,
      mainTargets: data.mainTargets.filter(target => target.id !== id),
    };

    saveData(newData);
  };

  const addRelevantKeywords = (mainTargetId: string, keywords: string[]) => {
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
      // Search main target name
      if (target.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          mainTarget: target.name,
          keyword: target.name,
          type: 'main',
        });
      }

      // Search relevant keywords
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

  const exportData = () => {
    return data;
  };

  const importData = (importedData: KeywordData) => {
    saveData(importedData);
  };

  return {
    data,
    isLoading,
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
    exportData,
    importData,
  };
};