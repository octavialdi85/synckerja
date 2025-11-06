import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';

const NotificationSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Notification Preferences</h2>
        <p className="text-muted-foreground">
          Configure how you receive notifications
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>Manage your notification preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">
            Notification settings will be available here...
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
