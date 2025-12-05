
import { TrendingUp, Clock, Users, Star, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/features/ui/card';
import { Progress } from '@/features/ui/progress';
import { useCustomerServiceTickets } from '@/features/share/hooks/useCustomerServiceTickets';
import { useAvailableEmployees } from '@/features/share/hooks/useAvailableEmployees';

export const CustomerServiceInsights = () => {
  const { tickets = [] } = useCustomerServiceTickets();
  const { data: availableEmployees = [] } = useAvailableEmployees();
  
  // Calculate real metrics from tickets data
  const totalTickets = tickets.length;
  const newTickets = tickets.filter(t => t.status === 'New').length;
  const inProgressTickets = tickets.filter(t => t.status === 'In Progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'Resolved').length;
  const closedTickets = tickets.filter(t => t.status === 'Closed').length;
  
  const resolutionRate = totalTickets > 0 ? Math.round(((resolvedTickets + closedTickets) / totalTickets) * 100) : 0;
  const criticalTickets = tickets.filter(t => t.priority === 'Critical').length;
  const highPriorityTickets = tickets.filter(t => t.priority === 'High').length;
  
  // Calculate staff performance
  const staffPerformance = availableEmployees.map(employee => {
    const assignedTickets = tickets.filter(t => t.assignee_id === employee.id);
    const resolvedByStaff = assignedTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');
    const staffResolutionRate = assignedTickets.length > 0 ? (resolvedByStaff.length / assignedTickets.length) * 100 : 0;
    
    return {
      name: employee.full_name,
      initial: employee.full_name?.charAt(0)?.toUpperCase() || 'U',
      ticketCount: assignedTickets.length,
      rating: Math.round((staffResolutionRate / 100) * 5 * 10) / 10 // Convert to rating out of 5
    };
  }).filter(staff => staff.ticketCount > 0).slice(0, 2); // Show top 2 performers

  // Recent activity from tickets
  const recentActivity = tickets
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3)
    .map(ticket => ({
      action: ticket.status === 'Resolved' ? 'resolved' : 'updated',
      assignee: ticket.assigned_to || 'System',
      ticketId: ticket.ticket_id ? ticket.ticket_id.split('-').slice(-1)[0] : 'N/A',
      time: getTimeAgo(ticket.updated_at)
    }));

  function getTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  }

  return (
    <div className="space-y-3">
      {/* Performance Metrics */}
      <Card className="p-3 bg-white/95 backdrop-blur-sm border-slate-200/60">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          <h4 className="text-sm font-semibold text-slate-800">Team Performance</h4>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-600">Average Response Time</span>
              <span className="text-xs font-medium text-green-600">2.3h</span>
            </div>
            <Progress value={85} className="h-1.5" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-600">Resolution Rate</span>
              <span className="text-xs font-medium text-green-600">{resolutionRate}%</span>
            </div>
            <Progress value={resolutionRate} className="h-1.5" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-600">Customer Satisfaction</span>
              <span className="text-xs font-medium text-green-600">4.7/5</span>
            </div>
            <Progress value={94} className="h-1.5" />
          </div>
        </div>
      </Card>

      {/* Staff Performance */}
      <Card className="p-3 bg-white/95 backdrop-blur-sm border-slate-200/60">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-purple-600" />
          <h4 className="text-sm font-semibold text-slate-800">Staff Performance</h4>
        </div>
        <div className="space-y-2">
          {staffPerformance.length > 0 ? staffPerformance.map((staff, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-slate-50/50 rounded-md">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 ${index === 0 ? 'bg-green-100' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
                  <span className={`text-xs font-medium ${index === 0 ? 'text-green-700' : 'text-blue-700'}`}>
                    {staff.initial}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-800">{staff.name}</p>
                  <p className="text-xs text-slate-500">Support Agent</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-slate-800">{staff.ticketCount} tickets</p>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  <span className="text-xs text-slate-600">{staff.rating}</span>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-xs text-slate-500 text-center py-4">
              No assigned tickets yet
            </div>
          )}
        </div>
      </Card>

      {/* Critical Alerts */}
      <Card className="p-3 bg-white/95 backdrop-blur-sm border-slate-200/60">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <h4 className="text-sm font-semibold text-slate-800">Critical Alerts</h4>
        </div>
        <div className="space-y-2">
          <div className="p-2 bg-red-50/50 border border-red-200/50 rounded-md">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3 w-3 text-red-600" />
              <span className="text-xs font-medium text-red-800">High Priority Queue</span>
            </div>
            <p className="text-xs text-red-700">{criticalTickets + highPriorityTickets} urgent tickets waiting</p>
          </div>
          
          <div className="p-2 bg-amber-50/50 border border-amber-200/50 rounded-md">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-3 w-3 text-amber-600" />
              <span className="text-xs font-medium text-amber-800">New Tickets</span>
            </div>
            <p className="text-xs text-amber-700">{newTickets} new tickets pending assignment</p>
          </div>
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="p-3 bg-white/95 backdrop-blur-sm border-slate-200/60">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <h4 className="text-sm font-semibold text-slate-800">Recent Activity</h4>
        </div>
        <div className="space-y-2">
          {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
            <div key={index} className="text-xs text-slate-600">
              <span className="font-medium">{activity.assignee}</span> {activity.action} <span className="font-medium">{activity.ticketId}</span>
              <div className="text-slate-400 mt-0.5">{activity.time}</div>
            </div>
          )) : (
            <div className="text-xs text-slate-500 text-center py-4">
              No recent activity
            </div>
          )}
        </div>
      </Card>

      {/* SLA Performance */}
      <Card className="p-3 bg-white/95 backdrop-blur-sm border-slate-200/60">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-blue-600" />
          <h4 className="text-sm font-semibold text-slate-800">SLA Performance</h4>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-600">First Response</span>
              <span className="text-xs font-medium text-green-600">Target: 1h</span>
            </div>
            <div className="text-xs text-slate-500 mb-1">Average: 45min</div>
            <Progress value={92} className="h-1.5" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-600">Resolution Time</span>
              <span className="text-xs font-medium text-amber-600">Target: 24h</span>
            </div>
            <div className="text-xs text-slate-500 mb-1">Average: 18h</div>
            <Progress value={78} className="h-1.5" />
          </div>
        </div>
      </Card>
    </div>
  );
};
