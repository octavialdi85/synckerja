
import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Textarea } from '@/features/ui/textarea';
import { Checkbox } from '@/features/ui/checkbox';
import { Label } from '@/features/ui/label';
import { PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/features/ui/use-toast';
import { useMotivations } from './useMotivations';

interface ModalMotifationFormProps {
  isOpen: boolean;
  onClose: () => void;
  profileName?: string;
  editingMotivation?: any;
}

export const ModalMotifationForm = ({ isOpen, onClose, profileName, editingMotivation }: ModalMotifationFormProps) => {
  const [motivation, setMotivation] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { saveMotivation, updateMotivation, isLoading, employeeData, employeeError } = useMotivations();

  // Set form data when editing
  useEffect(() => {
    if (editingMotivation) {
      setMotivation(editingMotivation.content);
      setIsAnonymous(editingMotivation.is_anonymous);
    } else {
      setMotivation('');
      setIsAnonymous(false);
    }
  }, [editingMotivation]);

  const handleSubmit = async () => {
    if (!motivation.trim()) {
      toast({
        title: "Error",
        description: "Mohon tulis motivasi terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    // Check if organization data is ready
    if (!employeeData?.organization_id) {
      toast({
        title: "Error",
        description: "Data organisasi belum siap. Silakan coba lagi dalam beberapa detik.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingMotivation) {
        await updateMotivation(editingMotivation.id, motivation, isAnonymous, profileName);
        toast({
          title: "Berhasil!",
          description: "Motivasi berhasil diperbarui",
        });
      } else {
        await saveMotivation(motivation, isAnonymous, profileName);
        toast({
          title: "Berhasil!",
          description: "Motivasi berhasil ditambahkan",
        });
      }

      // Reset form
      setMotivation('');
      setIsAnonymous(false);
      onClose();
    } catch (error) {
      console.error('Error saving motivation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal menambahkan motivasi';
      toast({
        title: "Error", 
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const authorName = isAnonymous ? "Unknown" : (profileName || "Unknown");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <PlusCircle className="h-5 w-5 text-primary" />
            {editingMotivation ? 'Edit Motivasi' : 'Tulis Motivasi'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Tulis pesan motivasi untuk dibagikan ke tim atau edit motivasi yang sudah pernah dibuat.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="motivation" className="text-sm font-semibold">Motivasi</Label>
            <Textarea
              id="motivation"
              placeholder="Tuliskan motivasi yang menginspirasi..."
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
            />
            <Label htmlFor="anonymous" className="text-sm">
              Posting sebagai Unknown (anonim)
            </Label>
          </div>

          <div className="text-sm text-muted-foreground">
            Akan tampil sebagai: <span className="font-medium">"...motivasi... - {authorName}"</span>
          </div>

          {isLoading && (
            <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
              Memuat data organisasi...
            </div>
          )}

          {employeeError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Error memuat data organisasi. Silakan refresh halaman.
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || isLoading || !employeeData?.organization_id}
            >
              {isSubmitting ? "Menyimpan..." : (editingMotivation ? "Update Motivasi" : "Tambah Motivasi")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
