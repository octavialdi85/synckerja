
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Search, Filter } from 'lucide-react';

export const CompanyFilesFilters = () => {
  return (
    <div className="mb-4 p-4 bg-white/90 backdrop-blur-sm rounded-md border border-slate-200/60 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search files..."
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>
    </div>
  );
};
