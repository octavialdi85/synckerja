import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

const AppearanceSettings = () => {
  const { t } = useAppTranslation();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.appearance.card.title', 'Theme & Display')}</CardTitle>
          <CardDescription>
            {t('settings.appearance.card.description', 'Customize your application appearance')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">
            {t('settings.appearance.placeholder', 'Appearance settings will be available here...')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppearanceSettings;
