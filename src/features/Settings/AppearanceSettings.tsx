import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';

const AppearanceSettings = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme & Display</CardTitle>
          <CardDescription>Customize your application appearance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">
            Appearance settings will be available here...
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppearanceSettings;
