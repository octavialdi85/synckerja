
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { useKOLAnalytics } from '../hooks/useKOLAnalytics';
import { useKOLProfiles } from '../hooks/useKOLProfiles';
import { useKOLCampaigns } from '../hooks/useKOLCampaigns';
import { useOptimizedKOLPerformance } from '../hooks/useOptimizedKOLPerformance';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Target, DollarSign, Eye, Heart, Award } from 'lucide-react';
import { Badge } from '@/features/ui/badge';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const EnhancedKOLDashboard = () => {
  const { data: analytics, isLoading: analyticsLoading } = useKOLAnalytics();
  const { metrics, loading: profilesLoading } = useKOLProfiles();
  const { campaigns, isLoading: campaignsLoading } = useKOLCampaigns();
  const { performanceData, isLoading: performanceLoading } = useOptimizedKOLPerformance();

  if (analyticsLoading || profilesLoading || campaignsLoading || performanceLoading) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;
  const completedCampaigns = campaigns?.filter(c => c.status === 'completed').length || 0;

  return (
    <div className="space-y-2">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total KOLs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active influencers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalReach ? (analytics.totalReach / 1000000).toFixed(1) + 'M' : '0'}
            </div>
            <p className="text-xs text-muted-foreground">Total audience reached</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.avgEngagementRate ? analytics.avgEngagementRate.toFixed(1) + '%' : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">Engagement rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics?.totalRevenue ? (analytics.totalRevenue / 1000).toFixed(1) + 'K' : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              ROI: {analytics?.roi ? analytics.roi.toFixed(1) + '%' : '0%'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Campaigns</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCampaigns}</div>
            <p className="text-xs text-muted-foreground">Successfully finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalConversions || 0}</div>
            <p className="text-xs text-muted-foreground">From all campaigns</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Top Performing KOLs */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing KOLs</CardTitle>
            <CardDescription>Based on total reach and engagement</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.topPerformingKOLs && analytics.topPerformingKOLs.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.topPerformingKOLs}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalReach" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No performance data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Distribution</CardTitle>
            <CardDescription>KOL presence across platforms</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.platformBreakdown && analytics.platformBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.platformBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({platform, followers}) => `${platform}: ${(followers/1000).toFixed(0)}K`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="followers"
                  >
                    {analytics.platformBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No platform data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KOL Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>KOL Performance Overview</CardTitle>
          <CardDescription>Detailed performance metrics for each KOL</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics?.topPerformingKOLs && analytics.topPerformingKOLs.length > 0 ? (
            <div className="space-y-4">
              {analytics.topPerformingKOLs.map((kol) => (
                <div key={kol.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h4 className="font-semibold">{kol.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Reach: {(kol.totalReach / 1000).toFixed(0)}K
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline">
                      {kol.engagementRate.toFixed(1)}% Engagement
                    </Badge>
                    <Badge variant="outline">
                      {kol.conversions} Conversions
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No KOL performance data available</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add KOLs and track their performance to see analytics here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedKOLDashboard;
