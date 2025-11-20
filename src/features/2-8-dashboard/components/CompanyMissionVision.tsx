
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';

interface CompanyMissionVisionProps {
  mission?: string;
  vision?: string;
  aboutUs?: string;
}

export const CompanyMissionVision = ({ mission, vision, aboutUs }: CompanyMissionVisionProps) => {
  return (
    <div className="space-y-2 sm:space-y-3 min-w-0">
      {/* About Us Section */}
      <Card className="min-w-0">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg font-semibold">About Us</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-gray-700 leading-relaxed text-xs sm:text-sm break-words">
            {aboutUs || 'No about us information defined.'}
          </p>
        </CardContent>
      </Card>

      {/* Mission & Vision */}
      <Card className="min-w-0">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg font-semibold">Mission & Vision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 pt-0">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-1 sm:mb-2">Mission</h3>
            <p className="text-gray-700 leading-relaxed text-xs sm:text-sm break-words">
              {mission || 'No mission statement defined.'}
            </p>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-1 sm:mb-2">Vision</h3>
            <p className="text-gray-700 leading-relaxed text-xs sm:text-sm break-words">
              {vision || 'No vision statement defined.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
