
export const getStatusBadgeColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'in-use':
      return 'bg-green-100 text-green-800';
    case 'available':
      return 'bg-blue-100 text-blue-800';
    case 'maintenance':
      return 'bg-yellow-100 text-yellow-800';
    case 'lost':
      return 'bg-red-100 text-red-800';
    case 'retired':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getConditionBadgeColor = (condition: string) => {
  switch (condition?.toLowerCase()) {
    case 'excellent':
      return 'bg-green-100 text-green-800';
    case 'good':
      return 'bg-blue-100 text-blue-800';
    case 'fair':
      return 'bg-yellow-100 text-yellow-800';
    case 'poor':
      return 'bg-orange-100 text-orange-800';
    case 'damaged':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const formatAssetStatus = (status: string) => {
  return status === 'other' ? 'Lainnya' : 
         status?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
};

export const formatAssetCondition = (condition: string) => {
  return condition === 'other' ? 'Lainnya' : 
         condition?.replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
};

export const formatAssetType = (type: string) => {
  return type === 'other' ? 'Lainnya' : type?.replace('-', ' ');
};
