import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Textarea } from '@/features/ui/textarea';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useShowToast } from '@/features/share/hooks/useShowToast';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/features/ui/separator';
import { Package, Hash, Tag, Building2, Box, Calendar, DollarSign, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assetData: any) => void;
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState('available');
  const [condition, setCondition] = useState('new');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { organizationId } = useCurrentOrg();
  const showToast = useShowToast();

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setType('');
      setSerialNumber('');
      setAssetTag('');
      setBrand('');
      setModel('');
      setStatus('available');
      setCondition('new');
      setPurchaseDate('');
      setPurchasePrice('');
      setNotes('');
      setImageUrl('');
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'Asset name is required';
    }
    if (!type.trim()) {
      newErrors.type = 'Asset type is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPrice = (value: string): string => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '');
    return numericValue;
  };

  const parsePrice = (value: string): number => {
    const numericValue = parseFloat(value.replace(/[^\d.]/g, '')) || 0;
    return numericValue;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showToast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (!organizationId) {
      showToast({
        title: 'Error',
        description: 'Organization not found',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      const priceValue = parsePrice(purchasePrice);
      
      const { error } = await supabase
        .from('company_assets')
        .insert([
          {
            organization_id: organizationId,
            name: name.trim(),
            type: type.trim(),
            serial_number: serialNumber.trim() || null,
            asset_tag: assetTag.trim() || null,
            brand: brand.trim() || null,
            model: model.trim() || null,
            status: status,
            condition: condition,
            purchase_date: purchaseDate || null,
            purchase_price: priceValue || null,
            notes: notes.trim() || null,
            image_url: imageUrl.trim() || null,
          },
        ]);

      if (error) {
        throw error;
      }

      showToast({
        title: 'Success',
        description: 'Asset added successfully',
        variant: 'default'
      });

      onSave({
        organization_id: organizationId,
        name: name.trim(),
        type: type.trim(),
        serial_number: serialNumber.trim(),
        asset_tag: assetTag.trim(),
        brand: brand.trim(),
        model: model.trim(),
        status: status,
        condition: condition,
        purchase_date: purchaseDate,
        purchase_price: priceValue,
        notes: notes.trim(),
        image_url: imageUrl.trim(),
      });

      onClose();
    } catch (error: any) {
      showToast({
        title: 'Error',
        description: error.message || 'Failed to add asset',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[600px] max-w-[90vw] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Add New Asset</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Enter asset details to add to your inventory
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div 
          className="flex-1 overflow-y-auto px-6 py-6" 
          style={{ 
            scrollbarWidth: 'thin',
            scrollBehavior: 'smooth',
            scrollbarColor: '#d1d5db transparent'
          }}
        >
          <div className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <Box className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                    placeholder="Asset Name *"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Input 
                    id="type" 
                    value={type} 
                    onChange={(e) => {
                      setType(e.target.value);
                      if (errors.type) setErrors({ ...errors, type: '' });
                    }}
                    placeholder="Asset Type *"
                    className={errors.type ? 'border-red-500' : ''}
                  />
                  {errors.type && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.type}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Identification Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Identification</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="assetTag"
                      value={assetTag}
                      onChange={(e) => setAssetTag(e.target.value)}
                      placeholder="Asset Tag"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Input
                    id="serialNumber"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Serial Number"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Brand & Model Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Brand & Model</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  id="brand" 
                  value={brand} 
                  onChange={(e) => setBrand(e.target.value)} 
                  placeholder="Brand"
                />
                <Input 
                  id="model" 
                  value={model} 
                  onChange={(e) => setModel(e.target.value)} 
                  placeholder="Model"
                />
              </div>
            </div>

            <Separator />

            {/* Status & Condition Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <Box className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Status & Condition</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="in-use">In Use</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="disposed">Disposed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger>
                      <SelectValue placeholder="Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Purchase Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Purchase Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="date"
                      id="purchaseDate"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      placeholder="Purchase Date"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="text"
                      id="purchasePrice"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(formatPrice(e.target.value))}
                      placeholder="Purchase Price"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Additional Information</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="imageUrl" 
                      value={imageUrl} 
                      onChange={(e) => setImageUrl(e.target.value)} 
                      placeholder="Image URL"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Textarea 
                    id="notes" 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="Notes (optional)"
                    className="min-h-[100px] resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 flex-shrink-0 border-t bg-muted/30">
          <div className="flex items-center justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={handleSave} 
              disabled={isSaving}
              className="min-w-[120px]"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                'Add Asset'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
