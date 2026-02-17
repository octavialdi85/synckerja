import React from 'react';
import { Password, Category } from '../types';
import { PasswordCard } from './PasswordCard';

interface PasswordListProps {
  passwords: Password[];
  categories: Category[];
  onEdit: (password: Password) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export const PasswordList: React.FC<PasswordListProps> = ({
  passwords,
  categories,
  onEdit,
  onDelete,
  onToggleFavorite,
}) => {
  if (passwords.length === 0) {
    return (
      <div className="bg-white border rounded-md shadow-sm p-8 text-center">
        <p className="text-muted-foreground text-base mb-1">No passwords found</p>
        <p className="text-sm text-muted-foreground">
          Click "Add Password" to create your first password entry
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {passwords.map((password) => (
        <PasswordCard
          key={password.id}
          password={password}
          categories={categories}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
};

