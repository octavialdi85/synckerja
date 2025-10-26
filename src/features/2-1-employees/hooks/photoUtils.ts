
export const getPhotoUrl = (photoPath: string | null | undefined): string | null => {
  console.log('📸 getPhotoUrl called with:', photoPath);
  
  if (!photoPath) {
    console.log('❌ getPhotoUrl: No photo path provided');
    return null;
  }
  
  // Handle already full URLs
  if (photoPath.startsWith('http')) {
    console.log('✅ getPhotoUrl: Already full URL:', photoPath);
    return photoPath;
  }
  
  // Priority 1: Check if it's from employee-profiles bucket (newer format with user_id path)
  if (photoPath.includes('/') && !photoPath.startsWith('employee-photo/')) {
    const url = `https://najgdwffjhnqlogfrlqa.supabase.co/storage/v1/object/public/employee-profiles/${photoPath}`;
    console.log('✅ getPhotoUrl: Using employee-profiles bucket:', url);
    return url;
  }
  
  // Priority 2: Check if it's from employee-photo folder in employee-documents bucket
  if (photoPath.startsWith('employee-photo/')) {
    const url = `https://najgdwffjhnqlogfrlqa.supabase.co/storage/v1/object/public/employee-documents/${photoPath}`;
    console.log('✅ getPhotoUrl: Using employee-documents/employee-photo:', url);
    return url;
  }
  
  // Priority 3: Try employee-profiles bucket for simple filename (fallback)
  const url = `https://najgdwffjhnqlogfrlqa.supabase.co/storage/v1/object/public/employee-profiles/${photoPath}`;
  console.log('✅ getPhotoUrl: Fallback to employee-profiles:', url);
  return url;
};

export const getInitials = (name: string): string => {
  if (!name) return "U";
  return name
    .split(" ")
    .map(word => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
};
