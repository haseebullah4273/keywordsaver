import { useState, useEffect } from 'react';
import { KeywordSidebarWithFolders } from '@/components/KeywordSidebarWithFolders';
import { KeywordManager } from '@/components/KeywordManager';
import { ArchiveManager } from '@/components/ArchiveManager';
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
  } = useKeywordStorage();

  const [selectedTarget, setSelectedTarget] = useState<MainTarget | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ mainTarget: string; keyword: string; type: 'main' | 'relevant' }>>([]);
  const [showArchive, setShowArchive] = useState(false);
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
    if (!selectedTarget && !showArchive) {
      const activeItems = getActiveItems();
      if (activeItems.mainTargets.length > 0) {
        setSelectedTarget(activeItems.mainTargets[0]);
      }
    }
  }, [data.mainTargets, selectedTarget, showArchive, getActiveItems]);

  // Update selected target when data changes (to keep it in sync)
  useEffect(() => {
    if (selectedTarget && !showArchive) {
      const activeItems = getActiveItems();
      const updatedTarget = activeItems.mainTargets.find(t => t.id === selectedTarget.id);
      if (updatedTarget) {
        setSelectedTarget(updatedTarget);
      } else {
        // Target was deleted or completed
        setSelectedTarget(activeItems.mainTargets.length > 0 ? activeItems.mainTargets[0] : null);
      }
    }
  }, [data.mainTargets, selectedTarget, showArchive, getActiveItems]);

  const handleAddTarget = (name: string, folderId?: string) => {
    const newTarget = addMainTarget(name, folderId);
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

  const handleReorderTargets = (oldIndex: number, newIndex: number) => {
    // Only reorder if we're working with active items
    const activeItems = getActiveItems();
    if (oldIndex >= 0 && newIndex >= 0 && oldIndex < activeItems.mainTargets.length && newIndex < activeItems.mainTargets.length) {
      // Find the actual indices in the full data array
      const activeTarget1 = activeItems.mainTargets[oldIndex];
      const activeTarget2 = activeItems.mainTargets[newIndex];
      
      const fullOldIndex = data.mainTargets.findIndex(t => t.id === activeTarget1.id);
      const fullNewIndex = data.mainTargets.findIndex(t => t.id === activeTarget2.id);
      
      reorderMainTargets(fullOldIndex, fullNewIndex);
    }
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

  const handleShowArchive = () => {
    setShowArchive(true);
    setSelectedTarget(null);
  };

  const handleBackToActive = () => {
    setShowArchive(false);
    const activeItems = getActiveItems();
    if (activeItems.mainTargets.length > 0) {
      setSelectedTarget(activeItems.mainTargets[0]);
    }
  };

  const handleReactivateMainTarget = (id: string) => {
    toggleMainTargetDone(id);
  };

  const handleReactivateKeyword = (mainTargetId: string, keywordText: string) => {
    toggleRelevantKeywordDone(mainTargetId, keywordText);
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

  const activeItems = getActiveItems();
  const archivedItems = getArchivedItems();

  return (
    <div className="min-h-screen bg-background flex">
      {!showArchive ? (
        <>
          <KeywordSidebarWithFolders
            mainTargets={activeItems.mainTargets}
            folders={data.folders}
            selectedTarget={selectedTarget}
            onSelectTarget={setSelectedTarget}
            onAddTarget={handleAddTarget}
            onDeleteTarget={handleDeleteTarget}
            onReorderTargets={handleReorderTargets}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchResults={searchResults}
            onExport={handleExport}
            onImport={handleImport}
            onShowArchive={handleShowArchive}
            archivedCount={archivedItems.mainTargets.length + archivedItems.relevantKeywords.length}
            onAddFolder={addFolder}
            onUpdateFolder={updateFolder}
            onDeleteFolder={deleteFolder}
            onMoveToFolder={moveToFolder}
          />
          
          <KeywordManager
            selectedTarget={selectedTarget}
            onAddKeywords={addRelevantKeywords}
            onRemoveKeyword={removeRelevantKeyword}
            onUpdateTarget={updateMainTarget}
            onToggleMainTargetDone={toggleMainTargetDone}
            onToggleRelevantKeywordDone={toggleRelevantKeywordDone}
          />
        </>
      ) : (
        <ArchiveManager
          archivedMainTargets={archivedItems.mainTargets}
          archivedKeywords={archivedItems.relevantKeywords}
          onBack={handleBackToActive}
          onReactivateMainTarget={handleReactivateMainTarget}
          onReactivateKeyword={handleReactivateKeyword}
          onDeleteMainTarget={deleteMainTarget}
          onDeleteKeyword={removeRelevantKeyword}
        />
      )}
    </div>
  );
};

export default Index;
