import { useState } from 'react';
import { Trash2, Edit3, Check, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface KeywordItemProps {
  keyword: string;
  index: number;
  id: string;
  isSelected: boolean;
  onEdit: (oldKeyword: string, newKeyword: string) => void;
  onDelete: (keyword: string) => void;
  onToggleSelect: (keyword: string, selected: boolean) => void;
  isDragMode?: boolean;
}

export const KeywordItem = ({
  keyword,
  index,
  id,
  isSelected,
  onEdit,
  onDelete,
  onToggleSelect,
  isDragMode = false,
}: KeywordItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedKeyword, setEditedKeyword] = useState(keyword);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleEdit = () => {
    if (editedKeyword.trim() && editedKeyword.trim() !== keyword) {
      onEdit(keyword, editedKeyword.trim());
    }
    setIsEditing(false);
    setEditedKeyword(keyword);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedKeyword(keyword);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "keyword-item flex items-center gap-3 p-4 rounded-xl transition-all duration-300 group relative overflow-hidden",
        isSelected && "selection-glow",
        isDragging && "dragging",
        isSelected 
          ? "bg-gradient-to-r from-pinterest/10 to-pinterest-red-dark/10 border-pinterest/50 shadow-premium"
          : "bg-gradient-to-r from-card to-accent/30 border border-border/50 hover:border-pinterest/30 hover:bg-gradient-to-r hover:from-pinterest/5 hover:to-pinterest-red-dark/5 hover-lift"
      )}
      style={{ 
        ...style,
        animationDelay: `${index * 50}ms` 
      }}
    >
      {/* Drag Handle */}
      {isDragMode && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-pinterest transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Selection Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onToggleSelect(keyword, !!checked)}
        className="data-[state=checked]:bg-pinterest data-[state=checked]:border-pinterest"
      />

      {/* Keyword Indicator */}
      <div className={cn(
        "w-2 h-2 rounded-full transition-colors",
        isSelected ? "bg-pinterest" : "bg-pinterest/60"
      )}></div>

      {/* Keyword Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editedKeyword}
              onChange={(e) => setEditedKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEdit();
                if (e.key === 'Escape') handleCancel();
              }}
              className="flex-1 text-sm border-pinterest focus:border-pinterest"
              autoFocus
            />
            <Button
              onClick={handleEdit}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-success hover:bg-success/10"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleCancel}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className={cn(
              "font-medium transition-colors",
              isSelected ? "text-pinterest" : "text-foreground"
            )}>
              {keyword}
            </span>
            <Badge 
              variant={keyword.length > 25 ? "destructive" : keyword.length > 15 ? "secondary" : "default"} 
              className="text-xs"
            >
              {keyword.length}c
            </Badge>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-pinterest hover:bg-pinterest/10"
          onClick={() => setIsEditing(!isEditing)}
        >
          <Edit3 className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(keyword)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Premium gradient overlay for selected items */}
      {isSelected && (
        <div className="absolute inset-0 bg-gradient-to-r from-pinterest/5 to-transparent opacity-50 pointer-events-none"></div>
      )}
    </div>
  );
};