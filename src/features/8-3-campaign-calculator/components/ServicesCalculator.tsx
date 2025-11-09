
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';

const ServicesCalculator = () => {
  const [budget, setBudget] = useState<string>('200000000');
  const [cpm, setCpm] = useState<string>('820852');
  const [ctrLink, setCtrLink] = useState<string>('7.21');
  const [adsClickToVisit, setAdsClickToVisit] = useState<string>('66.86');
  const [whatsappClick, setWhatsappClick] = useState<string>('20.05');
  const [prospectToClient, setProspectToClient] = useState<string>('2.85');
  const [reservation, setReservation] = useState<string>('100');
  const [crossSelling, setCrossSelling] = useState<string>('100');
  
  const [results, setResults] = useState({
    impressions: 0,
    adClicks: 0,
    websiteVisitors: 0,
    leads: 0,
    leadsToPatients: 0,
    realPatients: 0,
    costPerClick: 0,
    costPerLead: 0,
    costPerClient: 0,
    estimatedClients: 0
  });

  useEffect(() => {
    calculateResults();
  }, [budget, cpm, ctrLink, adsClickToVisit, whatsappClick, prospectToClient, reservation, crossSelling]);

  const calculateResults = () => {
    const budgetNum = parseFloat(budget.replace(/[^\d]/g, '')) || 0;
    const cpmNum = parseFloat(cpm.replace(/[^\d]/g, '')) || 1;
    const ctrLinkNum = parseFloat(ctrLink) || 0;
    const adsClickToVisitNum = parseFloat(adsClickToVisit) || 0;
    const whatsappClickNum = parseFloat(whatsappClick) || 0;
    const prospectToClientNum = parseFloat(prospectToClient) || 0;
    const reservationNum = parseFloat(reservation) || 0;
    const crossSellingNum = parseFloat(crossSelling) || 0;

    // Calculate impressions
    const impressions = Math.floor((budgetNum / cpmNum) * 1000);
    
    // Calculate ad clicks
    const adClicks = Math.floor(impressions * (ctrLinkNum / 100));
    
    // Calculate website visitors
    const websiteVisitors = Math.floor(adClicks * (adsClickToVisitNum / 100));
    
    // Calculate leads (WhatsApp clicks)
    const leads = Math.floor(websiteVisitors * (whatsappClickNum / 100));
    
    // Calculate leads to patients
    const leadsToPatients = Math.floor(leads * (prospectToClientNum / 100));
    
    // Calculate real patients with reservation
    const realPatients = Math.floor(leadsToPatients * (reservationNum / 100));
    
    // Calculate final estimated clients with cross-selling
    const estimatedClients = Math.floor(realPatients * (crossSellingNum / 100));
    
    // Calculate costs
    const costPerClick = adClicks > 0 ? budgetNum / adClicks : 0;
    const costPerLead = leads > 0 ? budgetNum / leads : 0;
    const costPerClient = estimatedClients > 0 ? budgetNum / estimatedClients : 0;

    setResults({
      impressions,
      adClicks,
      websiteVisitors,
      leads,
      leadsToPatients,
      realPatients,
      costPerClick,
      costPerLead,
      costPerClient,
      estimatedClients
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header with Estimated Result */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Campaign Result Estimation</h2>
        <div className="bg-white border-2 border-dashed border-gray-300 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Client</h3>
          <div className="text-6xl font-bold">{results.estimatedClients}</div>
        </div>
      </div>

      {/* Cost Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-200 p-4 rounded-lg text-center">
          <div className="text-sm font-medium mb-2">Cost Per Click</div>
          <div className="text-lg font-bold">{formatCurrency(results.costPerClick)}</div>
        </div>
        <div className="bg-yellow-400 p-4 rounded-lg text-center">
          <div className="text-sm font-medium mb-2">Cost Per Leads</div>
          <div className="text-lg font-bold">{formatCurrency(results.costPerLead)}</div>
        </div>
        <div className="bg-white border p-4 rounded-lg text-center">
          <div className="text-sm font-medium mb-2">Cost Per Client</div>
          <div className="text-lg font-bold">{formatCurrency(results.costPerClient)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI Section */}
        <Card className="bg-blue-50">
          <CardHeader>
            <CardTitle>KPI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="budget">Budget (Rp)</Label>
              <Input
                id="budget"
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cpm">CPM (Rp)</Label>
              <Input
                id="cpm"
                type="text"
                value={cpm}
                onChange={(e) => setCpm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="ctr">CTR Link (%)</Label>
              <Input
                id="ctr"
                type="text"
                value={ctrLink}
                onChange={(e) => setCtrLink(e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* KPI YANG HARUS TERCAPAI Section */}
        <Card className="bg-red-50">
          <CardHeader>
            <CardTitle>KPI YANG HARUS TERCAPAI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="adsClick">% Ads Click To Visit Page</Label>
              <Input
                id="adsClick"
                type="text"
                value={adsClickToVisit}
                onChange={(e) => setAdsClickToVisit(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="whatsapp">Visitor yang Klik WhatsApp</Label>
              <Input
                id="whatsapp"
                type="text"
                value={whatsappClick}
                onChange={(e) => setWhatsappClick(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="prospect">Prospek to Client</Label>
              <Input
                id="prospect"
                type="text"
                value={prospectToClient}
                onChange={(e) => setProspectToClient(e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Reservasi Section */}
        <Card className="bg-green-50">
          <CardHeader>
            <CardTitle>Reservasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                type="text"
                value={reservation}
                onChange={(e) => setReservation(e.target.value)}
                className="text-center font-bold"
              />
            </div>
            <div className="mt-6">
              <Label>Kontribusi Dokter menaikan jumlah pasien Cross Selling/ Upselling</Label>
              <Input
                type="text"
                value={crossSelling}
                onChange={(e) => setCrossSelling(e.target.value)}
                className="mt-2 text-center font-bold"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      <Card>
        <CardHeader>
          <CardTitle>Result:</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="text-yellow-500 mr-2">💡</span>
                <span>Ads will be shown {formatNumber(results.impressions)} times from running ads currently</span>
              </div>
              <div className="flex items-center">
                <span className="text-yellow-500 mr-2">💡</span>
                <span>With the number of people who click on ads as many as {formatNumber(results.adClicks)} People</span>
              </div>
              <div className="flex items-center">
                <span className="text-yellow-500 mr-2">💡</span>
                <span>and website visitors as many as {formatNumber(results.websiteVisitors)} People/ visitors</span>
              </div>
              <div className="flex items-center">
                <span className="text-yellow-500 mr-2">💡</span>
                <span>Then visitors who contact consultants are around {formatNumber(results.leads)} People</span>
              </div>
              <div className="flex items-center">
                <span className="text-yellow-500 mr-2">💡</span>
                <span>Number of Visitors who become patients as many as {formatNumber(results.leadsToPatients)} People</span>
              </div>
              <div className="flex items-center">
                <span className="text-yellow-500 mr-2">💡</span>
                <span>And the estimated Real patients weigh around {formatNumber(results.realPatients)} People if there are no budget constraints</span>
              </div>
            </div>
            
            <div className="space-y-2 border-l pl-6">
              <div className="flex justify-between items-center">
                <span className="text-sm">👈</span>
                <div className="bg-gray-100 px-3 py-1 rounded text-sm font-medium">
                  {formatNumber(results.impressions)} {'>'}  IMPRESSION
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">👈</span>
                <div className="bg-gray-100 px-3 py-1 rounded text-sm font-medium">
                  {formatNumber(results.adClicks)} {'>'} AD CLICKS
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">👈</span>
                <div className="bg-gray-100 px-3 py-1 rounded text-sm font-medium">
                  {formatNumber(results.websiteVisitors)} {'>'} WEBSITE VISITOR
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">👈</span>
                <div className="bg-gray-100 px-3 py-1 rounded text-sm font-medium">
                  {formatNumber(results.leads)} {'>'} LEADS
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">👈</span>
                <div className="bg-gray-100 px-3 py-1 rounded text-sm font-medium">
                  {formatNumber(results.leadsToPatients)} {'>'} LEADS TO PATIENTS
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">👈</span>
                <div className="bg-gray-100 px-3 py-1 rounded text-sm font-medium">
                  {formatNumber(results.realPatients)} {'>'} REAL PATIENTS
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="bg-green-50">
        <CardHeader>
          <CardTitle>Repetitive task / Work Plan to be implemented:</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-start">
              <span className="text-yellow-500 mr-2 mt-1">💡</span>
              <span>Target market optimization (Audience) & Explore new Audiences because current CPM is too high</span>
            </div>
            <div className="flex items-start">
              <span className="text-yellow-500 mr-2 mt-1">💡</span>
              <span>Website Speed Optimization (LP) and also Target Audience Optimization.</span>
            </div>
            <div className="flex items-start">
              <span className="text-yellow-500 mr-2 mt-1">💡</span>
              <span>Coordination with the Consultant Team to improve the way to respond to chats and follow up patients</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServicesCalculator;
