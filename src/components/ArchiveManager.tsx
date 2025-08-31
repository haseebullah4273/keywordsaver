import { useState, useMemo } from 'react';
import { ArrowLeft, RotateCcw, Trash2, Copy, CheckSquare, Square, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MainTarget, RelevantKeyword } from '@/types/keyword';
import { cn } from '@/lib/utils';

interface ArchiveManagerProps {
  archivedMainTargets: MainTarget[];
  archivedKeywords: Array<{ mainTarget: string; keyword: RelevantKeyword }>;
  onBack: () => void;
  onReactivateMainTarget: (id: string) => void;
  onReactivateKeyword: (mainTargetId: string, keywordText: string) => void;
  onDeleteMainTarget: (id: string) => void;
  onDeleteKeyword: (mainTargetId: string, keyword: string) => void;
}

export const ArchiveManager = ({
  archivedMainTargets,
  archivedKeywords,
  onBack,
  onReactivateMainTarget,
  onReactivateKeyword,
  onDeleteMainTarget,
  onDeleteKeyword,
}: ArchiveManagerProps) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const archiveStats = useMemo(() => {
    const totalMainTargets = archivedMainTargets.length;
    const totalKeywords = archivedKeywords.length;
    const totalItems = totalMainTargets + totalKeywords;

    return {
      totalMainTargets,
      totalKeywords,
      totalItems,
    };
  }, [archivedMainTargets, archivedKeywords]);

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allIds = [
      ...archivedMainTargets.map(target => `main-${target.id}`),
      ...archivedKeywords.map((item, index) => `keyword-${index}`)
    ];
    
    if (selectedItems.length === allIds.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(allIds);
    }
  };

  const handleBulkReactivate = () => {
    selectedItems.forEach(id => {
      if (id.startsWith('main-')) {
        const targetId = id.replace('main-', '');
        onReactivateMainTarget(targetId);
      } else if (id.startsWith('keyword-')) {
        const index = parseInt(id.replace('keyword-', ''));
        const item = archivedKeywords[index];
        if (item) {
          // Find the main target ID for this keyword
          const mainTarget = archivedMainTargets.find(t => t.name === item.mainTarget);
          if (mainTarget) {
            onReactivateKeyword(mainTarget.id, item.keyword.text);
          }
        }
      }
    });
    setSelectedItems([]);
  };

  const handleCopySelected = () => {
    const selectedText = selectedItems.map(id => {
      if (id.startsWith('main-')) {
        const targetId = id.replace('main-', '');
        const target = archivedMainTargets.find(t => t.id === targetId);
        return target?.name || '';
      } else if (id.startsWith('keyword-')) {
        const index = parseInt(id.replace('keyword-', ''));
        const item = archivedKeywords[index];
        return item?.keyword.text || '';
      }
      return '';
    }).filter(Boolean).join(', ');

    navigator.clipboard.writeText(selectedText);
  };

  const allSelected = selectedItems.length > 0 && selectedItems.length === 
    (archivedMainTargets.length + archivedKeywords.length);

  return (
    <div className="flex-1 p-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Active
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Archive</h1>
            <p className="text-muted-foreground">
              Completed keywords and targets
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{archiveStats.totalItems}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Main Targets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{archiveStats.totalMainTargets}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{archiveStats.totalKeywords}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {(archivedMainTargets.length > 0 || archivedKeywords.length > 0) && (
        <div className="flex items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              Select All ({selectedItems.length} selected)
            </span>
          </div>
          
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleBulkReactivate}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reactivate Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopySelected}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Selected
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Archive Content */}
      <div className="space-y-6">
        {/* Archived Main Targets */}
        {archivedMainTargets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Completed Main Targets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {archivedMainTargets.map((target) => (
                <div
                  key={target.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedItems.includes(`main-${target.id}`)}
                      onCheckedChange={() => handleSelectItem(`main-${target.id}`)}
                    />
                    <div className="flex-1">
                      <div className="font-medium line-through text-muted-foreground">
                        {target.name}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4">
                        <span>{target.relevantKeywords.length} keywords</span>
                        {target.completedAt && (
                          <span>Completed: {target.completedAt.toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {target.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReactivateMainTarget(target.id)}
                      className="flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reactivate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteMainTarget(target.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Archived Keywords */}
        {archivedKeywords.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Completed Keywords</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {archivedKeywords.map((item, index) => {
                const mainTarget = archivedMainTargets.find(t => t.name === item.mainTarget);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedItems.includes(`keyword-${index}`)}
                        onCheckedChange={() => handleSelectItem(`keyword-${index}`)}
                      />
                      <div className="flex-1">
                        <div className="font-medium line-through text-muted-foreground">
                          {item.keyword.text}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          <span>From: {item.mainTarget}</span>
                          {item.keyword.completedAt && (
                            <span>Completed: {item.keyword.completedAt.toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.keyword.text.length} chars
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => mainTarget && onReactivateKeyword(mainTarget.id, item.keyword.text)}
                        className="flex items-center gap-1"
                        disabled={!mainTarget}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reactivate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => mainTarget && onDeleteKeyword(mainTarget.id, item.keyword.text)}
                        className="text-destructive hover:text-destructive"
                        disabled={!mainTarget}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {archivedMainTargets.length === 0 && archivedKeywords.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-muted-foreground">
                <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No archived items</h3>
                <p className="text-sm">Completed keywords and targets will appear here.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};