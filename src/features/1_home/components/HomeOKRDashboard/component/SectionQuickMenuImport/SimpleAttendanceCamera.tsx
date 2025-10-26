
import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/features/ui/button';
import { Camera, MapPin, CheckCircle } from 'lucide-react';
import { useSimpleAttendance } from '../../../../hooks/useSimpleAttendance';
import { FaceRegistrationDialog } from '../../../../components/FaceRegistrationDialog';
import { LateReasonModal } from '../../../../components/LateReasonModal';

export const SimpleAttendanceCamera = ({ onAttendanceUpdate, onCameraStateChange }: { onAttendanceUpdate?: () => void; onCameraStateChange?: (isActive: boolean) => void }) => {
  const webcamRef = useRef<Webcam>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [actionType, setActionType] = useState<'checkin' | 'checkout' | null>(null);
  const [showFaceRegistration, setShowFaceRegistration] = useState(false);
  const [capturedImageForRegistration, setCapturedImageForRegistration] = useState<string>('');
  
  const { 
    handleSimpleAttendance, 
    loading, 
    hasCheckedIn, 
    hasCheckedOut, 
    lastCheckIn,
    lastCheckOut,
    showLateReasonModal,
    lateMinutes,
    saveLateReason,
    closeLateReasonModal
  } = useSimpleAttendance();

  const handleClockAction = useCallback(async (type: 'checkin' | 'checkout') => {
    setActionType(type);
    setShowCamera(true);
    onCameraStateChange?.(true);
  }, [onCameraStateChange]);

  const captureAndSubmit = useCallback(async () => {
    if (!webcamRef.current || !actionType) return;

    setIsCapturing(true);
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        try {
          await handleSimpleAttendance(actionType, imageSrc);
          setShowCamera(false);
          setActionType(null);
          onCameraStateChange?.(false);
          onAttendanceUpdate?.();
        } catch (error) {
          // Check if error is related to face registration
          if (error instanceof Error && error.message.includes('Wajah tidak terdaftar')) {
            setCapturedImageForRegistration(imageSrc);
            setShowFaceRegistration(true);
          } else {
            throw error; // Re-throw other errors
          }
        }
      }
    } catch (error) {
      console.error('Clock action failed:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [actionType, handleSimpleAttendance, onAttendanceUpdate]);

  const handleFaceRegistrationSuccess = useCallback(() => {
    setShowFaceRegistration(false);
    setCapturedImageForRegistration('');
    // Retry attendance after successful face registration
    if (capturedImageForRegistration && actionType) {
      handleSimpleAttendance(actionType, capturedImageForRegistration)
        .then(() => {
          setShowCamera(false);
          setActionType(null);
          onCameraStateChange?.(false);
          onAttendanceUpdate?.();
        })
        .catch((error) => {
          console.error('Retry attendance failed:', error);
        });
    }
  }, [capturedImageForRegistration, actionType, handleSimpleAttendance, onAttendanceUpdate]);

  const cancelCapture = useCallback(() => {
    setShowCamera(false);
    setActionType(null);
    onCameraStateChange?.(false);
  }, [onCameraStateChange]);

  if (showCamera) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-blue-600 mb-4">
          <Camera className="h-5 w-5" />
          <span className="text-sm font-semibold">
            {actionType === 'checkin' ? 'Clock In' : 'Clock Out'} - Ambil Foto
          </span>
        </div>
        
        <div className="relative">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            className="w-full rounded-lg"
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={captureAndSubmit}
            disabled={isCapturing}
            className="flex-1"
          >
            {isCapturing ? 'Processing...' : `Confirm ${actionType === 'checkin' ? 'Clock In' : 'Clock Out'}`}
          </Button>
          <Button 
            variant="outline" 
            onClick={cancelCapture}
            disabled={isCapturing}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-gray-600 mb-3">
        <MapPin className="h-5 w-5" />
        <span className="text-xs font-medium">Attendance System</span>
      </div>

      {/* Success banners */}
      {hasCheckedIn && lastCheckIn && (
        <div className="bg-muted border border-border rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 text-foreground">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-semibold">Clock In Berhasil!</span>
          </div>
          <p className="text-green-700 text-xs mt-1">
            Waktu: {new Date(lastCheckIn).toLocaleTimeString('id-ID')}
          </p>
        </div>
      )}

      {hasCheckedOut && lastCheckOut && (
        <div className="bg-muted border border-border rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 text-foreground">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-semibold">Clock Out Berhasil!</span>
          </div>
          <p className="text-blue-700 text-xs mt-1">
            Waktu: {new Date(lastCheckOut).toLocaleTimeString('id-ID')}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button 
          onClick={() => handleClockAction('checkin')}
          disabled={loading || hasCheckedIn}
          className={`flex items-center gap-2 text-sm font-semibold ${hasCheckedIn ? 'bg-gray-400 cursor-not-allowed' : ''}`}
        >
          <Camera className="h-4 w-4" />
          Clock In
        </Button>
        
        <Button 
          onClick={() => handleClockAction('checkout')}
          disabled={loading || !hasCheckedIn || hasCheckedOut}
          variant="outline"
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <Camera className="h-4 w-4" />
          Clock Out
        </Button>
      </div>

      {loading && (
        <div className="text-center text-gray-600 text-sm">
          Processing attendance...
        </div>
      )}

      <FaceRegistrationDialog
        isOpen={showFaceRegistration}
        onClose={() => {
          setShowFaceRegistration(false);
          setCapturedImageForRegistration('');
        }}
        onSuccess={handleFaceRegistrationSuccess}
        capturedImage={capturedImageForRegistration}
      />

      <LateReasonModal
        isOpen={showLateReasonModal}
        onClose={closeLateReasonModal}
        onSubmit={saveLateReason}
        lateMinutes={lateMinutes}
      />
    </div>
  );
};
