
import { Card } from '@/components/ui/card';
import { FileText, Image, Folder, Users } from 'lucide-react';
import { useCompanyFiles } from './useCompanyFiles';

export const CompanyFilesMetricsCards = () => {
  const { files } = useCompanyFiles();

  const totalFiles = files.length;
  const totalSize = files.reduce((acc, file) => acc + file.file_size, 0);
  const imageFiles = files.filter(file => file.mime_type.startsWith('image/')).length;
  const documentFiles = files.filter(file => !file.mime_type.startsWith('image/')).length;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const metrics = [
    {
      title: 'Total Files',
      value: totalFiles.toString(),
      icon: FileText,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Total Size',
      value: formatSize(totalSize),
      icon: Folder,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Images',
      value: imageFiles.toString(),
      icon: Image,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: 'Documents',
      value: documentFiles.toString(),
      icon: FileText,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
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
                <div className="text-xl font-bold text-gray-900">{metric.value}</div>
                <div className="text-xs text-gray-500">
                  Files
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
