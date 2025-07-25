import { useState, useEffect } from 'react';
import { MainTarget, KeywordData } from '@/types/keyword';

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
          // Convert date strings back to Date objects
          parsed.mainTargets = parsed.mainTargets.map((target: any) => ({
            ...target,
            createdAt: new Date(target.createdAt),
            updatedAt: new Date(target.updatedAt),
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

    const existing = new Set(target.relevantKeywords.map(k => k.toLowerCase()));
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
      updateMainTarget(mainTargetId, {
        relevantKeywords: [...target.relevantKeywords, ...added],
      });
    }

    return { added, skipped, duplicates };
  };

  const removeRelevantKeyword = (mainTargetId: string, keyword: string) => {
    const target = data.mainTargets.find(t => t.id === mainTargetId);
    if (!target) return;

    updateMainTarget(mainTargetId, {
      relevantKeywords: target.relevantKeywords.filter(k => k !== keyword),
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
        if (keyword.toLowerCase().includes(lowerQuery)) {
          results.push({
            mainTarget: target.name,
            keyword,
            type: 'relevant',
          });
        }
      });
    });

    return results;
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
    searchKeywords,
    exportData,
    importData,
  };
};