import React, { useState, useMemo, useEffect } from 'react';
import { LeadsFilters, LeadsFilters as LeadsFiltersType } from './LeadsFilters';
import { LeadsMetricsCards } from './LeadsMetricsCards';
import LeadsTableNew from './LeadsTableNew';
import { LeadsInsights } from './LeadsInsights';
import { NewLeadForm } from './NewLeadForm';
import { LeadsTableFooter } from './LeadsTableFooter';
import { LeadsSidebarFooter } from './LeadsSidebarFooter';
import { useLeads } from '@/hooks/organized/sales';
import { useAvailableEmployees } from '@/features/share/hooks/useAvailableEmployees';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/features/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { generateLeadsPDF } from './LeadsPDFGenerator';
import { LoadingDots } from '@/components/LoadingDots';

export const ConsultantsPageContent = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [filters, setFilters] = useState<LeadsFiltersType>({
    dataCompleteness: 'all',
    services: 'all',
    category: 'all',
    assignee: 'all',
    fuPriority: 'all',
    status: 'all',
    source: 'all',
    dateRange: null,
    search: ''
  });
  const { leads, loading, createLead, updateLead, deleteLead, refetch } = useLeads({ scope: 'all' });
  const { data: employees = [] } = useAvailableEmployees();
  const { organizationId } = useCurrentOrg();

  const handleNewLeadClick = () => {
    setIsCreateDialogOpen(true);
  };

  const handleCreateLead = async (leadData: any) => {
    setIsSubmitting(true);
    try {
      await createLead(leadData);
      setIsCreateDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // State to manage client profile statuses and data
  const [clientStatuses, setClientStatuses] = useState<Record<string, 'full' | 'partial' | 'empty'>>({});
  const [clientProfiles, setClientProfiles] = useState<Record<string, any>>({});

  // Fetch client profile statuses (leads + WhatsApp conversations)
  useEffect(() => {
    const fetchStatuses = async () => {
      if (leads.length === 0) return;

      const statusMap: Record<string, 'full' | 'partial' | 'empty'> = {};
      const profileMap: Record<string, any> = {};

      for (const lead of leads) {
        try {
          const isWhatsApp = String(lead.id).startsWith('wa-');
          const isEmail = String(lead.id).startsWith('email-');
          const conversationId = isWhatsApp ? String(lead.id).replace(/^wa-/, '') : null;

          // Email leads: no client profile table; lead_id is synthetic (not UUID) — skip DB query
          if (isEmail) {
            statusMap[lead.id] = 'empty';
            profileMap[lead.id] = null;
            continue;
          }

          const { data } = isWhatsApp && conversationId
            ? await supabase
                .from('whatsapp_conversation_client_profiles')
                .select('*')
                .eq('conversation_id', conversationId)
                .maybeSingle()
            : await supabase
                .from('lead_client_profiles')
                .select('*')
                .eq('lead_id', lead.id)
                .maybeSingle();

          if (!data) {
            statusMap[lead.id] = 'empty';
            profileMap[lead.id] = null;
          } else {
            profileMap[lead.id] = data;
            const fields = [data.name, (data as any).code, data.gender, data.age, data.occupation, data.location, (data as any).phone_number, (data as any).email];
            const filledFields = fields.filter(field => field !== null && field !== undefined && field !== '').length;

            if (filledFields === 0) {
              statusMap[lead.id] = 'empty';
            } else if (filledFields === fields.length) {
              statusMap[lead.id] = 'full';
            } else {
              statusMap[lead.id] = 'partial';
            }
          }
        } catch {
          statusMap[lead.id] = 'empty';
          profileMap[lead.id] = null;
        }
      }

      setClientStatuses(statusMap);
      setClientProfiles(profileMap);
    };

    fetchStatuses();
  }, [leads]);

  // Filter leads based on selected filters
  const filteredLeads = useMemo(() => {
    let filtered = leads;

    // Search filter
    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.client.toLowerCase().includes(searchLower) ||
        lead.title.toLowerCase().includes(searchLower) ||
        lead.ticket_id?.toLowerCase().includes(searchLower)
      );
    }

    // Data completeness filter
    if (filters.dataCompleteness !== 'all') {
      filtered = filtered.filter(lead => {
        const clientStatus = clientStatuses[lead.id] || 'empty';
        return clientStatus === filters.dataCompleteness;
      });
    }

    // Services filter
    if (filters.services !== 'all' && filters.services) {
      filtered = filtered.filter(lead => lead.services === filters.services);
    }

    // Category filter
    if (filters.category !== 'all' && filters.category) {
      filtered = filtered.filter(lead => lead.category === filters.category);
    }

    // Assignee filter
    if (filters.assignee !== 'all' && filters.assignee) {
      filtered = filtered.filter(lead => lead.assignee === filters.assignee);
    }

    // FU Priority filter
    if (filters.fuPriority !== 'all') {
      if (filters.fuPriority === 'Please Follow Up') {
        filtered = filtered.filter(lead => lead.followup === 0);
      } else if (filters.fuPriority) {
        filtered = filtered.filter(lead => lead.fu_priority === filters.fuPriority);
      }
    }

    // Status filter
    if (filters.status !== 'all' && filters.status) {
      const statusNorm = (filters.status as string).trim().toLowerCase();
      filtered = filtered.filter(lead => (lead.lead_status?.name?.trim().toLowerCase() ?? '') === statusNorm);
    }

    // Source filter
    if (filters.source !== 'all' && filters.source) {
      filtered = filtered.filter(lead => lead.source === filters.source);
    }

    // Date range filter
    if (filters.dateRange && filters.dateRange.from && filters.dateRange.to) {
      const fromDate = new Date(filters.dateRange.from);
      const toDate = new Date(filters.dateRange.to);
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.created_at);
        return leadDate >= fromDate && leadDate <= toDate;
      });
    }

    return filtered;
  }, [leads, filters, clientStatuses]);

  const convertedLeads = filteredLeads.filter(lead => (lead.lead_status?.name?.trim().toLowerCase() ?? '') === 'converted').length;

  // Generate PDF Report
  const generatePDFReport = async () => {
    try {
      setIsGeneratingPDF(true);

      // Validate data before generating PDF
      if (!filteredLeads || filteredLeads.length === 0) {
        alert('Tidak ada data lead untuk dibuat laporan PDF');
        return;
      }

      // Prepare comprehensive data for PDF
      const pdfData = {
        leads: filteredLeads,
        filters: filters || {},
        clientStatuses,
        clientProfiles
      };

      // Call the PDF generator
      await generateLeadsPDF(pdfData);
      console.log('✅ PDF generated successfully');
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      alert('Terjadi kesalahan saat membuat laporan PDF. Silakan coba lagi.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <>
      {/* Create Lead Dialog */}
      <NewLeadForm
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateLead}
        isSubmitting={isSubmitting}
      />

      {/* Single load like /digital-marketing/social-media/dashboard: one loading state, then all content (no blink) */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[500px] w-full">
          <LoadingDots size="lg" />
        </div>
      ) : (
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 h-full">
        {/* Main Content - 9 columns */}
        <div className="col-span-9 h-full flex flex-col min-h-0">
          <div className="h-full flex flex-col min-h-0 seamless-scroll max-h-[calc(100vh-120px)]">
            <div className="flex-shrink-0 mb-2">
              <div className="bg-white border rounded-md p-2">
                <LeadsFilters 
                  filters={filters}
                  onFiltersChange={setFilters}
                  onNewLeadClick={handleNewLeadClick}
                  filteredLeads={filteredLeads}
                />
              </div>
            </div>

            <div className="flex-shrink-0 mb-2">
              <LeadsMetricsCards leads={filteredLeads} />
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col seamless-scroll max-h-[calc(100vh-320px)]">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <LeadsTableNew 
                    leads={filteredLeads}
                    onUpdateLead={updateLead}
                    onDeleteLead={deleteLead}
                    onRefreshLeads={refetch}
                    loading={loading}
                  />
                </div>
                <LeadsTableFooter 
                  totalLeads={leads.length}
                  convertedLeads={convertedLeads}
                  filteredLeads={filteredLeads.length}
                  selectedStatus={filters.status}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="col-span-3 h-full flex flex-col min-h-0">
          <div className="h-full flex flex-col min-h-0 max-h-[calc(100vh-120px)]">
            <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col min-h-0">
              <div className="px-4 py-1.5 border-b flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Report Summary</h3>
                    <p className="text-sm text-slate-500">Data summary based on filters</p>
                  </div>
                  <Button onClick={generatePDFReport} disabled={isGeneratingPDF} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                    {isGeneratingPDF ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full p-4 seamless-scroll overflow-y-auto">
                  <LeadsInsights 
                    leads={filteredLeads} 
                    filters={filters} 
                    clientStatuses={clientStatuses} 
                    clientProfiles={clientProfiles}
                    allEmployees={employees}
                    organizationId={organizationId ?? undefined}
                  />
                </div>
              </div>

              <LeadsSidebarFooter 
                totalLeads={filteredLeads.length}
                convertedLeads={convertedLeads}
              />
            </div>
          </div>
        </div>
      </div>
      )}
    </>
  );
};

