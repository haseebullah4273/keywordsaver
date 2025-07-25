import { useState, useMemo } from 'react';
import { Plus, Trash2, Download, Upload, FileText, Copy, BarChart3, TrendingUp, Target, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MainTarget, BulkInputResult } from '@/types/keyword';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-pinterest" />
              Add Keywords
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Single/Multiple Keywords Input */}
            <div className="space-y-2">
              <Textarea
                placeholder="Enter relevant keywords (one per line or separated by commas)..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <Button 
                onClick={handleAddSingleKeyword}
                variant="pinterest"
                disabled={!newKeyword.trim()}
                className="w-full"
              >
                Add Keywords
              </Button>
            </div>

            {/* Bulk Import */}
            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Add Keywords (One per line)
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
          </CardContent>
        </Card>

        {/* Keywords List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Relevant Keywords</CardTitle>
              {selectedTarget.relevantKeywords.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyAllKeywords}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedTarget.relevantKeywords.length > 0 ? (
              <div className="space-y-2">
                {selectedTarget.relevantKeywords.map((keyword, index) => (
                  <div
                    key={index}
                    className="keyword-item flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-card to-accent/30 border border-border/50 group hover:border-pinterest/30 hover:bg-gradient-to-r hover:from-pinterest/5 hover:to-pinterest-red-dark/5 fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-pinterest/60"></div>
                      <span className="font-medium text-foreground">{keyword}</span>
                      <Badge variant="outline" className="text-xs">
                        {keyword.length} chars
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onRemoveKeyword(selectedTarget.id, keyword)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-muted/20 to-accent/20 rounded-full blur-lg"></div>
                  <div className="relative bg-muted/30 p-4 rounded-full w-fit mx-auto">
                    <Sparkles className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <h4 className="font-medium mb-2">No Keywords Yet</h4>
                <p className="text-muted-foreground text-sm">
                  Add some relevant keywords to get started with your Pinterest SEO strategy.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};