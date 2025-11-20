
import React from 'react';
import { Package, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface CompanyAssetsMetricsCardsProps {
  assets: any[];
}

export const CompanyAssetsMetricsCards = ({ assets }: CompanyAssetsMetricsCardsProps) => {
  const metrics = [
    {
      title: 'Total Assets',
      count: assets.length,
      icon: Package,
      accentColor: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Available',
      count: assets.filter(asset => asset.status === 'available').length,
      icon: CheckCircle,
      accentColor: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'In Use',
      count: assets.filter(asset => asset.status === 'in-use').length,
      icon: Clock,
      accentColor: 'bg-amber-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600'
    },
    {
      title: 'Maintenance',
      count: assets.filter(asset => asset.status === 'maintenance').length,
      icon: AlertTriangle,
      accentColor: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600'
    }
  ];

  return (
    <>
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        
        return (
          <div key={index} className="bg-white rounded-md border border-gray-200/50 p-2.5 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-500 mb-0.5">{metric.title}</div>
                <div className="text-xl font-bold text-gray-900">{metric.count}</div>
                <div className="text-xs text-gray-500">
                  Items
                </div>
              </div>
              <div className={`p-1.5 rounded-md ${metric.bgColor} ml-2`}>
                <Icon className={`h-3.5 w-3.5 ${metric.textColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};
