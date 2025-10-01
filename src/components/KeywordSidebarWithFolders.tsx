import { useState } from 'react';
import { Plus, Search, Download, Upload, Archive, GripVertical, ChevronDown, ChevronRight, Sparkles, FolderOpen, X, MoreVertical } from 'lucide-react';
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MainTarget, Folder } from '@/types/keyword';
import { cn, capitalizeWords } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { FolderManager } from './FolderManager';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface KeywordSidebarWithFoldersProps {
  mainTargets: MainTarget[];
  folders: Folder[];
  selectedTarget: MainTarget | null;
  onSelectTarget: (target: MainTarget) => void;
  onAddTarget: (name: string, folderId?: string) => void;
  onDeleteTarget: (id: string) => void;
  onReorderTargets: (oldIndex: number, newIndex: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: Array<{ mainTarget: string; keyword: string; type: 'main' | 'relevant' }>;
  onExport: () => void;
  onImport: (data: any) => void;
  onShowArchive: () => void;
  archivedCount: number;
  onAddFolder: (name: string, icon?: string, color?: string) => void;
  onUpdateFolder: (id: string, updates: Partial<Folder>) => void;
  onDeleteFolder: (id: string) => void;
  onMoveToFolder: (targetId: string, folderId: string | undefined) => void;
}

interface SortableItemProps {
  target: MainTarget;
  selectedTarget: MainTarget | null;
  onSelectTarget: (target: MainTarget) => void;
  onDeleteTarget: (id: string) => void;
  folders: Folder[];
  onMoveToFolder: (targetId: string, folderId: string | undefined) => void;
}

const SortableItem = ({ target, selectedTarget, onSelectTarget, onDeleteTarget, folders, onMoveToFolder }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: target.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "card-hover p-3 rounded-lg cursor-pointer transition-all duration-200 group relative overflow-hidden",
        isDragging && "opacity-90 shadow-2xl scale-105",
        target.isDone 
          ? selectedTarget?.id === target.id
            ? "bg-gradient-to-r from-green-50 to-green-100 border-green-200 shadow-sm dark:from-green-900/20 dark:to-green-800/20 dark:border-green-700/50"
            : "bg-muted/50 border border-border/30 hover:border-green-300/50 opacity-75"
          : selectedTarget?.id === target.id
            ? "bg-gradient-to-r from-pinterest/10 to-pinterest-red-dark/10 border-pinterest/50 shadow-md"
            : "bg-card/50 border border-border/50 hover:border-pinterest/30"
      )}
      onClick={() => onSelectTarget(target)}
    >
      {selectedTarget?.id === target.id && !target.isDone && (
        <div className="absolute inset-0 bg-gradient-to-r from-pinterest/5 to-transparent opacity-50"></div>
      )}
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div 
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-accent/50 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          
          <div className={cn(
            "w-2.5 h-2.5 rounded-full transition-colors flex-shrink-0",
            target.isDone
              ? "bg-green-500"
              : selectedTarget?.id === target.id 
                ? "bg-pinterest" 
                : "bg-muted-foreground/40"
          )}></div>
          
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              "font-semibold text-xs truncate",
              target.isDone
                ? "text-green-700 dark:text-green-400 line-through"
                : selectedTarget?.id === target.id 
                  ? "text-pinterest" 
                  : "text-foreground"
            )}>
              {capitalizeWords(target.name)}
            </h4>
            
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge 
                variant={target.isDone ? "secondary" : "secondary"} 
                className="text-[10px] px-1.5 py-0 h-4"
              >
                {target.relevantKeywords.length}
              </Badge>
              {target.isDone && (
                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-500 text-white">
                  ✓
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 bg-popover z-50" align="end">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Move to folder</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveToFolder(target.id, undefined);
                  }}
                >
                  <FolderOpen className="h-3 w-3 mr-2" />
                  Uncategorized
                </Button>
                {folders.map((folder) => (
                  <Button
                    key={folder.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveToFolder(target.id, folder.id);
                    }}
                  >
                    <span className="mr-2">{folder.icon || '📁'}</span>
                    {folder.name}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteTarget(target.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const KeywordSidebarWithFolders = ({
  mainTargets,
  folders,
  selectedTarget,
  onSelectTarget,
  onAddTarget,
  onDeleteTarget,
  onReorderTargets,
  searchQuery,
  onSearchChange,
  searchResults,
  onExport,
  onImport,
  onShowArchive,
  archivedCount,
  onAddFolder,
  onUpdateFolder,
  onDeleteFolder,
  onMoveToFolder,
}: KeywordSidebarWithFoldersProps) => {
  const [newTargetName, setNewTargetName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(['uncategorized', ...folders.map(f => f.id)]));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && over) {
      const oldIndex = mainTargets.findIndex((target) => target.id === active.id);
      const newIndex = mainTargets.findIndex((target) => target.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderTargets(oldIndex, newIndex);
      }
    }
  };

  const handleAddTarget = () => {
    if (newTargetName.trim()) {
      onAddTarget(newTargetName.trim(), selectedFolderId);
      setNewTargetName('');
      setSelectedFolderId(undefined);
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

  const toggleFolder = (folderId: string) => {
    setOpenFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const uncategorizedTargets = mainTargets.filter(t => !t.folderId);
  const getFolderTargets = (folderId: string) => mainTargets.filter(t => t.folderId === folderId);

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
            <p className="text-xs text-muted-foreground">Organized & Optimized</p>
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
        <div className="flex gap-2 mb-4">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="pinterest" size="sm" className="flex-1">
                <Plus className="h-4 w-4" />
                Add Keyword
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Folder (Optional)</label>
                  <div className="grid gap-2">
                    <Button
                      variant={selectedFolderId === undefined ? "default" : "outline"}
                      size="sm"
                      className="justify-start"
                      onClick={() => setSelectedFolderId(undefined)}
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Uncategorized
                    </Button>
                    {folders.map((folder) => (
                      <Button
                        key={folder.id}
                        variant={selectedFolderId === folder.id ? "default" : "outline"}
                        size="sm"
                        className="justify-start"
                        onClick={() => setSelectedFolderId(folder.id)}
                      >
                        <span className="mr-2">{folder.icon || '📁'}</span>
                        {folder.name}
                      </Button>
                    ))}
                  </div>
                </div>
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

        {/* Archive Button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onShowArchive}
          className="w-full flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archive
          </div>
          {archivedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {archivedCount}
            </Badge>
          )}
        </Button>

        {/* Folder Manager */}
        <Collapsible defaultOpen>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between mb-2">
              <span className="text-sm font-medium">Folders</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <FolderManager
              folders={folders}
              onAddFolder={onAddFolder}
              onUpdateFolder={onUpdateFolder}
              onDeleteFolder={onDeleteFolder}
            />
          </CollapsibleContent>
        </Collapsible>
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
          /* Folders and Keywords */
          <div className="p-4 space-y-4">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              {/* Uncategorized */}
              <Collapsible open={openFolders.has('uncategorized')} onOpenChange={() => toggleFolder('uncategorized')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent/50 rounded-lg group transition-colors">
                  <div className="flex items-center gap-2">
                    {openFolders.has('uncategorized') ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Uncategorized</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {uncategorizedTargets.length}
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  <SortableContext items={uncategorizedTargets.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {uncategorizedTargets.map((target) => (
                      <SortableItem
                        key={target.id}
                        target={target}
                        selectedTarget={selectedTarget}
                        onSelectTarget={onSelectTarget}
                        onDeleteTarget={onDeleteTarget}
                        folders={folders}
                        onMoveToFolder={onMoveToFolder}
                      />
                    ))}
                  </SortableContext>
                </CollapsibleContent>
              </Collapsible>

              {/* Custom Folders */}
              {folders.map((folder) => {
                const folderTargets = getFolderTargets(folder.id);
                return (
                  <Collapsible key={folder.id} open={openFolders.has(folder.id)} onOpenChange={() => toggleFolder(folder.id)}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent/50 rounded-lg group transition-colors">
                      <div className="flex items-center gap-2">
                        {openFolders.has(folder.id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-lg">{folder.icon || '📁'}</span>
                        <span 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: folder.color }}
                        />
                        <span className="text-sm font-medium">{folder.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {folderTargets.length}
                      </Badge>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      <SortableContext items={folderTargets.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        {folderTargets.map((target) => (
                          <SortableItem
                            key={target.id}
                            target={target}
                            selectedTarget={selectedTarget}
                            onSelectTarget={onSelectTarget}
                            onDeleteTarget={onDeleteTarget}
                            folders={folders}
                            onMoveToFolder={onMoveToFolder}
                          />
                        ))}
                      </SortableContext>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </DndContext>

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
                  Create your first keyword and organize them with custom folders.
                </p>
                <Button 
                  variant="pinterest" 
                  size="sm"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Keyword
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
