import React from 'react';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { cn } from '@/lib/utils';
import { Star, Globe, Mail, CreditCard, Briefcase, Lock } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  showFavoritesCount: number;
  onShowFavorites: () => void;
  isShowingFavorites: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  star: <Star className="h-4 w-4" />,
  globe: <Globe className="h-4 w-4" />,
  mail: <Mail className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
  briefcase: <Briefcase className="h-4 w-4" />,
  lock: <Lock className="h-4 w-4" />,
};

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  showFavoritesCount,
  onShowFavorites,
  isShowingFavorites,
}) => {
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">FILTERS</h3>
      
      <Button
        variant={isShowingFavorites ? 'secondary' : 'ghost'}
        className={cn('w-full justify-start h-9 px-2', isShowingFavorites && 'bg-yellow-50')}
        onClick={onShowFavorites}
        size="sm"
      >
        <Star className={cn('h-4 w-4 mr-2', isShowingFavorites && 'fill-yellow-400 text-yellow-400')} />
        <span className="text-sm">Favorites</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {showFavoritesCount}
        </Badge>
      </Button>

      <Button
        variant={selectedCategory === 'all' && !isShowingFavorites ? 'secondary' : 'ghost'}
        className="w-full justify-start h-9 px-2"
        onClick={() => onSelectCategory('all')}
        size="sm"
      >
        <Globe className="h-4 w-4 mr-2" />
        <span className="text-sm">All Passwords</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {categories.reduce((sum, cat) => sum + cat.count, 0)}
        </Badge>
      </Button>

      <div className="pt-3">
        <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">CATEGORIES</h3>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id && !isShowingFavorites ? 'secondary' : 'ghost'}
            className="w-full justify-start h-9 px-2 mb-0.5"
            onClick={() => onSelectCategory(category.id)}
            size="sm"
          >
            {iconMap[category.icon] || <Lock className="h-4 w-4" />}
            <span className="ml-2 text-sm">{category.name}</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {category.count}
            </Badge>
          </Button>
        ))}
      </div>
    </div>
  );
};

