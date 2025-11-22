import React from 'react';
import { FileText, Image, Folder, HardDrive } from 'lucide-react';
import { useCompanyFiles } from './useCompanyFiles';

export const CompanyFilesMetricsCards = () => {
  const { files } = useCompanyFiles();

  const totalFiles = files.length;
  const totalSize = files.reduce((acc, file) => acc + (file.file_size || 0), 0);
  const imageFiles = files.filter(file => file.mime_type?.startsWith('image/')).length;
  const documentFiles = files.filter(file => !file.mime_type?.startsWith('image/')).length;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const statsCards = [
    {
      title: 'Total Files',
      value: totalFiles.toString(),
      subtitle: 'All files',
      icon: FileText,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Total Size',
      value: formatSize(totalSize),
      subtitle: 'Storage used',
      icon: HardDrive,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Images',
      value: imageFiles.toString(),
      subtitle: 'Image files',
      icon: Image,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Documents',
      value: documentFiles.toString(),
      subtitle: 'Document files',
      icon: Folder,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
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
