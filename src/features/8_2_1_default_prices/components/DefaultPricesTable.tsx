import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/features/ui/table';
import { Button } from '@/features/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/features/ui/tooltip';
import { MoreVertical, Pencil, Trash2, ListChecks } from 'lucide-react';
import { useToast } from '@/features/ui/use-toast';
import type { DefaultPriceRow } from '../types';

function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'decimal', minimumFractionDigits: 0 }).format(n);
}

interface DefaultPricesTableProps {
  rows: DefaultPriceRow[];
  isLoading: boolean;
  onEdit: (row: DefaultPriceRow) => void;
  onDelete: (id: string) => Promise<void>;
  onOpenSop?: (row: DefaultPriceRow) => void;
}

export const DefaultPricesTable = ({ rows, isLoading, onEdit, onDelete, onOpenSop }: DefaultPricesTableProps) => {
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id);
      toast({ title: 'Deleted', description: 'Default price removed.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">Loading...</div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">No default prices yet. Add one to auto-fill amount on lead conversion.</div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="max-w-[160px] w-[160px]">Service</TableHead>
            <TableHead className="min-w-[180px] w-[180px]">Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Unit Price (Rp)</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="max-w-[160px] truncate" title={row.service_name ?? undefined}>{row.service_name ?? '-'}</TableCell>
              <TableCell className="min-w-[180px] max-w-[200px] truncate" title={row.sub_service_name ?? undefined}>{row.sub_service_name ?? '-'}</TableCell>
              <TableCell className="max-w-[200px]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="block truncate cursor-default">
                      {row.description?.trim() ? row.description : '-'}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-sm bg-white text-gray-900 border border-gray-200 shadow-lg rounded-lg px-3 py-2"
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {row.description?.trim() ? row.description : '—'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TableCell>
            <TableCell className="text-right font-medium">{formatRupiah(row.unit_price)}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onOpenSop && (
                    <DropdownMenuItem onClick={() => onOpenSop(row)}>
                      <ListChecks className="mr-2 h-4 w-4" />
                      Workflow / SOP
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEdit(row)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(row.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </TooltipProvider>
  );
};
