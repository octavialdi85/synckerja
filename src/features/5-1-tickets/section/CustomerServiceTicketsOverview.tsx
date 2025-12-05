import { Ticket, Clock, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';
import { useCustomerServiceTickets } from '@/features/share/hooks/useCustomerServiceTickets';
import { format } from 'date-fns';

interface CustomerServiceTicketsOverviewProps {
  tickets?: any[];
}

export const CustomerServiceTicketsOverview = ({ tickets: propTickets }: CustomerServiceTicketsOverviewProps) => {
  const { tickets: hookTickets = [] } = useCustomerServiceTickets();
  const tickets = propTickets || hookTickets;

  // Calculate real data from tickets
  const newTickets = tickets.filter(t => t.status === 'New' || t.status === 'new').length;
  const inProgressTickets = tickets.filter(t => t.status === 'In Progress' || t.status === 'in-progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'Resolved' || t.status === 'resolved' || t.status === 'Closed' || t.status === 'closed').length;

  // Get unique categories
  const uniqueCategories = [...new Set(tickets.map(t => t.category).filter(Boolean))];
  const totalCategories = uniqueCategories.length;

  // Get top category (category with most tickets)
  const categoryCounts = uniqueCategories.map(cat => ({
    name: cat,
    count: tickets.filter(t => t.category === cat).length
  }));
  const topCategory = categoryCounts.reduce((max, current) => 
    current.count > max.count ? current : max, categoryCounts[0] || { name: 'N/A', count: 0 });

  // Calculate average resolution time (if we have resolved tickets with dates)
  const resolvedWithDates = tickets.filter(t => 
    (t.status === 'Resolved' || t.status === 'resolved' || t.status === 'Closed' || t.status === 'closed') && 
    t.created_at && t.updated_at
  );
  const avgResolutionTime = resolvedWithDates.length > 0
    ? resolvedWithDates.reduce((sum, ticket) => {
        const created = new Date(ticket.created_at);
        const updated = new Date(ticket.updated_at);
        const diffDays = Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        return sum + diffDays;
      }, 0) / resolvedWithDates.length
    : 0;

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-800">New Tickets</p>
              <p className="text-lg font-bold text-blue-900">{newTickets}</p>
            </div>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </div>
        </div>
        
        <div className="p-3 bg-purple-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-800">In Progress</p>
              <p className="text-lg font-bold text-purple-900">{inProgressTickets}</p>
            </div>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
        </div>

        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-800">Resolved</p>
              <p className="text-lg font-bold text-green-900">{resolvedTickets}</p>
            </div>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </div>
        </div>
      </div>

      {/* Top Category */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <TrendingUp className="h-3 w-3" />
          Top Category
        </h4>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{topCategory.name}</p>
              <p className="text-xs text-gray-500">{topCategory.count} tickets</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Leading</p>
              <div className="w-2 h-2 bg-green-500 rounded-full mt-1"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Average Resolution Time */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Clock className="h-3 w-3" />
          Average Resolution Time
        </h4>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {avgResolutionTime > 0 ? `${Math.round(avgResolutionTime)} days` : 'N/A'}
              </p>
              <p className="text-xs text-gray-500">Based on resolved tickets</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Avg</p>
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Total Categories */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Ticket className="h-3 w-3" />
          Total Categories
        </h4>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{totalCategories}</p>
              <p className="text-xs text-gray-500">Active categories</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Count</p>
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-1"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};





