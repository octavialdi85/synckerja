
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/features/ui/card';
import { Lightbulb, ChevronLeft, ChevronRight, PlusCircle, Trash2, Edit3, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/features/ui/dropdown-menu';
import { TrainingNotificationBanner } from './TrainingNotificationBanner';
import { useLatestTrainingPrograms } from './useLatestTrainingPrograms';
import { useCurrentUserEmployee } from '@/features/1-login/hooks/useCurrentUserEmployee';
import { Button } from '@/features/ui/button';
import { ModalMotifationForm } from './ModalMotifationForm/ModalMotifationForm';
import { MotivationLikeButton } from './MotivationLikeButton';
import { useMotivations } from './ModalMotifationForm/useMotivations';
import { useToast } from '@/features/ui/use-toast';

export const SectionMotifation = () => {
  const { programs } = useLatestTrainingPrograms();
  const { data: employeeData } = useCurrentUserEmployee();
  const { motivations, isLoading, deleteMotivation, updateMotivation } = useMotivations();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMotivationDialogOpen, setIsMotivationDialogOpen] = useState(false);
  const [editingMotivation, setEditingMotivation] = useState<any>(null);

  // Combine motivations and training programs
  const bannerItems = [
    ...motivations.map(motivation => ({ 
      type: 'quote' as const, 
      content: `${motivation.content} - ${motivation.author_name}`,
      motivation: motivation
    })),
    ...programs.map(program => ({ type: 'training' as const, content: program }))
  ];

  const totalItems = bannerItems.length;

  // Auto-slide every 8 seconds
  useEffect(() => {
    if (isPaused || totalItems <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % totalItems);
    }, 8000);

    return () => clearInterval(interval);
  }, [totalItems, isPaused]);

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev - 1 + totalItems) % totalItems);
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev + 1) % totalItems);
  };

  const handleDeleteMotivation = async (motivationId: string) => {
    try {
      await deleteMotivation(motivationId);
      toast({
        title: "Berhasil!",
        description: "Motivasi berhasil dihapus",
      });
      
      // Adjust current index if needed
      if (currentIndex >= totalItems - 1 && totalItems > 1) {
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Error deleting motivation:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus motivasi",
        variant: "destructive",
      });
    }
  };

  const handleEditMotivation = (motivation: any) => {
    setEditingMotivation(motivation);
    setIsMotivationDialogOpen(true);
  };

  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  };

  const isOwner = async (motivationCreatedBy: string) => {
    const currentUserId = await getCurrentUserId();
    return currentUserId === motivationCreatedBy;
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white min-h-[70px]">
        <CardContent className="p-4 flex items-center justify-center h-full">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-sm">Memuat motivasi...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (totalItems === 0) {
    // Fallback when loading or no data
    return (
      <>
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white min-h-[80px]">
          <CardContent className="p-4 flex items-center space-x-3 h-full">
            <Lightbulb className="h-6 w-6 text-yellow-300" />
            <div className="flex-1">
              <p className="text-xs font-medium">Belum ada motivasi hari ini</p>
              <p className="text-xs text-blue-100">Tulis motivasi pertama Anda!</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 flex items-center gap-1 px-2 py-1 h-8 flex-shrink-0"
              onClick={() => setIsMotivationDialogOpen(true)}
            >
              <PlusCircle className="h-3 w-3" />
              <span className="text-xs">Tulis</span>
            </Button>
          </CardContent>
        </Card>
        
        <ModalMotifationForm
          isOpen={isMotivationDialogOpen}
          onClose={() => setIsMotivationDialogOpen(false)}
          profileName={employeeData?.profile_name}
        />
      </>
    );
  }

  const currentItem = bannerItems[currentIndex];

  return (
    <>
      <div 
        className="relative group min-h-[50px]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="transition-all duration-500 ease-in-out h-full">
          {currentItem.type === 'quote' ? (
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white min-h-[80px]">
              <CardContent className="p-4 flex items-center space-x-3 h-full">
                <Lightbulb className="h-6 w-6 text-yellow-300 flex-shrink-0" />
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-medium leading-relaxed text-white">{currentItem.content}</p>
                  <p className="text-xs text-blue-100 mt-1">Motivasi hari ini</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <MotivationLikeButton motivation={currentItem.motivation} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20 flex items-center gap-1 px-2 py-1 h-8 flex-shrink-0"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem onClick={() => setIsMotivationDialogOpen(true)}>
                      <PlusCircle className="h-3 w-3 mr-2" />
                      Tulis
                    </DropdownMenuItem>
                    {currentItem.motivation && (
                      <>
                        <DropdownMenuItem 
                          onClick={async () => {
                            if (await isOwner(currentItem.motivation.created_by)) {
                              handleEditMotivation(currentItem.motivation);
                            }
                          }}
                        >
                          <Edit3 className="h-3 w-3 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={async () => {
                            if (await isOwner(currentItem.motivation.created_by)) {
                              handleDeleteMotivation(currentItem.motivation.id);
                            }
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          Hapus
                        </DropdownMenuItem>
                      </>
                    )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ) : (
            <TrainingNotificationBanner program={currentItem.content} />
          )}
        </div>

        {/* Navigation buttons - positioned at bottom corners */}
        {totalItems > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 bottom-2 h-7 w-7 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 bottom-2 h-7 w-7 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={goToNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Dots indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
              {bannerItems.map((_, index) => (
                <button
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    index === currentIndex 
                      ? 'bg-white' 
                      : 'bg-white/50 hover:bg-white/70'
                  }`}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          </>
        )}
      </div>
      
      <ModalMotifationForm
        isOpen={isMotivationDialogOpen}
        onClose={() => {
          setIsMotivationDialogOpen(false);
          setEditingMotivation(null);
        }}
        profileName={employeeData?.profile_name}
        editingMotivation={editingMotivation}
      />
    </>
  );
};
