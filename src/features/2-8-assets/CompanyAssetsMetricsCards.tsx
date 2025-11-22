import React from 'react';
import { Package, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface CompanyAssetsMetricsCardsProps {
  assets: any[];
}

export const CompanyAssetsMetricsCards = ({ assets }: CompanyAssetsMetricsCardsProps) => {
  const totalAssets = assets.length;
  const availableAssets = assets.filter(asset => asset.status === 'available').length;
  const inUseAssets = assets.filter(asset => asset.status === 'in-use').length;
  const maintenanceAssets = assets.filter(asset => asset.status === 'maintenance').length;

  const statsCards = [
    {
      title: 'Total Assets',
      value: totalAssets.toString(),
      subtitle: 'All assets',
      icon: Package,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Available',
      value: availableAssets.toString(),
      subtitle: 'Currently available',
      icon: CheckCircle,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'In Use',
      value: inUseAssets.toString(),
      subtitle: 'Currently in use',
      icon: Clock,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    },
    {
      title: 'Maintenance',
      value: maintenanceAssets.toString(),
      subtitle: 'Under maintenance',
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
      {statsCards.map((stat, index) => (
        <div key={index} className={`${stat.bgColor} ${stat.borderColor} border rounded-md p-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">{stat.title}</h3>
            <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-600">{stat.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

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
