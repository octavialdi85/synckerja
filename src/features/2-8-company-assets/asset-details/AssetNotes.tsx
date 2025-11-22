
import React from 'react';

interface AssetNotesProps {
  notes?: string;
}

export const AssetNotes = ({ notes }: AssetNotesProps) => {
  if (!notes) return null;

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">Notes</label>
      <p className="text-sm bg-gray-50 p-2 rounded-lg">{notes}</p>
    </div>
  );
};
