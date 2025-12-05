import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/organized/utils';

interface LeadStatus {
  id: string;
  name: string;
  description: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

interface StatusManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StatusManagement = ({ open, onOpenChange }: StatusManagementProps) => {
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [editingStatus, setEditingStatus] = useState<LeadStatus | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6B7280'
  });
  const { toast } = useToast();

  const fetchStatuses = async () => {
    const { data, error } = await supabase
      .from('lead_statuses')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load status data",
        variant: "destructive"
      });
      return;
    }

    setStatuses(data || []);
  };

  useEffect(() => {
    if (open) {
      fetchStatuses();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('active_organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.active_organization_id) {
      toast({
        title: "Error",
        description: "Active organization not found",
        variant: "destructive"
      });
      return;
    }

    if (isEditing && editingStatus) {
      const { error } = await supabase
        .from('lead_statuses')
        .update(formData)
        .eq('id', editingStatus.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update status",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Status updated successfully"
      });
    } else {
      const { error } = await supabase
        .from('lead_statuses')
        .insert({
          ...formData,
          organization_id: profile.active_organization_id,
          sort_order: statuses.length
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add status",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Status added successfully"
      });
    }

    setFormData({ name: '', description: '', color: '#6B7280' });
    setIsEditing(false);
    setEditingStatus(null);
    fetchStatuses();
  };

  const handleEdit = (status: LeadStatus) => {
    setEditingStatus(status);
    setFormData({
      name: status.name,
      description: status.description || '',
      color: status.color
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this status?')) return;

    const { error } = await supabase
      .from('lead_statuses')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete status",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Status deleted successfully"
    });
    fetchStatuses();
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', color: '#6B7280' });
    setIsEditing(false);
    setEditingStatus(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lead Status Management</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {isEditing ? 'Edit Status' : 'Add New Status'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Status Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter status name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter status description"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#6B7280"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Plus className="w-4 h-4 mr-2" />
                  {isEditing ? 'Update' : 'Add'}
                </Button>
                {isEditing && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Table */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Status List</h3>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((status) => (
                  <TableRow key={status.id}>
                    <TableCell className="font-medium">{status.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {status.color}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-32 truncate">
                      {status.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(status)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(status.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
