import { useState } from 'react';
import { Folder as FolderIcon, Plus, Edit2, Trash2, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Folder } from '@/types/keyword';

interface FolderManagerProps {
  folders: Folder[];
  onAddFolder: (name: string, icon?: string, color?: string) => void;
  onUpdateFolder: (id: string, updates: Partial<Folder>) => void;
  onDeleteFolder: (id: string) => void;
}

const FOLDER_COLORS = [
  { name: 'Red', value: 'hsl(0, 84%, 60%)' },
  { name: 'Orange', value: 'hsl(25, 95%, 53%)' },
  { name: 'Yellow', value: 'hsl(48, 96%, 53%)' },
  { name: 'Green', value: 'hsl(142, 71%, 45%)' },
  { name: 'Blue', value: 'hsl(221, 83%, 53%)' },
  { name: 'Purple', value: 'hsl(271, 76%, 53%)' },
  { name: 'Pink', value: 'hsl(330, 81%, 60%)' },
  { name: 'Gray', value: 'hsl(215, 16%, 47%)' },
];

const FOLDER_ICONS = ['📁', '🍕', '🍰', '🥗', '🍜', '🍔', '🌮', '🍱', '🥘', '🍝', '🥙', '🌯'];

export const FolderManager = ({ folders, onAddFolder, onUpdateFolder, onDeleteFolder }: FolderManagerProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0].value);
  const [selectedIcon, setSelectedIcon] = useState(FOLDER_ICONS[0]);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      onAddFolder(newFolderName.trim(), selectedIcon, selectedColor);
      setNewFolderName('');
      setSelectedColor(FOLDER_COLORS[0].value);
      setSelectedIcon(FOLDER_ICONS[0]);
      setIsAddDialogOpen(false);
    }
  };

  const handleUpdateFolder = () => {
    if (editingFolder && newFolderName.trim()) {
      onUpdateFolder(editingFolder.id, {
        name: newFolderName.trim(),
        icon: selectedIcon,
        color: selectedColor,
      });
      setEditingFolder(null);
      setNewFolderName('');
      setSelectedColor(FOLDER_COLORS[0].value);
      setSelectedIcon(FOLDER_ICONS[0]);
    }
  };

  const startEditing = (folder: Folder) => {
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setSelectedColor(folder.color || FOLDER_COLORS[0].value);
    setSelectedIcon(folder.icon || FOLDER_ICONS[0]);
  };

  return (
    <div className="space-y-2">
      {/* Add Folder Dialog */}
      <Dialog open={isAddDialogOpen || !!editingFolder} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setEditingFolder(null);
          setNewFolderName('');
        }
      }}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start gap-2"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Folder
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFolder ? 'Edit Folder' : 'Create New Folder'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Folder Name</label>
              <Input
                placeholder="e.g., Dinner Recipes"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (editingFolder ? handleUpdateFolder() : handleAddFolder())}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Icon</label>
              <div className="grid grid-cols-6 gap-2">
                {FOLDER_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setSelectedIcon(icon)}
                    className={cn(
                      "p-3 rounded-lg border-2 text-2xl transition-all hover:scale-110",
                      selectedIcon === icon 
                        ? "border-pinterest bg-pinterest/10" 
                        : "border-border hover:border-pinterest/50"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="grid grid-cols-4 gap-2">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all hover:scale-105",
                      selectedColor === color.value 
                        ? "border-foreground ring-2 ring-offset-2 ring-foreground/20" 
                        : "border-border"
                    )}
                    style={{ backgroundColor: color.value }}
                  >
                    <span className="sr-only">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={editingFolder ? handleUpdateFolder : handleAddFolder} 
                variant="pinterest" 
                className="flex-1"
              >
                {editingFolder ? 'Save Changes' : 'Create Folder'}
              </Button>
              <Button 
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setEditingFolder(null);
                  setNewFolderName('');
                }} 
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Folders List */}
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="group flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xl">{folder.icon || '📁'}</span>
            <span 
              className="w-2 h-2 rounded-full flex-shrink-0" 
              style={{ backgroundColor: folder.color }}
            />
            <span className="text-sm font-medium truncate">{folder.name}</span>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => startEditing(folder)}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDeleteFolder(folder.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
