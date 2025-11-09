import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

const NotificationSettings = () => {
  const { t } = useAppTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">
          {t('settings.notifications.heading', 'Notification Preferences')}
        </h2>
        <p className="text-muted-foreground">
          {t('settings.notifications.subtitle', 'Configure how you receive notifications')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.notifications.cardTitle', 'Notification Settings')}</CardTitle>
          <CardDescription>
            {t('settings.notifications.cardDescription', 'Manage your notification preferences')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">
            {t('settings.notifications.placeholder', 'Notification settings will be available here...')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
