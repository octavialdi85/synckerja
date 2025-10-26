import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, Calendar, User, FileText, Clock, CheckCircle, XCircle, Target } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/features/ui/collapsible';
import { Badge } from '@/features/ui/badge';

interface ReprimandData {
  id: string;
  reprimand_type: string;
  severity_level: string;
  violation_category: string;
  incident_date: string;
  incident_time?: string;
  incident_location?: string;
  violation_description: string;
  evidence_details?: string;
  witness_names?: string;
  previous_warnings_count: number;
  corrective_action_plan?: string;
  improvement_deadline?: string;
  follow_up_date?: string;
  status: string;
  acknowledgment_required: boolean;
  employee_acknowledged: boolean;
  acknowledgment_date?: string;
  is_formal: boolean;
  impact_on_performance_review: boolean;
  notes?: string;
  document_path?: string;
  issued_by: string;
  created_at: string;
  updated_at: string;
}

interface ReprimandViewDropdownProps {
  employeeId: string;
  employeeName: string;
  jobPosition?: string;
  profilePhotoUrl?: string;
  reprimandCount: number;
  reprimandBoxes: JSX.Element[];
  reprimands: ReprimandData[];
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'bg-red-50 text-red-700 border-red-200';
    case 'high': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'low': return 'bg-green-50 text-green-700 border-green-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-red-50 text-red-700 border-red-200';
    case 'resolved': return 'bg-green-50 text-green-700 border-green-200';
    case 'appealed': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'cancelled': return 'bg-gray-50 text-gray-700 border-gray-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const formatReprimandType = (type: string) => {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const ReprimandViewDropdown = ({ 
  employeeId, 
  employeeName, 
  jobPosition, 
  profilePhotoUrl, 
  reprimandCount, 
  reprimandBoxes, 
  reprimands 
}: ReprimandViewDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (reprimands.length === 0) {
    return (
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ChevronRight className="h-4 w-4 text-gray-400" />
            
            {/* Employee Avatar */}
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0" style={{ minWidth: '150px', maxWidth: '180px' }}>
              <div className="relative flex shrink-0 overflow-hidden rounded-full h-8 w-8 text-xs">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                  {profilePhotoUrl ? (
                    <img 
                      src={profilePhotoUrl} 
                      alt={employeeName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    employeeName.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-gray-900 truncate">{employeeName}</h3>
                <p className="text-xs text-gray-500 truncate">{jobPosition || 'No position'}</p>
              </div>
            </div>

            {/* Reprimand Count */}
            <span className="text-sm font-semibold text-gray-900 flex-shrink-0" style={{ minWidth: '32px' }}>
              {reprimandCount}x
            </span>

            {/* Reprimand Boxes */}
            <div className="flex-1 min-w-0 overflow-x-auto">
              <div className="flex gap-1 flex-shrink-0 w-max pr-4">
                {reprimandBoxes}
              </div>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="flex-shrink-0 h-8 px-3 text-xs"
              disabled
            >
              No Violations
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {isOpen ? 
                  <ChevronDown className="h-4 w-4 text-gray-400" /> : 
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                }
                
                {/* Employee Avatar */}
                <div className="flex items-center gap-2 flex-shrink-0 min-w-0" style={{ minWidth: '150px', maxWidth: '180px' }}>
                  <div className="relative flex shrink-0 overflow-hidden rounded-full h-8 w-8 text-xs">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                      {profilePhotoUrl ? (
                        <img 
                          src={profilePhotoUrl} 
                          alt={employeeName}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        employeeName.charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{employeeName}</h3>
                    <p className="text-xs text-gray-500 truncate">{jobPosition || 'No position'}</p>
                  </div>
                </div>

                {/* Reprimand Count */}
                <span className="text-sm font-semibold text-gray-900 flex-shrink-0" style={{ minWidth: '32px' }}>
                  {reprimandCount}x
                </span>

                {/* Reprimand Boxes */}
                <div className="flex-1 min-w-0 overflow-x-auto">
                  <div className="flex gap-1 flex-shrink-0 w-max pr-4">
                    {reprimandBoxes}
                  </div>
                </div>

                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                  {reprimands.length} Violations
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-xs font-medium leading-tight ${
                  reprimands.some(r => r.status === 'active') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
                }`}>
                  {reprimands.some(r => r.status === 'active') ? 'Active' : 'Resolved'}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="p-4 bg-white border-l border-r border-b border-gray-200 rounded-b-lg">
            {reprimands.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <h4 className="font-medium text-gray-900 mb-2">No violations for {employeeName}</h4>
                <p className="text-sm text-gray-500">
                  This employee has a clean record with no disciplinary actions.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Violations */}
                {reprimands.filter(r => r.status === 'active').length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-gray-900">Active Violations</span>
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                        {reprimands.filter(r => r.status === 'active').length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {reprimands.filter(r => r.status === 'active').map((reprimand, index) => (
                        <div key={reprimand.id} className="border border-red-200 rounded-lg p-3 bg-red-50">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                              <Badge className={`text-xs ${getSeverityColor(reprimand.severity_level)}`}>
                                {reprimand.severity_level}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(reprimand.incident_date)}</span>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-1">
                              {formatReprimandType(reprimand.reprimand_type)}
                            </h4>
                            <p className="text-xs text-gray-600 mb-2">
                              {reprimand.violation_description}
                            </p>
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="text-gray-600">Category:</span>
                              <span className="font-medium">{reprimand.violation_category}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-600">Previous:</span>
                              <span className="font-medium">{reprimand.previous_warnings_count}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolved Violations */}
                {reprimands.filter(r => r.status === 'resolved').length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-900">Resolved Violations</span>
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        {reprimands.filter(r => r.status === 'resolved').length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {reprimands.filter(r => r.status === 'resolved').map((reprimand, index) => (
                        <div key={reprimand.id} className="border border-green-200 rounded-lg p-3 bg-green-50">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                              <Badge className={`text-xs ${getSeverityColor(reprimand.severity_level)}`}>
                                {reprimand.severity_level}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(reprimand.incident_date)}</span>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-1">
                              {formatReprimandType(reprimand.reprimand_type)}
                            </h4>
                            <p className="text-xs text-gray-600 mb-2">
                              {reprimand.violation_description}
                            </p>
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="text-gray-600">Category:</span>
                              <span className="font-medium">{reprimand.violation_category}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-600">Previous:</span>
                              <span className="font-medium">{reprimand.previous_warnings_count}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Status Violations */}
                {reprimands.filter(r => !['active', 'resolved'].includes(r.status)).length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-gray-900">Other Status</span>
                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                        {reprimands.filter(r => !['active', 'resolved'].includes(r.status)).length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {reprimands.filter(r => !['active', 'resolved'].includes(r.status)).map((reprimand, index) => (
                        <div key={reprimand.id} className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                              <Badge className={`text-xs ${getSeverityColor(reprimand.severity_level)}`}>
                                {reprimand.severity_level}
                              </Badge>
                              <Badge className={`text-xs ${getStatusColor(reprimand.status)}`}>
                                {reprimand.status}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(reprimand.incident_date)}</span>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-1">
                              {formatReprimandType(reprimand.reprimand_type)}
                            </h4>
                            <p className="text-xs text-gray-600 mb-2">
                              {reprimand.violation_description}
                            </p>
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="text-gray-600">Category:</span>
                              <span className="font-medium">{reprimand.violation_category}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-600">Previous:</span>
                              <span className="font-medium">{reprimand.previous_warnings_count}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
    </Collapsible>
  );
};

export default ReprimandViewDropdown;
