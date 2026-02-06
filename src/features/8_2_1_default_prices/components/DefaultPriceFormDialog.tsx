import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/ui/select';
import { useSalesActivityMasterData } from '@/hooks/organized/sales';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import type { DefaultPriceRow, DefaultPriceCreate } from '../types';

interface DefaultPriceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: DefaultPriceCreate) => Promise<void>;
  editingRow?: DefaultPriceRow | null;
}

export const DefaultPriceFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  editingRow,
}: DefaultPriceFormDialogProps) => {
  const { organizationId } = useCurrentOrg();
  const { services, getSubServicesByService } = useSalesActivityMasterData();
  const [serviceId, setServiceId] = useState('');
  const [subServiceId, setSubServiceId] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const subServices = serviceId ? getSubServicesByService(serviceId) : [];

  useEffect(() => {
    if (!open) return;
    if (editingRow) {
      setServiceId(editingRow.service_id);
      setSubServiceId(editingRow.sub_service_id ?? '');
      setUnitPrice(String(editingRow.unit_price ?? ''));
    } else {
      setServiceId('');
      setSubServiceId('');
      setUnitPrice('');
    }
    setError('');
  }, [open, editingRow]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!organizationId) return;
    const service = services.find((s: { id: string }) => s.id === serviceId);
    if (!service) {
      setError('Please select a service.');
      return;
    }
    if (!editingRow && !subServiceId) {
      setError('Please select a category (sub-service).');
      return;
    }
    const price = parseFloat(unitPrice);
    if (Number.isNaN(price) || price < 0) {
      setError('Unit price must be a non-negative number.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        organization_id: organizationId,
        service_id: serviceId,
        sub_service_id: subServiceId || null,
        unit_price: price,
      });
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingRow ? 'Edit Default Price' : 'Add Default Price'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="service">Service *</Label>
            <Select value={serviceId} onValueChange={(v) => { setServiceId(v); setSubServiceId(''); }} disabled={!!editingRow}>
              <SelectTrigger id="service" className="mt-1">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {(services ?? []).map((s: { id: string; name: string }) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="category">Category (Sub-service) *</Label>
            <Select value={subServiceId} onValueChange={setSubServiceId} disabled={!serviceId || !!editingRow}>
              <SelectTrigger id="category" className="mt-1">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {subServices.map((s: { id: string; name: string }) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="unit_price">Unit Price (Rp) *</Label>
            <Input
              id="unit_price"
              type="number"
              min={0}
              step={1}
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="0"
              className="mt-1"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (editingRow ? 'Update' : 'Add')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
