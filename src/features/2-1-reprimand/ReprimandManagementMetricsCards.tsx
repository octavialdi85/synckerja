import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
// import '@/components/1_halaman/1_home/typography.css'; // File not found

interface ReprimandManagementMetricsCardsProps {
  reprimands: any[];
  employees: any[];
}

function ReprimandManagementMetricsCards({ reprimands, employees }: ReprimandManagementMetricsCardsProps) {
  // Calculate metrics
  const totalReprimands = reprimands.length;
  
  const activeReprimands = reprimands.filter(r => r.status === 'active').length;
  
  const resolvedReprimands = reprimands.filter(r => r.status === 'resolved').length;
  
  const criticalSeverity = reprimands.filter(r => r.severity_level === 'critical' || r.severity_level === 'high').length;

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      {/* Total Reprimands */}
      <div className="bg-white border-gray-200 border rounded-lg p-3 w-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Total Reprimands</h3>
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        
        <div className="space-y-0.5">
          <div className="text-2xl font-bold text-gray-900">{totalReprimands}</div>
          <div className="text-xs text-gray-500">All records</div>
        </div>
      </div>

      {/* Active Reprimands */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100 border rounded-lg p-3 w-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Active Reprimands</h3>
          <CheckCircle className="w-5 h-5 text-green-600" />
        </div>
        
        <div className="space-y-0.5">
          <div className="text-2xl font-bold text-gray-900">{activeReprimands}</div>
          <div className="text-xs text-gray-500">Ongoing cases</div>
        </div>
      </div>

      {/* Resolved */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 border rounded-lg p-3 w-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Resolved</h3>
          <CheckCircle className="w-5 h-5 text-blue-600" />
        </div>
        
        <div className="space-y-0.5">
          <div className="text-2xl font-bold text-gray-900">{resolvedReprimands}</div>
          <div className="text-xs text-gray-500">Closed cases</div>
        </div>
      </div>

      {/* Critical/High Severity */}
      <div className="bg-gradient-to-br from-red-50 to-orange-50 border-red-100 border rounded-lg p-3 w-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Critical/High</h3>
          <XCircle className="w-5 h-5 text-red-600" />
        </div>
        
        <div className="space-y-0.5">
          <div className="text-2xl font-bold text-gray-900">{criticalSeverity}</div>
          <div className="text-xs text-gray-500">High priority</div>
        </div>
      </div>
    </div>
  );
}

export default ReprimandManagementMetricsCards;

