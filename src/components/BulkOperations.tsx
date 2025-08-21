import { useState } from 'react';
import { Trash2, Download, Copy, Edit3, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface BulkOperationsProps {
  selectedKeywords: string[];
  totalKeywords: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteSelected: () => void;
  onCopySelected: () => void;
  onExportSelected: () => void;
}

export const BulkOperations = ({
  selectedKeywords,
  totalKeywords,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
  onCopySelected,
  onExportSelected,
}: BulkOperationsProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const hasSelection = selectedKeywords.length > 0;
  const isAllSelected = selectedKeywords.length === totalKeywords;

  const handleDeleteConfirm = () => {
    onDeleteSelected();
    setIsDeleteDialogOpen(false);
    toast({
      title: "Keywords Deleted",
      description: `${selectedKeywords.length} keyword${selectedKeywords.length > 1 ? 's' : ''} deleted successfully.`,
    });
  };

  if (!hasSelection) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="glass-card px-6 py-4 rounded-2xl shadow-floating">
        <div className="flex items-center gap-4">
          {/* Selection Info */}
          <div className="flex items-center gap-3">
            <Badge variant="default" className="bg-pinterest text-white">
              {selectedKeywords.length} selected
            </Badge>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={isAllSelected ? onDeselectAll : onSelectAll}
              className="text-foreground hover:bg-accent/20"
            >
              {isAllSelected ? (
                <Square className="h-4 w-4 mr-1" />
              ) : (
                <CheckSquare className="h-4 w-4 mr-1" />
              )}
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopySelected}
              className="glass-button text-foreground hover:bg-accent/20"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onExportSelected}
              className="glass-button text-foreground hover:bg-accent/20"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="glass-button text-foreground hover:bg-destructive/20 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Selected Keywords</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Are you sure you want to delete {selectedKeywords.length} selected keyword{selectedKeywords.length > 1 ? 's' : ''}? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleDeleteConfirm}
                      variant="destructive"
                      className="flex-1"
                    >
                      Delete Keywords
                    </Button>
                    <Button
                      onClick={() => setIsDeleteDialogOpen(false)}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
};