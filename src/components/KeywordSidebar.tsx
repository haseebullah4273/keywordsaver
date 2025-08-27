import { useState } from 'react';
import { Plus, Search, Tag, Download, Upload, X, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MainTarget } from '@/types/keyword';
import { cn, capitalizeWords } from '@/lib/utils';
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
    <div className="w-80 bg-gradient-to-b from-card to-accent/20 border-r border-border/50 flex flex-col h-full shadow-card">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="absolute inset-0 bg-pinterest/20 rounded-lg blur"></div>
            <div className="relative bg-pinterest/10 p-2 rounded-lg">
              <Sparkles className="h-5 w-5 text-pinterest" />
            </div>
          </div>
          <div>
            <h1 className="font-bold text-lg text-gradient">Pinterest Keywords</h1>
            <p className="text-xs text-muted-foreground">SEO optimization made simple</p>
          </div>
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
            <div className="space-y-3">
              {mainTargets.map((target, index) => (
                <div
                  key={target.id}
                  className={cn(
                    "card-hover p-4 rounded-xl cursor-pointer transition-all duration-300 group relative overflow-hidden fade-in",
                    target.isDone 
                      ? selectedTarget?.id === target.id
                        ? "bg-gradient-to-r from-green-50 to-green-100 border-green-200 shadow-sm dark:from-green-900/20 dark:to-green-800/20 dark:border-green-700/50"
                        : "bg-gradient-to-r from-muted/50 to-muted/30 border border-border/30 hover:border-green-300/50 opacity-75"
                      : selectedTarget?.id === target.id
                        ? "bg-gradient-to-r from-pinterest/10 to-pinterest-red-dark/10 border-pinterest/50 shadow-elegant"
                        : "bg-gradient-to-r from-card to-accent/30 border border-border/50 hover:border-pinterest/30"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => onSelectTarget(target)}
                >
                  {selectedTarget?.id === target.id && !target.isDone && (
                    <div className="absolute inset-0 bg-gradient-to-r from-pinterest/5 to-transparent opacity-50"></div>
                  )}
                  {selectedTarget?.id === target.id && target.isDone && (
                    <div className="absolute inset-0 bg-gradient-to-r from-green-100/50 to-transparent opacity-50 dark:from-green-800/30"></div>
                  )}
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "w-3 h-3 rounded-full transition-colors",
                        target.isDone
                          ? "bg-green-500"
                          : selectedTarget?.id === target.id 
                            ? "bg-pinterest" 
                            : "bg-muted-foreground/40"
                      )}></div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className={cn(
                          "font-semibold text-sm truncate transition-colors",
                          target.isDone
                            ? "text-green-700 dark:text-green-400 line-through"
                            : selectedTarget?.id === target.id 
                              ? "text-pinterest" 
                              : "text-foreground"
                        )}>
                          {capitalizeWords(target.name)}
                        </h4>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={target.isDone ? "secondary" : target.relevantKeywords.length > 10 ? "default" : "secondary"} 
                            className={cn(
                              "text-xs",
                              target.isDone && "bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-400"
                            )}
                          >
                            {target.relevantKeywords.length} keywords
                          </Badge>
                          {target.isDone && (
                            <Badge className="text-xs bg-green-500 text-white">
                              ✓ Done
                            </Badge>
                          )}
                          {!target.isDone && target.relevantKeywords.length > 20 && (
                            <TrendingUp className="h-3 w-3 text-success" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-all duration-200 h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
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
                <div className="text-center py-12">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-pinterest/10 to-pinterest-red-dark/10 rounded-full blur-lg"></div>
                    <div className="relative bg-gradient-to-r from-pinterest/10 to-pinterest-red-dark/10 p-6 rounded-full w-fit mx-auto">
                      <Sparkles className="h-8 w-8 text-pinterest" />
                    </div>
                  </div>
                  <h4 className="font-semibold mb-2">Start Your Pinterest Journey</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first main target keyword to begin organizing your Pinterest SEO strategy.
                  </p>
                  <Button 
                    variant="pinterest" 
                    size="sm"
                    onClick={() => setIsAddDialogOpen(true)}
                    className="btn-elegant"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Target
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};