import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/features/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/ui/dropdown-menu';

interface CustomerServiceTicketActionsDropdownProps {
  onEdit: () => void;
  onDelete: () => void;
}

export const CustomerServiceTicketActionsDropdown = ({
  onEdit,
  onDelete
}: CustomerServiceTicketActionsDropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-6 w-6 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white border border-slate-200 shadow-lg z-50">
        <DropdownMenuItem onClick={onEdit} className="cursor-pointer hover:bg-slate-50">
          <Edit className="mr-2 h-4 w-4" />
          Edit Ticket
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="cursor-pointer hover:bg-slate-50 text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Ticket
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
