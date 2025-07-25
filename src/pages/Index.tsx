import { useState, useEffect } from 'react';
import { KeywordSidebar } from '@/components/KeywordSidebar';
import { KeywordManager } from '@/components/KeywordManager';
import { useKeywordStorage } from '@/hooks/useKeywordStorage';
import { MainTarget } from '@/types/keyword';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const {
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
  } = useKeywordStorage();

  const [selectedTarget, setSelectedTarget] = useState<MainTarget | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ mainTarget: string; keyword: string; type: 'main' | 'relevant' }>>([]);
  const { toast } = useToast();

  // Update search results when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchKeywords(searchQuery.trim());
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, data, searchKeywords]);

  // Auto-select first target if none selected and targets exist
  useEffect(() => {
    if (!selectedTarget && data.mainTargets.length > 0) {
      setSelectedTarget(data.mainTargets[0]);
    }
  }, [data.mainTargets, selectedTarget]);

  // Update selected target when data changes (to keep it in sync)
  useEffect(() => {
    if (selectedTarget) {
      const updatedTarget = data.mainTargets.find(t => t.id === selectedTarget.id);
      if (updatedTarget) {
        setSelectedTarget(updatedTarget);
      } else {
        // Target was deleted
        setSelectedTarget(data.mainTargets.length > 0 ? data.mainTargets[0] : null);
      }
    }
  }, [data.mainTargets, selectedTarget]);

  const handleAddTarget = (name: string) => {
    const newTarget = addMainTarget(name);
    setSelectedTarget(newTarget);
    toast({
      title: "Target Added",
      description: `"${name}" has been created successfully.`,
    });
  };

  const handleDeleteTarget = (id: string) => {
    const target = data.mainTargets.find(t => t.id === id);
    if (!target) return;

    deleteMainTarget(id);
    toast({
      title: "Target Deleted",
      description: `"${target.name}" has been deleted.`,
    });
  };

  const handleExport = () => {
    const exportedData = exportData();
    const dataStr = JSON.stringify(exportedData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pinterest-keywords-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Data Exported",
      description: "Your keyword data has been exported successfully.",
    });
  };

  const handleImport = (importedData: any) => {
    try {
      // Basic validation
      if (!importedData.mainTargets || !Array.isArray(importedData.mainTargets)) {
        throw new Error('Invalid data format');
      }

      importData(importedData);
      toast({
        title: "Data Imported",
        description: "Your keyword data has been imported successfully.",
      });
    } catch (error) {
      toast({
        title: "Import Error",
        description: "The file format is invalid. Please check your data.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-pinterest" />
          <span className="text-lg">Loading your keywords...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <KeywordSidebar
        mainTargets={data.mainTargets}
        selectedTarget={selectedTarget}
        onSelectTarget={setSelectedTarget}
        onAddTarget={handleAddTarget}
        onDeleteTarget={handleDeleteTarget}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchResults={searchResults}
        onExport={handleExport}
        onImport={handleImport}
      />
      
      <KeywordManager
        selectedTarget={selectedTarget}
        onAddKeywords={addRelevantKeywords}
        onRemoveKeyword={removeRelevantKeyword}
        onUpdateTarget={updateMainTarget}
      />
    </div>
  );
};

export default Index;
