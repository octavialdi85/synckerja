import React from 'react';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Card } from '@/features/ui/card';
import { Badge } from '@/features/ui/badge';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface DayDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  plansByDate: { [key: string]: any[] };
  onAddContent: (date: Date) => void;
  selectedPlan?: any | null; // Optional: if provided, show only this plan
}

export const DayDetailsDialog: React.FC<DayDetailsDialogProps> = ({
  open,
  onOpenChange,
  selectedDate,
  plansByDate,
  onAddContent,
  selectedPlan = null
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="sticky top-0 bg-background z-10 pb-4 border-b">
          <DialogTitle>
            Content Plans - {selectedDate && format(selectedDate, 'dd MMMM yyyy', { locale: id })}
          </DialogTitle>
          
          {/* Sticky Add Content Button */}
          {selectedDate && (
            <div className="flex justify-between items-center pt-2">
              <h4 className="font-medium">
                {selectedPlan ? '1 Content Plan' : `${plansByDate[format(selectedDate, 'yyyy-MM-dd')]?.length || 0} Content Plans`}
              </h4>
              <Button 
                onClick={() => onAddContent(selectedDate)}
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Content
              </Button>
            </div>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 pt-4">
          {selectedDate && (
            <>                
              {(() => {
                // If selectedPlan is provided, show only that plan, otherwise show all plans for the day
                const plansToShow = selectedPlan 
                  ? [selectedPlan]
                  : plansByDate[format(selectedDate, 'yyyy-MM-dd')] || [];
                
                return plansToShow.length > 0 ? (
                  <div className="space-y-3">
                    {plansToShow.map((plan) => (
                    <Card key={plan.id} className="p-3">
                      <div className="space-y-2">
                        {/* Service - Sub Service - Pillar */}
                        <div className="text-sm text-muted-foreground">
                          {[
                            plan.service?.name,
                            plan.sub_service?.name,
                            plan.content_pillar?.name
                          ].filter(Boolean).join(' - ') || 'No Service'}
                        </div>
                        
                        {/* Title */}
                        <h5 className="font-medium text-lg">{plan.title || 'Untitled Content'}</h5>
                        
                        {/* PIC */}
                        <div className="text-sm text-muted-foreground">
                          <strong>PIC:</strong> {plan.pic?.full_name || 'Unassigned'}
                        </div>
                        
                        {/* Brief */}
                        <p className="text-sm text-muted-foreground">{plan.brief || 'No description'}</p>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex gap-2">
                            {plan.content_type?.name && (
                              <Badge variant="secondary" className="text-xs">
                                {plan.content_type.name}
                              </Badge>
                            )}
                            {plan.content_pillar?.name && (
                              <Badge variant="outline" className="text-xs">
                                {plan.content_pillar.name}
                              </Badge>
                            )}
                          </div>
                          <Badge 
                            variant={plan.approved || plan.done ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {plan.approved || plan.done ? 'Completed' : 'In Progress'}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No content plans for this day</p>
                    <p className="text-sm">Click "Add Content" to create a new plan</p>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
