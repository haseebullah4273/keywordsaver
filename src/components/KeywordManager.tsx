import { useState } from 'react';
import { Plus, Trash2, Download, Upload, FileText } from 'lucide-react';
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

  if (!selectedTarget) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Target Selected</h3>
          <p className="text-muted-foreground">
            Select a main target keyword from the sidebar to manage its relevant keywords.
          </p>
        </div>
      </div>
    );
  }

  const handleAddSingleKeyword = () => {
    if (!newKeyword.trim()) return;

    const result = onAddKeywords(selectedTarget.id, [newKeyword.trim()]);
    
    if (result.added.length > 0) {
      toast({
        title: "Keyword Added",
        description: `"${result.added[0]}" has been added.`,
      });
      setNewKeyword('');
    } else if (result.duplicates.length > 0) {
      toast({
        title: "Duplicate Keyword",
        description: "This keyword already exists.",
        variant: "destructive",
      });
    }
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
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Add Keywords Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-pinterest" />
              Add Keywords
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Single Keyword Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter a relevant keyword..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSingleKeyword()}
                className="flex-1"
              />
              <Button 
                onClick={handleAddSingleKeyword}
                variant="pinterest"
                disabled={!newKeyword.trim()}
              >
                Add
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
            <CardTitle className="text-lg">Relevant Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTarget.relevantKeywords.length > 0 ? (
              <div className="grid gap-2">
                {selectedTarget.relevantKeywords.map((keyword, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-accent/50 border group hover:bg-accent transition-colors"
                  >
                    <span className="font-medium">{keyword}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={() => onRemoveKeyword(selectedTarget.id, keyword)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No relevant keywords yet. Add some keywords to get started.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};