import { useState } from 'react';
import { Plus, Search, Tag, Download, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MainTarget } from '@/types/keyword';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface KeywordSidebarProps {
  mainTargets: MainTarget[];
  selectedTarget: MainTarget | null;
  onSelectTarget: (target: MainTarget) => void;
  onAddTarget: (name: string) => void;
  onDeleteTarget: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: Array<{ mainTarget: string; keyword: string; type: 'main' | 'relevant' }>;
  onExport: () => void;
  onImport: (data: any) => void;
}

export const KeywordSidebar = ({
  mainTargets,
  selectedTarget,
  onSelectTarget,
  onAddTarget,
  onDeleteTarget,
  searchQuery,
  onSearchChange,
  searchResults,
  onExport,
  onImport,
}: KeywordSidebarProps) => {
  const [newTargetName, setNewTargetName] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAddTarget = () => {
    if (newTargetName.trim()) {
      onAddTarget(newTargetName.trim());
      setNewTargetName('');
      setIsAddDialogOpen(false);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        onImport(data);
      } catch (error) {
        console.error('Error importing file:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="h-5 w-5 text-pinterest" />
          <h1 className="font-semibold text-lg">Pinterest Keywords</h1>
        </div>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search keywords..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="pinterest" size="sm" className="flex-1">
                <Plus className="h-4 w-4" />
                Add Target
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Main Target Keyword</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Enter main target keyword..."
                  value={newTargetName}
                  onChange={(e) => setNewTargetName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTarget()}
                />
                <div className="flex gap-2">
                  <Button onClick={handleAddTarget} variant="pinterest" className="flex-1">
                    Add Target
                  </Button>
                  <Button onClick={() => setIsAddDialogOpen(false)} variant="outline">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4" />
          </Button>
          
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4" />
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {searchQuery ? (
          /* Search Results */
          <div className="p-4">
            <h3 className="font-medium mb-3 text-sm text-muted-foreground">
              Search Results ({searchResults.length})
            </h3>
            <div className="space-y-2">
              {searchResults.map((result, index) => (
                <div key={index} className="p-3 rounded-lg bg-accent/50 border">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={result.type === 'main' ? 'default' : 'secondary'} className="text-xs">
                      {result.type === 'main' ? 'Main' : 'Relevant'}
                    </Badge>
                    <span className="text-sm font-medium">{result.mainTarget}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{result.keyword}</p>
                </div>
              ))}
              {searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No keywords found
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Main Targets List */
          <div className="p-4">
            <h3 className="font-medium mb-3 text-sm text-muted-foreground">
              Main Targets ({mainTargets.length})
            </h3>
            <div className="space-y-2">
              {mainTargets.map((target) => (
                <div
                  key={target.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors group",
                    selectedTarget?.id === target.id
                      ? "bg-pinterest/10 border-pinterest"
                      : "bg-card hover:bg-accent/50"
                  )}
                  onClick={() => onSelectTarget(target)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{target.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {target.relevantKeywords.length} keywords
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTarget(target.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {mainTargets.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No main targets yet. Click "Add Target" to get started.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};