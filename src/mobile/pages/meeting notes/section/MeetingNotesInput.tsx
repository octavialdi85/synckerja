import { useState, KeyboardEvent } from 'react';
import { User, FileText, Plus } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Textarea } from '@/features/ui/textarea';
import { Label } from '@/features/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/ui/select';
import { useMeetingNotes } from '@/features/8-1-meeting-notes/MeetingNotesContext';
import { useAvailableEmployees } from '@/features/share/hooks/useAvailableEmployees';

const MeetingNotesInput = () => {
  const [formData, setFormData] = useState({
    discussion_point: '',
    request_by: '',
    status: 'Not Started'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addMeetingPoint } = useMeetingNotes();
  const { data: employees = [], isLoading: isLoadingEmployees } = useAvailableEmployees();

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.discussion_point.trim()) return;

    setIsSubmitting(true);
    
    try {
      console.log('Submitting meeting point:', formData); // Debug log
      
      await addMeetingPoint({
        discussion_point: formData.discussion_point,
        request_by: formData.request_by,
        status: formData.status,
        meeting_date: new Date().toISOString().split('T')[0] // Auto set today's date
      });
      
      // Reset form but keep request_by for convenience
      setFormData({
        discussion_point: '',
        request_by: formData.request_by, // Keep selected employee
        status: 'Not Started'
      });
    } catch (error) {
      console.error('Error submitting meeting point:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('Enter pressed, submitting form'); // Debug log
      handleSubmit();
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-2.5">
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Header */}
        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-600" />
          Quick Add Meeting Point
        </h3>

        {/* Mobile: Stack vertically, Desktop: Horizontal layout */}
        <div className="flex flex-col md:flex-row gap-2 items-start">
          {/* Discussion Point - Full width on mobile */}
          <div className="flex-1 w-full flex flex-col">
            <Textarea
              placeholder="Enter discussion point..."
              value={formData.discussion_point}
              onChange={(e) => handleInputChange('discussion_point', e.target.value)}
              onKeyPress={handleKeyPress}
              className="min-h-[60px] max-h-[60px] md:min-h-[60px] md:max-h-[60px] resize-none text-sm w-full"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Enter to add, Shift+Enter for new line</p>
          </div>

          {/* Request By and Status - Stack on mobile, side by side on desktop */}
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            {/* Request By */}
            <div className="w-full md:w-48 flex flex-col">
              <Select value={formData.request_by} onValueChange={(value) => handleInputChange('request_by', value)}>
                <SelectTrigger className="h-[60px] text-sm w-full">
                  <SelectValue placeholder={isLoadingEmployees ? "Loading..." : "Select employee"} />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-md z-50">
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.full_name}>
                      {employee.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="h-5"></div> {/* Spacer untuk alignment dengan help text */}
            </div>

            {/* Status */}
            <div className="w-full md:w-32 flex flex-col">
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger className="h-[60px] text-sm w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-md z-50">
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="On Going">On Going</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Presented">Presented</SelectItem>
                </SelectContent>
              </Select>
              <div className="h-5"></div> {/* Spacer untuk alignment dengan help text */}
            </div>
          </div>

          {/* Add Button - Full width on mobile */}
          <div className="flex flex-col w-full md:w-auto">
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white h-[60px] px-6 w-full md:w-auto"
              disabled={!formData.discussion_point.trim() || isSubmitting}
            >
              Add
            </Button>
            <div className="h-5"></div> {/* Spacer untuk alignment */}
          </div>
        </div>
      </form>
    </div>
  );
};

export default MeetingNotesInput;

