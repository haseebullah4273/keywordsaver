import { useState, useMemo } from 'react';
import { ArrowLeft, RotateCcw, Trash2, Copy, CheckSquare, Square, Archive, Sparkles, Clock, Target } from 'lucide-react';
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
    <div className="flex-1 p-6 bg-gradient-subtle min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={onBack} 
            className="flex items-center gap-2 hover-lift glass-button"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Active
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Archive className="h-8 w-8 text-pinterest animate-pulse" />
              <h1 className="text-3xl font-bold text-gradient">Archive Center</h1>
              <Sparkles className="h-6 w-6 text-pinterest/60 animate-pulse" />
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Your completed keywords and targets collection
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="glass-card hover-lift pulse-glow bg-gradient-to-br from-pinterest/10 to-pinterest-light/30 border-pinterest/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Archive className="h-4 w-4 text-pinterest" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pinterest">{archiveStats.totalItems}</div>
            <div className="text-xs text-muted-foreground mt-1">Complete collection</div>
          </CardContent>
        </Card>
        
        <Card className="glass-card hover-lift bg-gradient-to-br from-success/10 to-success-light/30 border-success/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-success" />
              Main Targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{archiveStats.totalMainTargets}</div>
            <div className="text-xs text-muted-foreground mt-1">Achieved goals</div>
          </CardContent>
        </Card>
        
        <Card className="glass-card hover-lift bg-gradient-to-br from-warning/10 to-warning-light/30 border-warning/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-warning" />
              Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{archiveStats.totalKeywords}</div>
            <div className="text-xs text-muted-foreground mt-1">Completed phrases</div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {(archivedMainTargets.length > 0 || archivedKeywords.length > 0) && (
        <div className="glass-card mb-8 p-5 bg-gradient-to-r from-pinterest/5 via-transparent to-success/5 border-pinterest/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                className="border-pinterest data-[state=checked]:bg-pinterest hover:border-pinterest/80"
              />
              <span className="text-sm font-medium text-foreground">
                Select All 
                <Badge variant="secondary" className="ml-2 bg-pinterest/10 text-pinterest border-pinterest/20">
                  {selectedItems.length} selected
                </Badge>
              </span>
            </div>
            
            {selectedItems.length > 0 && (
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={handleBulkReactivate}
                  className="btn-elegant flex items-center gap-2 hover-lift"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reactivate Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopySelected}
                  className="glass-button flex items-center gap-2 hover-glow"
                >
                  <Copy className="h-4 w-4" />
                  Copy Selected
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Archive Content */}
      <div className="space-y-6">
        {/* Archived Main Targets */}
        {archivedMainTargets.length > 0 && (
          <Card className="glass-card bg-gradient-to-br from-success-light/20 to-transparent border-success/20 mb-6">
            <CardHeader className="bg-gradient-to-r from-success/10 to-transparent">
              <CardTitle className="text-lg flex items-center gap-3 text-success">
                <Target className="h-5 w-5" />
                Completed Main Targets
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  {archivedMainTargets.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {archivedMainTargets.map((target, index) => (
                <div
                  key={target.id}
                  className="keyword-item glass-card p-4 bg-gradient-to-r from-card/50 to-success-light/10 border-success/20 hover-glow"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedItems.includes(`main-${target.id}`)}
                        onCheckedChange={() => handleSelectItem(`main-${target.id}`)}
                        className="border-success data-[state=checked]:bg-success"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-lg line-through text-muted-foreground/80 mb-1">
                          {target.name}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-6">
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-success" />
                            {target.relevantKeywords.length} keywords
                          </span>
                          {target.completedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-success" />
                              {target.completedAt.toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className="bg-success/10 text-success border-success/30 text-xs font-medium"
                      >
                        {target.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onReactivateMainTarget(target.id)}
                        className="glass-button hover-lift flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reactivate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteMainTarget(target.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Archived Keywords */}
        {archivedKeywords.length > 0 && (
          <Card className="glass-card bg-gradient-to-br from-warning-light/20 to-transparent border-warning/20 mb-6">
            <CardHeader className="bg-gradient-to-r from-warning/10 to-transparent">
              <CardTitle className="text-lg flex items-center gap-3 text-warning">
                <Sparkles className="h-5 w-5" />
                Completed Keywords
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                  {archivedKeywords.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {archivedKeywords.map((item, index) => {
                const mainTarget = archivedMainTargets.find(t => t.name === item.mainTarget);
                return (
                  <div
                    key={index}
                    className="keyword-item glass-card p-4 bg-gradient-to-r from-card/50 to-warning-light/10 border-warning/20 hover-glow"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedItems.includes(`keyword-${index}`)}
                          onCheckedChange={() => handleSelectItem(`keyword-${index}`)}
                          className="border-warning data-[state=checked]:bg-warning"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-lg line-through text-muted-foreground/80 mb-1">
                            {item.keyword.text}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-6">
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3 text-warning" />
                              From: {item.mainTarget}
                            </span>
                            {item.keyword.completedAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-warning" />
                                {item.keyword.completedAt.toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className="bg-warning/10 text-warning border-warning/30 text-xs font-medium"
                        >
                          {item.keyword.text.length} chars
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => mainTarget && onReactivateKeyword(mainTarget.id, item.keyword.text)}
                          className="glass-button hover-lift flex items-center gap-1"
                          disabled={!mainTarget}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Reactivate
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => mainTarget && onDeleteKeyword(mainTarget.id, item.keyword.text)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={!mainTarget}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {archivedMainTargets.length === 0 && archivedKeywords.length === 0 && (
          <Card className="glass-card bg-gradient-to-br from-muted/20 to-transparent">
            <CardContent className="py-16 text-center">
              <div className="text-muted-foreground space-y-4">
                <div className="relative">
                  <Archive className="h-16 w-16 mx-auto mb-4 text-pinterest/30 float" />
                  <Sparkles className="h-6 w-6 absolute top-0 right-1/2 transform translate-x-8 text-pinterest/50 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">Your Archive Awaits</h3>
                  <p className="text-sm max-w-md mx-auto">
                    Complete some keywords and targets to see them celebrated here in your achievement gallery.
                  </p>
                </div>
                <div className="pt-4">
                  <Badge variant="outline" className="bg-pinterest/10 text-pinterest border-pinterest/30">
                    Start achieving to unlock this space
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};