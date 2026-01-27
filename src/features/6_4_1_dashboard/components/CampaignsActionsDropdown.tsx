import { useState } from 'react';
import { MoreVertical, Eye, Edit, UserPlus, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/ui/dropdown-menu';
import { Button } from '@/features/ui/button';

interface CampaignsActionsDropdownProps {
  onViewDetails: () => void;
  onEdit: () => void;
  onAssign: () => void;
  onDelete: () => void;
}

export const CampaignsActionsDropdown = ({ 
  onViewDetails, 
  onEdit, 
  onAssign, 
  onDelete 
}: CampaignsActionsDropdownProps) => {
  const [open, setOpen] = useState(false);

  const handleViewDetails = () => {
    onViewDetails();
    setOpen(false);
  };

  const handleEdit = () => {
    onEdit();
    setOpen(false);
  };

  const handleAssign = () => {
    onAssign();
    setOpen(false);
  };

  const handleDelete = () => {
    onDelete();
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <MoreVertical className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 bg-white border shadow-lg z-50">
        <DropdownMenuItem 
          onClick={handleViewDetails}
          className="cursor-pointer text-xs hover:bg-slate-50 focus:bg-slate-50"
        >
          <Eye className="h-3.5 w-3.5 mr-2" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleEdit}
          className="cursor-pointer text-xs hover:bg-slate-50 focus:bg-slate-50"
        >
          <Edit className="h-3.5 w-3.5 mr-2" />
          Edit Campaign
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleAssign}
          className="cursor-pointer text-xs hover:bg-purple-50 focus:bg-purple-50"
        >
          <UserPlus className="h-3.5 w-3.5 mr-2" />
          Assign KOL
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleDelete}
          className="cursor-pointer text-xs text-red-600 hover:bg-red-50 focus:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Delete Campaign
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
