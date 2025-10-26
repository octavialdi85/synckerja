
import React, { useState, useMemo } from 'react';
import { Badge } from '@/features/ui/badge';
import { Separator } from '@/features/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Calendar } from 'lucide-react';
import { HolidayEvent } from '../../types/social-media';
import { ContentPillarTracker } from './ContentPillarTracker';
// import { useOptimizedNationalHolidays } from '@/hooks/useOptimizedAttendanceData'; // Commented out - not available
import { format } from 'date-fns';

const ReminderTab: React.FC = () => {
  // const { data: nationalHolidays = [], isLoading } = useOptimizedNationalHolidays(); // Commented out - hook not available
  const nationalHolidays: HolidayEvent[] = [];
  const isLoading = false;
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Helper function to determine holiday type based on name or country code
  const getHolidayType = (name: string, countryCode: string | null): 'national' | 'international' | 'religious' => {
    const nameLower = name.toLowerCase();
    
    // Religious holidays (Indonesian context)
    if (nameLower.includes('idul') || nameLower.includes('maulid') || nameLower.includes('isra') || 
        nameLower.includes('tahun baru islam') || nameLower.includes('waisak') || 
        nameLower.includes('natal') || nameLower.includes('nyepi') || nameLower.includes('galungan')) {
      return 'religious';
    }
    
    // International holidays
    if (nameLower.includes('internasional') || nameLower.includes('dunia') || nameLower.includes('sedunia') ||
        nameLower.includes('world') || nameLower.includes('international')) {
      return 'international';
    }
    
    // Default to national for country-specific holidays
    if (countryCode === 'ID' || !countryCode) {
      return 'national';
    }
    
    return 'national';
  };

  // Process holidays data
  const { currentMonthHolidays, upcomingHolidays } = useMemo(() => {
    const current: HolidayEvent[] = [];
    const upcoming: HolidayEvent[] = [];

    nationalHolidays.forEach(holiday => {
      const holidayDate = new Date(holiday.date);
      const holidayMonth = holidayDate.getMonth();
      const holidayYear = holidayDate.getFullYear();
      
      const holidayEvent: HolidayEvent = {
        date: holidayDate,
        name: holiday.name,
        type: getHolidayType(holiday.name, holiday.country_code),
        description: format(holidayDate, 'EEEE, dd MMMM yyyy')
      };

      // Current month holidays
      if (holidayMonth === currentMonth && holidayYear === currentYear) {
        current.push(holidayEvent);
      }
      // Upcoming holidays (future months in current year or next year)
      else if ((holidayYear === currentYear && holidayMonth > currentMonth) || 
               (holidayYear > currentYear)) {
        upcoming.push(holidayEvent);
      }
    });

    // Sort by date
    current.sort((a, b) => a.date.getTime() - b.date.getTime());
    upcoming.sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      currentMonthHolidays: current,
      upcomingHolidays: upcoming.slice(0, 5) // Limit to 5 upcoming holidays
    };
  }, [nationalHolidays, currentMonth, currentYear]);

  // Get current month name
  const currentMonthName = format(currentDate, 'MMMM yyyy');

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'national':
        return 'bg-red-100 text-red-800';
      case 'international':
        return 'bg-blue-100 text-blue-800';
      case 'religious':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'national':
        return 'Nasional';
      case 'international':
        return 'International';
      case 'religious':
        return 'Keagamaan';
      default:
        return type;
    }
  };

  return (
    <Card className="h-full flex flex-col seamless-scroll">
      <CardContent className="p-0 h-full flex flex-col seamless-scroll overflow-hidden">
        <Tabs defaultValue="funnel" className="w-full h-full flex flex-col seamless-scroll overflow-hidden">
          {/* Tabs Header - Fixed */}
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0 h-8">
            <TabsTrigger value="funnel" className="text-xs py-1">Funnel</TabsTrigger>
            <TabsTrigger value="pengingat" className="text-xs py-1">Pengingat</TabsTrigger>
          </TabsList>
          
          {/* Scrollable Content Area */}
          <TabsContent value="funnel" className="flex-1 p-2 m-0 min-h-0 overflow-y-auto seamless-scroll">
            <div className="w-full h-full flex flex-col">
              {/* Content Pillar Tracker - Full Width */}
              <div className="w-full flex-1 min-h-0">
                <ContentPillarTracker />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="pengingat" className="flex-1 p-2 space-y-3 m-0 overflow-y-auto seamless-scroll min-h-0">
            {/* Current Month Holidays */}
            <div>
              <h3 className="font-semibold text-sm mb-2">
                Hari Penting Bulan {currentMonthName}
              </h3>
              <div className="space-y-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="text-sm text-gray-500">Memuat hari penting...</div>
                  </div>
                ) : currentMonthHolidays.length === 0 ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="text-sm text-gray-500">Tidak ada hari penting bulan ini</div>
                  </div>
                ) : (
                  currentMonthHolidays.map((holiday, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 border rounded">
                    <div className="text-center min-w-[40px]">
                      <div className="text-lg font-bold text-blue-600">
                        {holiday.date.getDate().toString().padStart(2, '0')}
                      </div>
                      <div className="text-xs text-gray-500 uppercase">
                        {holiday.date.toLocaleDateString('en', {
                          month: 'short'
                        })}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{holiday.name}</h4>
                      <p className="text-xs text-gray-500">{holiday.description}</p>
                      <Badge className={`mt-1 text-xs ${getTypeColor(holiday.type)}`}>
                        {getTypeLabel(holiday.type)}
                      </Badge>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>

            <Separator />

            {/* Upcoming Holidays */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Hari Penting yang Akan Datang</h3>
              <div className="space-y-1">
                {isLoading ? (
                  <div className="flex items-center justify-center py-2">
                    <div className="text-sm text-gray-500">Memuat...</div>
                  </div>
                ) : upcomingHolidays.length === 0 ? (
                  <div className="flex items-center justify-center py-2">
                    <div className="text-sm text-gray-500">Tidak ada hari penting yang akan datang</div>
                  </div>
                ) : (
                  upcomingHolidays.map((holiday, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                    <div className="text-center min-w-[30px]">
                      <div className="text-sm font-bold text-yellow-600">
                        {holiday.date.getDate()}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{holiday.name}</h4>
                      <Badge className={`mt-1 text-xs ${getTypeColor(holiday.type)}`}>
                        {getTypeLabel(holiday.type)}
                      </Badge>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export { ReminderTab };
export default ReminderTab;
