import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/features/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { useToast } from '@/features/ui/use-toast';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

interface ProductFormData {
  name: string;
  description?: string;
  sku?: string;
  category: string;
  price?: number;
  cost?: number;
  stock_quantity?: number;
  min_stock_level?: number;
  status: 'active' | 'inactive' | 'draft';
}

interface ProductCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const ProductCreateDialog = ({ open, onOpenChange, onSuccess }: ProductCreateDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { organizationId } = useCurrentOrg();
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProductFormData>({
    defaultValues: {
      status: 'active',
      stock_quantity: 0,
      min_stock_level: 0
    }
  });

  const status = watch('status');

  const onSubmit = async (data: ProductFormData) => {
    if (!organizationId) {
      toast({ title: "Error", description: "No organization selected", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // 1. Insert into services table first
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .insert({
          name: data.category,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (serviceError) throw serviceError;

      // 2. Insert into sub_services table
      const { data: subServiceData, error: subServiceError } = await supabase
        .from('sub_services')
        .insert({
          name: data.name,
          service_id: serviceData.id,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (subServiceError) throw subServiceError;

      // 3. Insert into products table
      const { error: productError } = await supabase.from('products').insert({
        ...data,
        organization_id: organizationId,
        created_by: userId
      });

      if (productError) throw productError;

      toast({ title: "Success", description: "Product and services created successfully" });
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast({ title: "Error", description: "Failed to create product and services", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
          <DialogDescription>
            Add a new product to your inventory management system.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Product name is required' })}
                placeholder="Enter product name"
              />
              {errors.name && (
                <span className="text-sm text-red-500">{errors.name.message}</span>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Product description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  {...register('sku')}
                  placeholder="Product SKU"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Category *</Label>
                <Input
                  id="category"
                  {...register('category', { required: 'Category is required' })}
                  placeholder="Product category"
                />
                {errors.category && (
                  <span className="text-sm text-red-500">{errors.category.message}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  {...register('price', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cost">Cost</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  {...register('cost', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stock_quantity">Stock Quantity</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  {...register('stock_quantity', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="min_stock_level">Min Stock Level</Label>
                <Input
                  id="min_stock_level"
                  type="number"
                  {...register('min_stock_level', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setValue('status', value as 'active' | 'inactive' | 'draft')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
