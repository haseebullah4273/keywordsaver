import { useState, useMemo } from 'react';
import { Plus, Trash2, Download, Upload, FileText, Copy, BarChart3, TrendingUp, Target, Sparkles, GripVertical, CheckSquare, Square, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MainTarget, BulkInputResult } from '@/types/keyword';
import { useToast } from '@/hooks/use-toast';
import { KeywordItem } from './KeywordItem';
import { BulkOperations } from './BulkOperations';
import { KeywordTemplates } from './KeywordTemplates';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface KeywordManagerProps {
  selectedTarget: MainTarget | null;
  onAddKeywords: (mainTargetId: string, keywords: string[]) => BulkInputResult;
  onRemoveKeyword: (mainTargetId: string, keyword: string) => void;
  onUpdateTarget: (id: string, updates: Partial<MainTarget>) => void;
}

export const KeywordManager = ({
  selectedTarget,
  onAddKeywords,
  onRemoveKeyword,
  onUpdateTarget,
}: KeywordManagerProps) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [bulkKeywords, setBulkKeywords] = useState('');
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [isDragMode, setIsDragMode] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calculate keyword statistics
  const keywordStats = useMemo(() => {
    if (!selectedTarget) return null;
    
    const totalKeywords = selectedTarget.relevantKeywords.length;
    const avgLength = totalKeywords > 0 
      ? Math.round(selectedTarget.relevantKeywords.reduce((sum, kw) => sum + kw.length, 0) / totalKeywords)
      : 0;
    
    const longestKeyword = selectedTarget.relevantKeywords.reduce(
      (longest, current) => current.length > longest.length ? current : longest,
      ''
    );
    
    const shortestKeyword = selectedTarget.relevantKeywords.reduce(
      (shortest, current) => current.length < shortest.length ? current : shortest,
      selectedTarget.relevantKeywords[0] || ''
    );

    return {
      totalKeywords,
      avgLength,
      longestKeyword,
      shortestKeyword,
      daysActive: Math.floor((Date.now() - selectedTarget.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    };
  }, [selectedTarget]);

  if (!selectedTarget) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-background to-accent/20">
        <div className="text-center max-w-md">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-pinterest/20 to-pinterest-red-dark/20 rounded-full blur-xl"></div>
            <div className="relative bg-card p-6 rounded-full shadow-soft">
              <Target className="h-16 w-16 text-pinterest mx-auto float" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2 text-gradient">Ready to Target Keywords?</h3>
          <p className="text-muted-foreground mb-4">
            Select a main target keyword from the sidebar to start managing its relevant keywords and boost your Pinterest strategy.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-pinterest" />
            <span>Pinterest SEO made simple</span>
          </div>
        </div>
      </div>
    );
  }

  const handleAddSingleKeyword = () => {
    if (!newKeyword.trim()) return;

    // Parse keywords from textarea (support both line breaks and commas)
    const keywords = newKeyword
      .split(/[,\n]/)
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const result = onAddKeywords(selectedTarget.id, keywords);
    
    let message = '';
    if (result.added.length > 0) {
      message += `${result.added.length} keyword${result.added.length > 1 ? 's' : ''} added. `;
    }
    if (result.duplicates.length > 0) {
      message += `${result.duplicates.length} duplicate${result.duplicates.length > 1 ? 's' : ''} skipped. `;
    }

    toast({
      title: "Keywords Added",
      description: message.trim(),
    });

    setNewKeyword('');
  };

  const handleBulkAdd = () => {
    if (!bulkKeywords.trim()) return;

    const keywords = bulkKeywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const result = onAddKeywords(selectedTarget.id, keywords);
    
    let message = '';
    if (result.added.length > 0) {
      message += `${result.added.length} keywords added. `;
    }
    if (result.duplicates.length > 0) {
      message += `${result.duplicates.length} duplicates skipped. `;
    }
    if (result.skipped.length > 0) {
      message += `${result.skipped.length} empty lines skipped.`;
    }

    toast({
      title: "Bulk Import Complete",
      description: message.trim(),
    });

    setBulkKeywords('');
    setIsBulkDialogOpen(false);
  };

  const handleUpdateName = () => {
    if (editedName.trim() && editedName.trim() !== selectedTarget.name) {
      onUpdateTarget(selectedTarget.id, { name: editedName.trim() });
      toast({
        title: "Target Updated",
        description: "Main target name has been updated.",
      });
    }
    setIsEditingName(false);
  };

  const exportKeywords = () => {
    const content = `Main Target: ${selectedTarget.name}\n\nRelevant Keywords:\n${selectedTarget.relevantKeywords.join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTarget.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_keywords.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const csvContent = `Main Target,Relevant Keywords\n"${selectedTarget.name}","${selectedTarget.relevantKeywords.join(', ')}"`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTarget.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_keywords.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyAllKeywords = async () => {
    try {
      await navigator.clipboard.writeText(selectedTarget.relevantKeywords.join('\n'));
      toast({
        title: "Keywords Copied",
        description: "All relevant keywords have been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy keywords to clipboard.",
        variant: "destructive",
      });
    }
  };

  // Drag and drop functions
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = selectedTarget.relevantKeywords.indexOf(active.id as string);
      const newIndex = selectedTarget.relevantKeywords.indexOf(over.id as string);
      
      const newKeywords = arrayMove(selectedTarget.relevantKeywords, oldIndex, newIndex);
      onUpdateTarget(selectedTarget.id, { relevantKeywords: newKeywords });
      
      toast({
        title: "Keywords Reordered",
        description: "Keyword order has been updated.",
      });
    }
  };

  // Bulk operations
  const handleToggleSelect = (keyword: string, selected: boolean) => {
    setSelectedKeywords(prev => 
      selected 
        ? [...prev, keyword]
        : prev.filter(k => k !== keyword)
    );
  };

  const handleSelectAll = () => {
    setSelectedKeywords([...selectedTarget.relevantKeywords]);
  };

  const handleDeselectAll = () => {
    setSelectedKeywords([]);
  };

  const handleDeleteSelected = () => {
    selectedKeywords.forEach(keyword => {
      onRemoveKeyword(selectedTarget.id, keyword);
    });
    setSelectedKeywords([]);
  };

  const handleCopySelected = async () => {
    try {
      await navigator.clipboard.writeText(selectedKeywords.join('\n'));
      toast({
        title: "Selected Keywords Copied",
        description: `${selectedKeywords.length} keywords copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy keywords to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleExportSelected = () => {
    const content = `Selected Keywords from: ${selectedTarget.name}\n\n${selectedKeywords.join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTarget.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_selected_keywords.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEditKeyword = (oldKeyword: string, newKeyword: string) => {
    const keywords = [...selectedTarget.relevantKeywords];
    const index = keywords.indexOf(oldKeyword);
    if (index !== -1) {
      keywords[index] = newKeyword;
      onUpdateTarget(selectedTarget.id, { relevantKeywords: keywords });
      toast({
        title: "Keyword Updated",
        description: "Keyword has been updated successfully.",
      });
    }
  };

  const handleAddFromTemplate = (templateKeywords: string[]) => {
    const result = onAddKeywords(selectedTarget.id, templateKeywords);
    
    let message = '';
    if (result.added.length > 0) {
      message += `${result.added.length} keywords added from template. `;
    }
    if (result.duplicates.length > 0) {
      message += `${result.duplicates.length} duplicates skipped. `;
    }

    toast({
      title: "Template Applied",
      description: message.trim(),
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          {isEditingName ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                className="text-xl font-bold border-pinterest focus:border-pinterest"
                autoFocus
              />
              <Button onClick={handleUpdateName} variant="pinterest" size="sm">
                Save
              </Button>
              <Button 
                onClick={() => setIsEditingName(false)} 
                variant="outline" 
                size="sm"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <h2 
              className="text-2xl font-bold cursor-pointer hover:text-pinterest transition-colors"
              onClick={() => {
                setEditedName(selectedTarget.name);
                setIsEditingName(true);
              }}
            >
              {selectedTarget.name}
            </h2>
          )}
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportKeywords}>
              <Download className="h-4 w-4" />
              TXT
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">
            {selectedTarget.relevantKeywords.length} relevant keywords
          </Badge>
          <span>•</span>
          <span>Created {selectedTarget.createdAt.toLocaleDateString()}</span>
          <span>•</span>
          <span>Updated {selectedTarget.updatedAt.toLocaleDateString()}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Statistics Section */}
        {keywordStats && keywordStats.totalKeywords > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="card-hover bg-gradient-to-br from-pinterest/5 to-pinterest-red-dark/5 border-pinterest/20">
              <CardContent className="p-4 text-center">
                <BarChart3 className="h-8 w-8 text-pinterest mx-auto mb-2" />
                <div className="text-2xl font-bold text-pinterest">{keywordStats.totalKeywords}</div>
                <div className="text-sm text-muted-foreground">Total Keywords</div>
              </CardContent>
            </Card>
            
            <Card className="card-hover bg-gradient-to-br from-success/5 to-success/10 border-success/20">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 text-success mx-auto mb-2" />
                <div className="text-2xl font-bold text-success">{keywordStats.avgLength}</div>
                <div className="text-sm text-muted-foreground">Avg. Length</div>
              </CardContent>
            </Card>
            
            <Card className="card-hover bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
              <CardContent className="p-4 text-center">
                <Target className="h-8 w-8 text-warning mx-auto mb-2" />
                <div className="text-2xl font-bold text-warning">{keywordStats.daysActive}</div>
                <div className="text-sm text-muted-foreground">Days Active</div>
              </CardContent>
            </Card>
            
            <Card className="card-hover bg-gradient-to-br from-accent to-accent/50">
              <CardContent className="p-4 text-center">
                <Sparkles className="h-8 w-8 text-pinterest mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{Math.ceil(keywordStats.totalKeywords / 10)}</div>
                <div className="text-sm text-muted-foreground">Content Ideas</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Keywords Section */}
        <Card className="mb-6 gradient-aurora relative overflow-hidden">
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm"></div>
          <CardHeader className="relative">
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-pinterest" />
              Add Keywords
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            {/* Single/Multiple Keywords Input */}
            <div className="space-y-2">
              <Textarea
                placeholder="Enter relevant keywords (one per line or separated by commas)..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="min-h-[100px] resize-none glass-card"
              />
              <Button 
                onClick={handleAddSingleKeyword}
                variant="pinterest"
                disabled={!newKeyword.trim()}
                className="w-full shadow-premium"
              >
                Add Keywords
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="glass-button">
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Import
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Bulk Add Keywords</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Paste your keywords here, one per line:&#10;vegan dinner ideas&#10;plant-based meals&#10;vegan desserts&#10;healthy vegan recipes"
                      value={bulkKeywords}
                      onChange={(e) => setBulkKeywords(e.target.value)}
                      className="min-h-[200px] resize-none"
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleBulkAdd}
                        variant="pinterest"
                        className="flex-1"
                        disabled={!bulkKeywords.trim()}
                      >
                        Add Keywords
                      </Button>
                      <Button 
                        onClick={() => setIsBulkDialogOpen(false)}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <KeywordTemplates onAddKeywords={handleAddFromTemplate} />
            </div>
          </CardContent>
        </Card>

        {/* Keywords List */}
        <Card className="scroll-indicator">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                Relevant Keywords
                {selectedKeywords.length > 0 && (
                  <Badge variant="default" className="bg-pinterest text-white">
                    {selectedKeywords.length} selected
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {selectedTarget.relevantKeywords.length > 1 && (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isDragMode}
                      onCheckedChange={setIsDragMode}
                      id="drag-mode"
                    />
                    <Label htmlFor="drag-mode" className="text-sm">
                      Reorder
                    </Label>
                  </div>
                )}
                {selectedTarget.relevantKeywords.length > 0 && (
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={selectedKeywords.length === selectedTarget.relevantKeywords.length ? handleDeselectAll : handleSelectAll}
                      className="gap-1"
                    >
                      {selectedKeywords.length === selectedTarget.relevantKeywords.length ? (
                        <Square className="h-3 w-3" />
                      ) : (
                        <CheckSquare className="h-3 w-3" />
                      )}
                      {selectedKeywords.length === selectedTarget.relevantKeywords.length ? 'Deselect' : 'Select'} All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={copyAllKeywords}
                      className="gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Copy All
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedTarget.relevantKeywords.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={selectedTarget.relevantKeywords}
                  strategy={verticalListSortingStrategy}
                  disabled={!isDragMode}
                >
                  <div className="space-y-2">
                    {selectedTarget.relevantKeywords.map((keyword, index) => (
                      <KeywordItem
                        key={keyword}
                        id={keyword}
                        keyword={keyword}
                        index={index}
                        isSelected={selectedKeywords.includes(keyword)}
                        onEdit={handleEditKeyword}
                        onDelete={(kw) => onRemoveKeyword(selectedTarget.id, kw)}
                        onToggleSelect={handleToggleSelect}
                        isDragMode={isDragMode}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="text-center py-12">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-muted/20 to-accent/20 rounded-full blur-lg"></div>
                  <div className="relative bg-muted/30 p-4 rounded-full w-fit mx-auto">
                    <Sparkles className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <h4 className="font-medium mb-2">No Keywords Yet</h4>
                <p className="text-muted-foreground text-sm mb-4">
                  Add some relevant keywords to get started with your Pinterest SEO strategy.
                </p>
                <KeywordTemplates onAddKeywords={handleAddFromTemplate} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Operations Floating Panel */}
        <BulkOperations
          selectedKeywords={selectedKeywords}
          totalKeywords={selectedTarget.relevantKeywords.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onDeleteSelected={handleDeleteSelected}
          onCopySelected={handleCopySelected}
          onExportSelected={handleExportSelected}
        />
      </div>
    </div>
  );
};