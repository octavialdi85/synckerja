interface PasswordSidebarFooterProps {
  totalCategories: number;
  selectedCategory: string;
  totalPasswords: number;
}

export const PasswordSidebarFooter = ({ 
  totalCategories, 
  selectedCategory,
  totalPasswords 
}: PasswordSidebarFooterProps) => {
  return (
    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Categories: {totalCategories}</span>
        <span className="text-xs text-gray-400">Total: {totalPasswords}</span>
      </div>
    </div>
  );
};








