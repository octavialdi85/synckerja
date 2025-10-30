import { Button } from "@/mobile/components/ui/button";

interface AttendanceActionsProps {
  onClockIn: () => void;
  onClockOut: () => void;
}

export const AttendanceActions = ({ onClockIn, onClockOut }: AttendanceActionsProps) => {
  return (
    <div className="px-4 py-3">
      <div className="grid grid-cols-2 gap-3">
        <Button 
          className="h-14 text-sm bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          onClick={onClockIn}
        >
          Clock In
        </Button>
        <Button 
          variant="outline" 
          className="h-14 text-sm border-border hover:bg-muted font-semibold"
          onClick={onClockOut}
        >
          Clock Out
        </Button>
      </div>
    </div>
  );
};