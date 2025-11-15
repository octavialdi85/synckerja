
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { ScrollArea } from '@/features/ui/scroll-area';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { useLeaveRequests } from '@/features/2-1-employees/MyInfo/Attendance/hooks/useLeaveRequests';
import { format } from 'date-fns';
import { id, enUS } from 'date-fns/locale';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { applyVariables } from '@/features/share/i18n/translations';
import { 
  Bell, 
  Calendar, 
  CheckCircle, 
  Clock, 
  User, 
  MessageSquare,
  AlertTriangle,
  Info,
  ChevronRight,
  X
} from 'lucide-react';

export const SectionActivityNotifikasi = () => {
  const { t, dateLocale } = useAppTranslation();
  const [selectedFilter, setSelectedFilter] = useState('all');
  
  // Fetch real leave request data
  const { data: leaveRequests, isLoading } = useLeaveRequests({});

  // Convert leave requests to activity format
  const leaveActivities = React.useMemo(() => {
    if (!leaveRequests) return [];
    
    const getLeaveTypeLabel = (type: string) => {
      switch (type) {
        case 'annual': return t('activity.leaveType.annual', 'Annual');
        case 'sick': return t('activity.leaveType.sick', 'Sick');
        case 'emergency': return t('activity.leaveType.emergency', 'Emergency');
        default: return type;
      }
    };
    
    return leaveRequests.slice(0, 10).map((request) => ({
      id: request.id,
      type: 'leave_request',
      title: applyVariables(t('activity.leaveRequestTitle', 'Leave Request {{type}}'), { 
        type: getLeaveTypeLabel(request.leave_type) 
      }),
      description: applyVariables(t('activity.leaveRequestDescription', '{{employee}} requested leave {{startDate}} - {{endDate}} ({{days}} days)'), {
        employee: request.employees?.full_name || t('activity.employee', 'Employee'),
        startDate: format(new Date(request.start_date), 'dd MMM', { locale: dateLocale }),
        endDate: format(new Date(request.end_date), 'dd MMM yyyy', { locale: dateLocale }),
        days: String(request.total_days)
      }),
      time: format(new Date(request.created_at), 'dd MMM yyyy HH:mm', { locale: dateLocale }),
      priority: request.status === 'pending' ? 'high' : 
                request.status === 'rejected' ? 'medium' : 'low',
      status: request.status,
      icon: Calendar,
      reason: request.reason,
      employee: request.employees?.full_name,
      department: request.employees?.departments?.name
    }));
  }, [leaveRequests, t, dateLocale]);

  // Mix leave requests with some mock system activities
  const activities = [...leaveActivities];

  const filters = [
    { id: 'all', label: t('activity.filter.all', 'All'), count: activities.length },
    { id: 'pending', label: t('activity.filter.pending', 'Pending'), count: activities.filter(a => a.status === 'pending').length },
    { id: 'approved', label: t('activity.filter.approved', 'Approved'), count: activities.filter(a => a.status === 'approved').length },
    { id: 'rejected', label: t('activity.filter.rejected', 'Rejected'), count: activities.filter(a => a.status === 'rejected').length },
    { id: 'high', label: t('activity.filter.highPriority', 'High Priority'), count: activities.filter(a => a.priority === 'high').length }
  ];

  const filteredActivities = activities.filter(activity => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'pending') return activity.status === 'pending';
    if (selectedFilter === 'approved') return activity.status === 'approved';
    if (selectedFilter === 'rejected') return activity.status === 'rejected';
    if (selectedFilter === 'high') return activity.priority === 'high';
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-border';
      case 'low': return 'text-muted-foreground bg-muted border-border';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return t('activity.status.pending', 'Pending');
      case 'approved': return t('activity.status.approved', 'Approved');
      case 'rejected': return t('activity.status.rejected', 'Rejected');
      case 'cancelled': return t('activity.status.cancelled', 'Cancelled');
      case 'info': return t('activity.status.info', 'Info');
      default: return status;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
        <CardTitle className="text-base font-semibold text-gray-900 leading-snug flex items-center">
          <Bell className="h-4 w-4 mr-2 text-blue-600" />
          {t('activity.title', 'Activities & Notifications')}
        </CardTitle>
        <Badge variant="secondary" className="text-xs font-medium leading-tight">
          {filteredActivities.length}
        </Badge>
        </div>
        
        {/* Filter Tabs with Horizontal Scroll - Made thinner */}
        <div className="mt-2 overflow-x-auto seamless-scroll horizontal-scroll">
          <div className="flex gap-1 min-w-max py-1">
            {filters.map((filter) => (
              <Button
                key={filter.id}
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFilter(filter.id)}
                className={`text-xs font-medium h-6 px-2 whitespace-nowrap flex-shrink-0 leading-tight ${
                  selectedFilter === filter.id 
                    ? 'filter-button-active' 
                    : 'filter-button-hover'
                }`}
              >
                {filter.label}
                {filter.count > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-1 h-3 px-1 text-xs font-medium leading-tight"
                  >
                    {filter.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col">
        <ScrollArea className="flex-1 px-4 seamless-scroll">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-sm text-gray-500 leading-relaxed">{t('activity.loading', 'Loading data...')}</div>
            </div>
          ) : (
          <div className="space-y-3">
            {filteredActivities.map((activity) => {
              const IconComponent = activity.icon;
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
                >
                  <div className={`p-2 rounded-full border ${getPriorityColor(activity.priority)}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 leading-normal line-clamp-1">
                          {activity.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 leading-normal line-clamp-2">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500 leading-normal">
                            {activity.time}
                          </span>
                          <Badge 
                            className={`text-xs font-medium px-2 py-0 leading-tight ${getStatusColor(activity.status)}`}
                          >
                            {getStatusLabel(activity.status)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </ScrollArea>
        
        {/* Action Footer */}
        <div className="p-4 border-t">
          <Button variant="outline" className="w-full text-xs h-8">
            {t('activity.viewAll', 'View All Activities')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
