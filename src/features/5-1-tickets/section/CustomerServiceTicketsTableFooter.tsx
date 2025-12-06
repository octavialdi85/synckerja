interface CustomerServiceTicketsTableFooterProps {
  totalTickets: number;
  resolvedTickets: number;
  filteredTickets?: number;
  selectedCategory?: string;
}

export const CustomerServiceTicketsTableFooter = ({ 
  totalTickets, 
  resolvedTickets, 
  filteredTickets = totalTickets,
  selectedCategory 
}: CustomerServiceTicketsTableFooterProps) => {
  const categoryText = selectedCategory && selectedCategory !== 'all' 
    ? ` in ${selectedCategory}` 
    : '';
    
  return (
    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Showing {filteredTickets} of {totalTickets} tickets{categoryText}</span>
        <span className="text-xs text-gray-400">Total: {totalTickets} tickets</span>
      </div>
    </div>
  );
};








