
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Building2, Users, Briefcase, Crown } from 'lucide-react';

interface OrganizationStatisticsProps {
  statistics?: {
    totalEmployees: number;
    totalDepartments: number;
    totalPositions: number;
    executiveCount: number;
  };
}

export const OrganizationStatistics = ({ statistics }: OrganizationStatisticsProps) => {
  // Provide default values if statistics is undefined
  const statsData = statistics || {
    totalEmployees: 0,
    totalDepartments: 0,
    totalPositions: 0,
    executiveCount: 0,
  };

  const stats = [
    {
      title: 'Total Employees',
      value: statsData.totalEmployees,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Departments',
      value: statsData.totalDepartments,
      icon: Building2,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Job Positions',
      value: statsData.totalPositions,
      icon: Briefcase,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Executives',
      value: statsData.executiveCount,
      icon: Crown,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
