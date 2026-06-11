'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { addAsset, updateAsset } from '@/lib/firebase';
import type { Asset } from '@/lib/types';
import { Plus, Wrench, AlertTriangle } from 'lucide-react';

export default function AssetsPage() {
  const { db } = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    location: '',
    serialNumber: '',
    manufacturer: '',
    model: '',
    status: 'Operational' as Asset['status'],
  });

  const assetsQuery = query(collection(db, 'assets'), orderBy('name'));
  const { data: assets = [], loading } = useCollection<Asset>(assetsQuery);

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      location: '',
      serialNumber: '',
      manufacturer: '',
      model: '',
      status: 'Operational',
    });
  };

  const handleAddAsset = async () => {
    try {
      await addAsset(db, {
        ...formData,
        lifecycleStage: 'New',
      });
      toast({
        title: 'Asset Added',
        description: 'The asset has been successfully added to the system.',
      });
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add asset. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (assetId: string, status: Asset['status']) => {
    try {
      await updateAsset(db, assetId, { status });
      toast({
        title: 'Status Updated',
        description: 'Asset status has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: Asset['status']) => {
    const variants: Record<Asset['status'], any> = {
      'Operational': 'default',
      'Under Maintenance': 'secondary',
      'Needs Repair': 'destructive',
      'Out of Service': 'destructive',
    };
    return variants[status] || 'secondary';
  };

  const getLifecycleBadge = (stage: Asset['lifecycleStage']) => {
    const colors: Record<Asset['lifecycleStage'], string> = {
      'New': 'bg-green-100 text-green-800',
      'Active': 'bg-blue-100 text-blue-800',
      'Aging': 'bg-yellow-100 text-yellow-800',
      'End of Life': 'bg-red-100 text-red-800',
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  const needsAttention = assets.filter(a => a.status === 'Needs Repair' || a.status === 'Out of Service');
  const underMaintenance = assets.filter(a => a.status === 'Under Maintenance');

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Asset Management</h1>
          <p className="text-muted-foreground">
            Track and manage facility assets throughout their lifecycle
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operational</CardTitle>
            <div className="h-3 w-3 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assets.filter(a => a.status === 'Operational').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Maintenance</CardTitle>
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{underMaintenance.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{needsAttention.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Assets List */}
      <Card>
        <CardHeader>
          <CardTitle>All Assets</CardTitle>
          <CardDescription>Manage physical assets and equipment</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading assets...</p>
          ) : assets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No assets yet. Add your first asset to get started.</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {assets.map(asset => (
                <div key={asset.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{asset.name}</h3>
                        <Badge variant={getStatusBadge(asset.status)}>{asset.status}</Badge>
                        <Badge className={getLifecycleBadge(asset.lifecycleStage)}>{asset.lifecycleStage}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <p className="font-medium">{asset.type}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Location:</span>
                          <p className="font-medium">{asset.location}</p>
                        </div>
                        {asset.manufacturer && (
                          <div>
                            <span className="text-muted-foreground">Manufacturer:</span>
                            <p className="font-medium">{asset.manufacturer}</p>
                          </div>
                        )}
                        {asset.model && (
                          <div>
                            <span className="text-muted-foreground">Model:</span>
                            <p className="font-medium">{asset.model}</p>
                          </div>
                        )}
                      </div>
                      {asset.serialNumber && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Serial: {asset.serialNumber}
                        </p>
                      )}
                    </div>
                    <div className="ml-4">
                      <Select
                        value={asset.status}
                        onValueChange={(value) => handleUpdateStatus(asset.id, value as Asset['status'])}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Operational">Operational</SelectItem>
                          <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                          <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                          <SelectItem value="Out of Service">Out of Service</SelectItem>
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

      {/* Add Asset Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
            <DialogDescription>
              Register a new asset in the facility management system
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Asset Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., HVAC Unit - Floor 2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Input
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="e.g., HVAC, Elevator, Generator"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Building A, Floor 2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as Asset['status'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operational">Operational</SelectItem>
                    <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                    <SelectItem value="Out of Service">Out of Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAsset} disabled={!formData.name || !formData.type || !formData.location}>
              Add Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
