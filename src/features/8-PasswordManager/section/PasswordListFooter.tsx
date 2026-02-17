interface PasswordListFooterProps {
  totalPasswords: number;
  filteredPasswords: number;
  selectedCategoryName?: string | null;
}

export const PasswordListFooter = ({ 
  totalPasswords, 
  filteredPasswords,
  selectedCategoryName 
}: PasswordListFooterProps) => {
  const categoryText = selectedCategoryName ? ` in ${selectedCategoryName}` : '';
    
  return (
    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Showing {filteredPasswords} of {totalPasswords} passwords{categoryText}</span>
        <span className="text-xs text-gray-400">Total: {totalPasswords} passwords</span>
      </div>
    </div>
  );
};








