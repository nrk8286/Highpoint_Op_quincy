'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { addComplianceRequirement, updateComplianceRequirement } from '@/lib/firebase';
import type { ComplianceRequirement } from '@/lib/types';
import { Shield, CheckCircle, AlertCircle, Clock, FileText, Plus } from 'lucide-react';

export default function CompliancePage() {
  const { db } = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    regulatoryBody: '',
    category: '',
    status: 'Active' as ComplianceRequirement['status'],
  });

  const requirementsQuery = query(collection(db, 'compliance_requirements'), orderBy('createdAt', 'desc'));
  const { data: requirements = [], loading } = useCollection<ComplianceRequirement>(requirementsQuery);

  const filteredRequirements = filterStatus === 'all'
    ? requirements
    : requirements.filter(r => r.status === filterStatus);

  const compliant = requirements.filter(r => r.status === 'Compliant').length;
  const nonCompliant = requirements.filter(r => r.status === 'Non-Compliant').length;
  const pendingReview = requirements.filter(r => r.status === 'Pending Review').length;

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      regulatoryBody: '',
      category: '',
      status: 'Active',
    });
  };

  const handleAddRequirement = async () => {
    try {
      await addComplianceRequirement(db, formData);
      toast({
        title: 'Requirement Added',
        description: 'The compliance requirement has been added.',
      });
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add compliance requirement.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (requirementId: string, status: ComplianceRequirement['status']) => {
    try {
      await updateComplianceRequirement(db, requirementId, { status });
      toast({
        title: 'Status Updated',
        description: 'Compliance requirement status updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: ComplianceRequirement['status']) => {
    const variants: Record<ComplianceRequirement['status'], any> = {
      'Active': 'default',
      'Pending Review': 'secondary',
      'Compliant': 'default',
      'Non-Compliant': 'destructive',
      'Expired': 'secondary',
    };
    const colors: Record<ComplianceRequirement['status'], string> = {
      'Active': 'bg-blue-100 text-blue-800',
      'Pending Review': 'bg-yellow-100 text-yellow-800',
      'Compliant': 'bg-green-100 text-green-800',
      'Non-Compliant': 'bg-red-100 text-red-800',
      'Expired': 'bg-gray-100 text-gray-800',
    };
    return { variant: variants[status], className: colors[status] };
  };

  const getStatusIcon = (status: ComplianceRequirement['status']) => {
    switch (status) {
      case 'Compliant':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Non-Compliant':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'Pending Review':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileText className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Compliance Requirements</h1>
          <p className="text-muted-foreground">
            Monitor regulatory requirements and maintain compliance
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Requirement
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requirements</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requirements.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliant</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{compliant}</div>
            <p className="text-xs text-muted-foreground">
              {requirements.length > 0 ? Math.round((compliant / requirements.length) * 100) : 0}% compliance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non-Compliant</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nonCompliant}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReview}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Compliance Requirements</CardTitle>
              <CardDescription>Track and manage regulatory compliance</CardDescription>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Compliant">Compliant</SelectItem>
                <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
                <SelectItem value="Pending Review">Pending Review</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading requirements...</p>
          ) : filteredRequirements.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No compliance requirements yet. Add requirements to track compliance.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Requirement
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequirements.map(requirement => (
                <div key={requirement.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(requirement.status)}
                        <h3 className="font-semibold text-lg">{requirement.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{requirement.description}</p>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className={getStatusBadge(requirement.status).className}>
                          {requirement.status}
                        </Badge>
                        <Badge variant="outline">{requirement.regulatoryBody}</Badge>
                        <Badge variant="outline">{requirement.category}</Badge>
                      </div>

                      {requirement.nextReviewDate && (
                        <p className="text-xs text-muted-foreground">
                          Next Review: {new Date(requirement.nextReviewDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="ml-4">
                      <Select
                        value={requirement.status}
                        onValueChange={(value) => handleUpdateStatus(requirement.id, value as ComplianceRequirement['status'])}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Pending Review">Pending Review</SelectItem>
                          <SelectItem value="Compliant">Compliant</SelectItem>
                          <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
                          <SelectItem value="Expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Requirement Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Compliance Requirement</DialogTitle>
            <DialogDescription>
              Register a new compliance requirement to track
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Annual Fire Safety Inspection"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the compliance requirement..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regulatoryBody">Regulatory Body *</Label>
                <Input
                  id="regulatoryBody"
                  value={formData.regulatoryBody}
                  onChange={(e) => setFormData({ ...formData, regulatoryBody: e.target.value })}
                  placeholder="e.g., IDPH, OSHA, CMS"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Safety, Environmental"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as ComplianceRequirement['status'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Pending Review">Pending Review</SelectItem>
                  <SelectItem value="Compliant">Compliant</SelectItem>
                  <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddRequirement}
              disabled={!formData.title || !formData.description || !formData.regulatoryBody || !formData.category}
            >
              Add Requirement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
