import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { Progress } from '@/features/ui/progress';
import { Plus, Edit, Trash2, DollarSign, Calendar, Target, FileText, Users, CheckCircle, Clock, AlertTriangle, CreditCard } from 'lucide-react';
import { useKOLPaymentTerms } from '../hooks/useKOLPaymentTerms';
import { PaymentTermModal } from '../modals/PaymentTermModal';
import { PaymentUpdateModal } from '../modals/PaymentUpdateModal';

const KOLPaymentTermsTab = () => {
  const { paymentTerms, isLoading, deletePaymentTerm } = useKOLPaymentTerms();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState(null);

  const templates = paymentTerms.filter(term => term.type === 'template');
  const agreements = paymentTerms.filter(term => term.type === 'agreement');

  const handleEdit = (term: any) => {
    setSelectedTerm(term);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedTerm(null);
    setIsModalOpen(true);
  };

  const handleUpdatePayment = (term: any) => {
    setSelectedTerm(term);
    setIsPaymentModalOpen(true);
  };

  const handleDelete = async (id: string, isActive: boolean) => {
    if (isActive) {
      alert('Cannot delete active agreements. Please deactivate first.');
      return;
    }
    if (confirm('Are you sure you want to delete this payment term?')) {
      await deletePaymentTerm(id);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'draft': return 'secondary';
      case 'signed': return 'default';
      case 'completed': return 'outline';
      case 'negotiating': return 'secondary';
      case 'agreed': return 'default';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-3 h-3" />;
      case 'draft': return <Clock className="w-3 h-3" />;
      case 'signed': return <CheckCircle className="w-3 h-3" />;
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      case 'negotiating': return <AlertTriangle className="w-3 h-3" />;
      case 'agreed': return <CheckCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const calculateMilestoneProgress = (milestones: any) => {
    if (!milestones || !Array.isArray(milestones) || milestones.length === 0) return 0;
    const completedMilestones = milestones.filter(m => m.status === 'completed').length;
    return Math.round((completedMilestones / milestones.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Terms</h2>
          <p className="text-gray-600">Manage payment models and terms for KOL collaborations</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Payment Term
        </Button>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="agreements" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Agreements ({agreements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4 mt-4">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Templates</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first payment term template to standardize KOL collaborations.
                </p>
                <Button onClick={handleCreate}>Create Template</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {templates.map((term) => (
                <Card key={term.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {term.template_name || 'Payment Template'}
                          <Badge variant="secondary">Template</Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {term.payment_model?.replace('_', ' ').toUpperCase()} • Base: {term.currency} {term.base_amount?.toLocaleString() || 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusVariant(term.status)} className="flex items-center gap-1">
                          {getStatusIcon(term.status)}
                          {term.status?.toUpperCase() || 'DRAFT'}
                        </Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(term)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(term.id, term.status === 'active')}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Base Amount</p>
                          <p className="font-semibold">
                            {term.currency} {term.base_amount?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Bonus Amount</p>
                          <p className="font-semibold">{term.currency} {term.bonus_amount?.toLocaleString() || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Payment Schedule</p>
                          <p className="font-semibold">{term.payment_schedule?.replace('_', ' ').toUpperCase() || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Model</p>
                          <p className="font-semibold">{term.payment_model?.replace('_', ' ').toUpperCase() || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="agreements" className="space-y-4 mt-4">
          {agreements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Agreements</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create agreements with KOLs using your templates or create custom terms.
                </p>
                <Button onClick={handleCreate}>Create Agreement</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {agreements.map((term) => (
                <Card key={term.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                     <div className="flex justify-between items-start">
                       <div>
                         <CardTitle className="text-lg flex items-center gap-2">
                           {term.kol_profiles?.name || 'Unknown KOL'}
                           <Badge variant="default">Agreement</Badge>
                         </CardTitle>
                         <p className="text-sm text-muted-foreground mt-1">
                           {term.payment_model?.replace('_', ' ').toUpperCase()} • Total: {term.currency} {((term.base_amount || 0) + (term.bonus_amount || 0) + (term.barter_value || 0)).toLocaleString()}
                         </p>
                         {term.kol_content_posts && (
                           <p className="text-xs text-blue-600 mt-1">
                             Content: {term.kol_content_posts.title}
                           </p>
                         )}
                       </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusVariant(term.status)} className="flex items-center gap-1">
                          {getStatusIcon(term.status)}
                          {term.status?.toUpperCase() || 'DRAFT'}
                        </Badge>
                         <div className="flex gap-1">
                           <Button variant="ghost" size="sm" onClick={() => handleUpdatePayment(term)} title="Update Payment">
                             <CreditCard className="w-4 h-4" />
                           </Button>
                           <Button variant="ghost" size="sm" onClick={() => handleEdit(term)}>
                             <Edit className="w-4 h-4" />
                           </Button>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleDelete(term.id, term.status === 'active')}
                             className="text-destructive hover:text-destructive/80"
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </div>
                      </div>
                    </div>
                  </CardHeader>
                   <CardContent className="pt-0 space-y-4">
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       <div className="flex items-center gap-2">
                         <DollarSign className="w-4 h-4 text-muted-foreground" />
                         <div>
                           <p className="text-sm text-muted-foreground">Base Amount</p>
                           <p className="font-semibold">
                             {term.currency} {term.base_amount?.toLocaleString() || 'N/A'}
                           </p>
                         </div>
                       </div>
                       <div className="flex items-center gap-2">
                         <Target className="w-4 h-4 text-muted-foreground" />
                         <div>
                           <p className="text-sm text-muted-foreground">Bonus</p>
                           <p className="font-semibold">{term.currency} {term.bonus_amount?.toLocaleString() || 'N/A'}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-2">
                         <Calendar className="w-4 h-4 text-muted-foreground" />
                         <div>
                           <p className="text-sm text-muted-foreground">Schedule</p>
                           <p className="font-semibold">{term.payment_schedule?.replace('_', ' ').toUpperCase() || 'N/A'}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-2">
                         <CreditCard className="w-4 h-4 text-muted-foreground" />
                         <div>
                           <p className="text-sm text-muted-foreground">DP Paid</p>
                           <p className="font-semibold">{term.currency} {(term as any).down_payment_amount?.toLocaleString() || '0'}</p>
                         </div>
                       </div>
                     </div>

                     {/* Payment Progress */}
                      {(term as any).down_payment_amount && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-semibold">Payment Progress</h4>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(((term as any).down_payment_amount / ((term.base_amount || 0) + (term.bonus_amount || 0))) * 100)}% Paid
                            </span>
                          </div>
                          <Progress 
                            value={Math.round(((term as any).down_payment_amount / ((term.base_amount || 0) + (term.bonus_amount || 0))) * 100)} 
                            className="h-2" 
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>DP: {term.currency} {(term as any).down_payment_amount?.toLocaleString()}</span>
                            <span>Remaining: {term.currency} {((term.base_amount || 0) + (term.bonus_amount || 0) - ((term as any).down_payment_amount || 0) - ((term as any).deduction_amount || 0)).toLocaleString()}</span>
                          </div>
                          {((term as any).deduction_amount || 0) > 0 && (
                            <div className="flex items-center gap-2 text-xs text-orange-600">
                              <AlertTriangle className="w-3 h-3" />
                              Deduction: {term.currency} {(term as any).deduction_amount?.toLocaleString()} ({(term as any).deduction_reason})
                            </div>
                          )}
                        </div>
                      )}
                    
                    {term.milestones && Array.isArray(term.milestones) && term.milestones.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-semibold">Milestone Progress</h4>
                          <span className="text-xs text-muted-foreground">
                            {calculateMilestoneProgress(term.milestones)}% Complete
                          </span>
                        </div>
                        <Progress value={calculateMilestoneProgress(term.milestones)} className="h-2" />
                        <div className="grid gap-2 max-h-32 overflow-y-auto">
                          {term.milestones.map((milestone: any, index: number) => (
                            <div key={index} className="flex justify-between items-center text-xs">
                              <span className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${milestone.status === 'completed' ? 'bg-primary' : 'bg-muted'}`} />
                                {milestone.name}
                              </span>
                              <span className="text-muted-foreground">{milestone.percentage}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <PaymentTermModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        paymentTerm={selectedTerm}
      />
      
      <PaymentUpdateModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        paymentTerm={selectedTerm}
      />
    </div>
  );
};

export default KOLPaymentTermsTab;
