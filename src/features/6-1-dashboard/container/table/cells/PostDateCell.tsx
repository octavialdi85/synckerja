
import React from 'react';
import { Button } from '@/features/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface PostDateCellProps {
  postDate: string | null;
  onDateChange: (date: string) => void;
}

export const PostDateCell: React.FC<PostDateCellProps> = ({
  postDate,
  onDateChange
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const formatPostDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'dd MMM yyyy');
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (newDate) {
      onDateChange(newDate);
    }
    setIsEditing(false);
  };

  const handleClick = () => {
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <div className="relative">
        <input
          type="date"
          value={postDate || ''}
          onChange={handleDateChange}
          onBlur={() => setIsEditing(false)}
          autoFocus
          className="h-8 px-3 text-xs w-full border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <Button 
        type="button"
        variant="outline" 
        size="sm" 
        onClick={handleClick}
        className="h-8 px-3 text-xs w-full justify-start rounded-sm"
      >
        <CalendarIcon className="h-3 w-3 mr-2 flex-shrink-0" />
        <span className="truncate font-medium">
          {postDate ? formatPostDateForDisplay(postDate) : 'Select date'}
        </span>
      </Button>
    </div>
  );
};
