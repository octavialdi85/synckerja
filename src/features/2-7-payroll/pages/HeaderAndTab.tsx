import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

const CALCULATIONS_ROUTE = '/payroll/calculations';

export const HeaderAndTab = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isCalculations = location.pathname.startsWith(CALCULATIONS_ROUTE);

  return (
    <div className="px-1 py-3">
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">
          {t('sidebar.humanResources.payroll.title')}
        </h1>
        <p className="text-xs text-gray-600">
          {t('sidebar.humanResources.payroll.description')}
        </p>
      </div>

      <div className="-mb-3">
        <nav className="flex space-x-6">
          <div
            role="tab"
            aria-selected={isCalculations}
            onClick={() => navigate(CALCULATIONS_ROUTE)}
            className={`flex items-center space-x-1.5 py-1.5 px-1 border-b-2 font-medium text-sm cursor-pointer transition-colors ${
              isCalculations
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          >
            <FileText className="w-4 h-4" aria-hidden />
            <span>{t('payroll.page.tabCalculations')}</span>
          </div>
        </nav>
      </div>
    </div>
  );
};

HeaderAndTab.displayName = 'HeaderAndTab';
