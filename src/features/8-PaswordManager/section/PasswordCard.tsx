import React, { useState } from 'react';
import { Card } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import {
  Eye,
  EyeOff,
  Copy,
  Star,
  Edit,
  Trash2,
  ExternalLink,
  Check,
} from 'lucide-react';
import { Password, Category } from '../types';
import { cn } from '@/lib/utils';
import { getPasswordStrength } from './PasswordStrengthMeter';

interface PasswordCardProps {
  password: Password;
  categories: Category[];
  onEdit: (password: Password) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export const PasswordCard: React.FC<PasswordCardProps> = ({
  password,
  categories,
  onEdit,
  onDelete,
  onToggleFavorite,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Get category name from category ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : categoryId;
  };

  const strength = getPasswordStrength(password.password);
  const strengthColors = {
    weak: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    strong: 'bg-green-100 text-green-700 border-green-200',
  };

  return (
    <Card className="p-3 hover:shadow-md transition-shadow border rounded-md shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-base">{password.title}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onToggleFavorite(password.id)}
            >
              <Star
                className={cn('h-4 w-4', password.isFavorite && 'fill-yellow-400 text-yellow-400')}
              />
            </Button>
          </div>
          <Badge variant="outline" className="text-xs">
            {getCategoryName(password.category)}
          </Badge>
        </div>
        <Badge variant="outline" className={cn('text-xs', strengthColors[strength])}>
          {strength.charAt(0).toUpperCase() + strength.slice(1)}
        </Badge>
      </div>

      <div className="space-y-2">
        {/* Username */}
        <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Username</p>
            <p className="text-sm font-medium truncate">{password.username}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => copyToClipboard(password.username, 'username')}
          >
            {copiedField === 'username' ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Password */}
        <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Password</p>
            <p className="text-sm font-mono">
              {showPassword ? password.password : '••••••••••••'}
            </p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => copyToClipboard(password.password, 'password')}
            >
              {copiedField === 'password' ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* URL */}
        {password.url && (
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Website</p>
              <a
                href={password.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline truncate flex items-center gap-1"
              >
                {password.url}
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            </div>
          </div>
        )}

        {/* Notes */}
        {password.notes && (
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-gray-700 line-clamp-2">{password.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <p className="text-xs text-muted-foreground">
          Updated {new Date(password.updatedAt).toLocaleDateString()}
        </p>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => onEdit(password)}>
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(password.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

