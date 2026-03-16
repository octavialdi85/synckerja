import React from 'react';
import { Shield, Calendar, Sparkles, Image, Scan } from 'lucide-react';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface SettingsSidebarProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
}

const settingsSections = [
  {
    id: 'approval-access',
    title: 'Approval Access Configuration',
    description: 'Configure who can perform approvals in different columns',
    icon: Shield,
    status: 'active'
  },
  {
    id: 'scheduling',
    title: 'Content Scheduling',
    description: 'Set up posting schedules and automation',
    icon: Calendar,
    status: 'active'
  },
  {
    id: 'script-ai',
    title: 'Script AI Generator',
    description: 'Google Gemini API & rate limit',
    icon: Sparkles,
    status: 'active'
  },
  {
    id: 'asset-digital',
    title: 'Digital Assets',
    description: 'Manage digital assets and media library',
    icon: Image,
    status: 'active'
  },
  {
    id: 'detect-from-image',
    titleKey: 'detectFromImage.sidebarTitle',
    descriptionKey: 'detectFromImage.sidebarDescription',
    icon: Scan,
    status: 'active'
  }
];

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  activeSection,
  onSectionChange
}) => {
  const { t } = useAppTranslation();
  return (
    <div className="space-y-2">
      {settingsSections.map((section) => {
        const IconComponent = section.icon;
        const isActive = activeSection === section.id;
        const title = 'titleKey' in section && section.titleKey ? t(section.titleKey, 'Detect from Image') : (section as { title?: string }).title ?? '';
        const description = 'descriptionKey' in section && section.descriptionKey ? t(section.descriptionKey, 'Analyze image: scene or character') : (section as { description?: string }).description ?? '';
        
        return (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={`w-full text-left p-3 rounded-lg transition-all duration-200 group ${
              isActive 
                ? 'bg-blue-50 border-2 border-blue-200 shadow-sm' 
                : 'bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg flex-shrink-0 ${
                isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
              }`}>
                <IconComponent className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`text-sm font-medium truncate ${
                    isActive ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {title}
                  </h3>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-1 ${
                    section.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {section.status}
                  </span>
                </div>
                <p className={`text-xs leading-tight ${
                  isActive ? 'text-blue-700' : 'text-gray-600'
                }`}>
                  {description}
                </p>
              </div>
            </div>
          </button>
        );
      })}

      {/* Real-time indicator */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-blue-800">Real-time Active</span>
        </div>
        <p className="text-xs text-blue-700 mt-1">
          Data otomatis terupdate saat ada perubahan
        </p>
      </div>
    </div>
  );
};
