import React from 'react';
import { Card } from '@/features/ui/card';
import { Shield, Key, Star, AlertTriangle } from 'lucide-react';

interface PasswordStatsProps {
  totalPasswords: number;
  strongPasswords: number;
  weakPasswords: number;
  favorites: number;
}

export const PasswordStats: React.FC<PasswordStatsProps> = ({
  totalPasswords,
  strongPasswords,
  weakPasswords,
  favorites,
}) => {
  return (
    <div className="grid grid-cols-4 gap-2">
      <Card className="p-3 border rounded-md shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Passwords</p>
            <h3 className="text-xl font-bold mt-0.5">{totalPasswords}</h3>
          </div>
          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Key className="h-5 w-5 text-blue-600" />
          </div>
        </div>
      </Card>

      <Card className="p-3 border rounded-md shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Strong Passwords</p>
            <h3 className="text-xl font-bold mt-0.5">{strongPasswords}</h3>
          </div>
          <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Shield className="h-5 w-5 text-green-600" />
          </div>
        </div>
      </Card>

      <Card className="p-3 border rounded-md shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Weak Passwords</p>
            <h3 className="text-xl font-bold mt-0.5">{weakPasswords}</h3>
          </div>
          <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
        </div>
      </Card>

      <Card className="p-3 border rounded-md shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Favorites</p>
            <h3 className="text-xl font-bold mt-0.5">{favorites}</h3>
          </div>
          <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center">
            <Star className="h-5 w-5 text-yellow-600" />
          </div>
        </div>
      </Card>
    </div>
  );
};

