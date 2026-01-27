import React from 'react';
import { FileText, TrendingUp, Heart, Calendar } from 'lucide-react';
import { useKOLContentPosts } from '@/hooks/organized/utils';

export const KOLContentPostMetricsCards = () => {
  const { contentPosts, isLoading } = useKOLContentPosts();
  
  // Ensure contentPosts is always an array
  const safeContentPosts = Array.isArray(contentPosts) ? contentPosts : [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const totalPosts = safeContentPosts.length;
  const postedPosts = safeContentPosts.filter(post => post.status === 'posted').length;
  const draftPosts = safeContentPosts.filter(post => post.status === 'draft').length;
  const avgEngagement = safeContentPosts.length > 0 
    ? safeContentPosts.reduce((sum, post) => sum + (post.performance?.engagement_rate || 0), 0) / safeContentPosts.length 
    : 0;
  const thisMonthPosts = safeContentPosts.filter(post => {
    const postDate = new Date(post.created_at);
    const now = new Date();
    return postDate.getMonth() === now.getMonth() && postDate.getFullYear() === now.getFullYear();
  }).length;

  const statsCards = [
    {
      title: 'Total Content',
      value: totalPosts.toString(),
      subtitle: `${postedPosts} posted`,
      icon: FileText,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Posted Content',
      value: postedPosts.toString(),
      subtitle: `${draftPosts} in draft`,
      icon: TrendingUp,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Avg Engagement',
      value: `${avgEngagement.toFixed(1)}%`,
      subtitle: 'Engagement rate',
      icon: Heart,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      title: 'This Month',
      value: thisMonthPosts.toString(),
      subtitle: 'Content posts',
      icon: Calendar,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
      {statsCards.map((stat, index) => (
        <div key={index} className={`${stat.bgColor} ${stat.borderColor} border rounded-md p-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">{stat.title}</h3>
            <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-600">{stat.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
