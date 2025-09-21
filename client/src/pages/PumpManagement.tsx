
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { apiRequest } from "@/lib/api";
import { Fuel, Settings, Eye, Edit, Trash2, Plus } from "lucide-react";
import { DeleteConfirmation } from "@/components/ui/delete-confirmation";

const pumpReadingSchema = z.object({
  pumpId: z.string().min(1, "Pump is required"),
  productId: z.string().min(1, "Product is required"),
  openingReading: z.string().min(1, "Opening reading is required"),
  closingReading: z.string().min(1, "Closing reading is required"),
  shiftNumber: z.string().min(1, "Shift number is required"),
  operatorName: z.string().min(1, "Operator name is required"),
  readingDate: z.string().min(1, "Date is required"),
});

const pumpConfigSchema = z.object({
  name: z.string().min(1, "Pump name is required"),
  pumpNumber: z.string().min(1, "Pump number is required"),
  productId: z.string().min(1, "Product is required"),
  isActive: z.boolean().default(true),
  stationId: z.string().optional(),
});

interface Pump {
  id: string;
  name: string;
  pumpNumber: string;
  productId: string;
  product?: { name: string; };
  isActive: boolean;
  stationId: string;
}

interface PumpReading {
  id: string;
  pumpId: string;
  pump?: { name: string; pumpNumber: string; };
  productId: string;
  product?: { name: string; };
  openingReading: string;
  closingReading: string;
  totalSale: string;
  shiftNumber: string;
  operatorName: string;
  readingDate: string;
}

export default function PumpManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrency();
  const [pumpDialogOpen, setPumpDialogOpen] = useState(false);
  const [readingDialogOpen, setReadingDialogOpen] = useState(false);
  const [editPumpId, setEditPumpId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pumpToDelete, setPumpToDelete] = useState<Pump | null>(null);

  const pumpForm = useForm({
    resolver: zodResolver(pumpConfigSchema),
    defaultValues: {
      name: "",
      pumpNumber: "",
      productId: "",
      isActive: true,
      stationId: user?.stationId || "",
    },
  });

  const readingForm = useForm({
    resolver: zodResolver(pumpReadingSchema),
    defaultValues: {
      pumpId: "",
      productId: "",
      openingReading: "",
      closingReading: "",
      shiftNumber: "1",
      operatorName: "",
      readingDate: new Date().toISOString().split('T')[0],
    },
    mode: "onChange"
  });

  const { data: pumps = [], isLoading: pumpsLoading } = useQuery<Pump[]>({
    queryKey: ["/api/pumps", user?.stationId],
    queryFn: () => apiRequest("GET", `/api/pumps?stationId=${user?.stationId}`).then(res => res.json()),
    enabled: !!user?.stationId,
  });

  const { data: pumpReadings = [], isLoading: readingsLoading } = useQuery<PumpReading[]>({
    queryKey: ["/api/pump-readings", user?.stationId],
    queryFn: () => apiRequest("GET", `/api/pump-readings?stationId=${user?.stationId}`).then(res => res.json()),
    enabled: !!user?.stationId,
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
    queryFn: () => apiRequest("GET", "/api/products").then(res => res.json()),
  });

  const updatePumpMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/pumps/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pump updated",
        description: "Pump has been updated successfully",
      });
      setPumpDialogOpen(false);
      setEditPumpId(null);
      pumpForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/pumps"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update pump",
        variant: "destructive",
      });
    },
  });

  const createPumpMutation = useMutation({
    mutationFn: async (data: any) => {
      const pumpData = {
        ...data,
        stationId: user?.stationId,
        isActive: data.isActive ?? true,
      };
      const response = await apiRequest("POST", "/api/pumps", pumpData);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pump created",
        description: "New pump has been added successfully",
      });
      setPumpDialogOpen(false);
      pumpForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/pumps"] });
    },
    onError: (error: any) => {
      console.error("Pump creation error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create pump",
        variant: "destructive",
      });
    },
  });

  const createReadingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/pump-readings", data);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reading recorded",
        description: "Pump reading has been recorded successfully",
      });
      setReadingDialogOpen(false);
      readingForm.reset({
        pumpId: "",
        productId: "",
        openingReading: "",
        closingReading: "",
        shiftNumber: "1",
        operatorName: "",
        readingDate: new Date().toISOString().split('T')[0],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pump-readings", user?.stationId] });
    },
    onError: (error: any) => {
      console.error("Pump reading creation error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to record reading",
        variant: "destructive",
      });
    },
  });

  const onPumpSubmit = (data: any) => {
    console.log("Pump form submission:", { data, editPumpId, user });
    
    if (editPumpId) {
      console.log("Updating pump with ID:", editPumpId);
      updatePumpMutation.mutate({ id: editPumpId, data });
    } else {
      console.log("Creating new pump");
      createPumpMutation.mutate(data);
    }
  };

  const onReadingSubmit = (data: any) => {
    console.log("Submitting pump reading:", data);
    
    // Enhanced validation
    if (!data.pumpId || !data.openingReading || !data.closingReading || !data.operatorName || !data.readingDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Ensure user data is available
    if (!user?.stationId || !user?.id) {
      toast({
        title: "Authentication Error",
        description: "User session not properly loaded. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    const opening = parseFloat(data.openingReading);
    const closing = parseFloat(data.closingReading);
    
    if (isNaN(opening) || isNaN(closing)) {
      toast({
        title: "Validation Error",
        description: "Please enter valid numeric readings",
        variant: "destructive",
      });
      return;
    }

    if (closing < opening) {
      toast({
        title: "Validation Error",
        description: "Closing reading must be greater than opening reading",
        variant: "destructive",
      });
      return;
    }

    const totalSale = closing - opening;

    // Get the selected pump to extract productId
    const selectedPump = pumps.find(p => p.id === data.pumpId);
    
    if (!selectedPump) {
      toast({
        title: "Error",
        description: "Selected pump not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    const readingData = {
      pumpId: data.pumpId,
      productId: selectedPump.productId,
      openingReading: opening.toString(),
      closingReading: closing.toString(),
      totalSale: totalSale.toString(),
      shiftNumber: data.shiftNumber,
      operatorName: data.operatorName,
      readingDate: data.readingDate,
      stationId: user.stationId,
      userId: user.id,
    };

    console.log("Final reading data being sent:", readingData);
    
    createReadingMutation.mutate(readingData);
  };

  const handleEditPump = (pump: Pump) => {
    setEditPumpId(pump.id);
    pumpForm.reset({
      name: pump.name,
      pumpNumber: pump.pumpNumber,
      productId: pump.productId,
      isActive: pump.isActive,
      stationId: pump.stationId,
    });
    setPumpDialogOpen(true);
  };

  const deletePumpMutation = useMutation({
    mutationFn: async (pumpId: string) => {
      const response = await apiRequest("DELETE", `/api/pumps/${pumpId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pump deleted",
        description: "Pump has been deleted successfully",
      });
      setDeleteConfirmOpen(false);
      setPumpToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/pumps"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete pump",
        variant: "destructive",
      });
    },
  });

  const handleDeletePump = (pump: Pump) => {
    setPumpToDelete(pump);
    setDeleteConfirmOpen(true);
  };

  const confirmDeletePump = () => {
    if (pumpToDelete) {
      deletePumpMutation.mutate(pumpToDelete.id);
    }
  };

  const todaysReadings = pumpReadings.filter(reading => 
    new Date(reading.readingDate).toDateString() === new Date().toDateString()
  );

  const totalTodaySales = todaysReadings.reduce((sum, reading) => 
    sum + parseFloat(reading.totalSale || '0'), 0
  );

  if (pumpsLoading || readingsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Pump Management</h3>
          <p className="text-muted-foreground">Manage fuel pumps and daily readings</p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={pumpDialogOpen} onOpenChange={(isOpen) => { 
            if (!isOpen) { 
              setEditPumpId(null); 
              pumpForm.reset(); 
            } 
            setPumpDialogOpen(isOpen); 
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-pump">
                <Plus className="w-4 h-4 mr-2" />
                Add Pump
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editPumpId ? "Edit Pump" : "Add New Pump"}</DialogTitle>
              </DialogHeader>
              <Form {...pumpForm}>
                <form onSubmit={pumpForm.handleSubmit(onPumpSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={pumpForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pump Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Pump A" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={pumpForm.control}
                      name="pumpNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pump Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={pumpForm.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setPumpDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createPumpMutation.isPending || updatePumpMutation.isPending}>
                      {createPumpMutation.isPending || updatePumpMutation.isPending 
                        ? (editPumpId ? "Updating..." : "Adding...") 
                        : (editPumpId ? "Update Pump" : "Add Pump")}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={readingDialogOpen} onOpenChange={setReadingDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-reading">
                <Fuel className="w-4 h-4 mr-2" />
                Add Reading
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Record Pump Reading</DialogTitle>
              </DialogHeader>
              <Form {...readingForm}>
                <form onSubmit={readingForm.handleSubmit(onReadingSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={readingForm.control}
                      name="pumpId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pump *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select pump" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {pumps.map((pump) => (
                                <SelectItem key={pump.id} value={pump.id}>
                                  {pump.name} - {pump.pumpNumber}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={readingForm.control}
                      name="shiftNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shift Number *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select shift" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">Shift 1</SelectItem>
                              <SelectItem value="2">Shift 2</SelectItem>
                              <SelectItem value="3">Shift 3</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={readingForm.control}
                      name="openingReading"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opening Reading *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.001" placeholder="0.000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={readingForm.control}
                      name="closingReading"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Closing Reading *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.001" placeholder="0.000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={readingForm.control}
                      name="operatorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Operator Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Operator name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={readingForm.control}
                      name="readingDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date *</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              max="9999-12-31"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setReadingDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createReadingMutation.isPending}>
                      Record Reading
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{pumps.length}</div>
            <div className="text-sm text-muted-foreground">Total Pumps</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{pumps.filter(p => p.isActive).length}</div>
            <div className="text-sm text-muted-foreground">Active Pumps</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{todaysReadings.length}</div>
            <div className="text-sm text-muted-foreground">Today's Readings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{totalTodaySales.toFixed(1)}L</div>
            <div className="text-sm text-muted-foreground">Today's Sales</div>
          </CardContent>
        </Card>
      </div>

      {/* Pumps List */}
      <Card>
        <CardHeader>
          <CardTitle>Pump Configuration</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollable-container">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Pump Name</th>
                  <th className="text-left p-3 font-medium">Number</th>
                  <th className="text-left p-3 font-medium">Product</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pumps.map((pump, index) => (
                  <tr key={pump.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-3 font-medium">{pump.name}</td>
                    <td className="p-3">{pump.pumpNumber}</td>
                    <td className="p-3">{pump.product?.name || 'Unknown'}</td>
                    <td className="p-3 text-center">
                      <Badge variant={pump.isActive ? 'default' : 'secondary'}>
                        {pump.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPump(pump)}
                          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50"
                          data-testid={`button-edit-pump-${index}`}
                          title="Edit Pump"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePump(pump)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                          data-testid={`button-delete-pump-${index}`}
                          title="Delete Pump"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Readings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Pump Readings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollable-container">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Pump</th>
                  <th className="text-left p-3 font-medium">Shift</th>
                  <th className="text-left p-3 font-medium">Operator</th>
                  <th className="text-right p-3 font-medium">Opening</th>
                  <th className="text-right p-3 font-medium">Closing</th>
                  <th className="text-right p-3 font-medium">Sale (L)</th>
                </tr>
              </thead>
              <tbody>
                {pumpReadings.slice(0, 10).map((reading, index) => (
                  <tr key={reading.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-3 text-sm">
                      {new Date(reading.readingDate).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      {reading.pump?.name} - {reading.pump?.pumpNumber}
                    </td>
                    <td className="p-3">{reading.shiftNumber}</td>
                    <td className="p-3">{reading.operatorName}</td>
                    <td className="p-3 text-right">{parseFloat(reading.openingReading).toFixed(3)}</td>
                    <td className="p-3 text-right">{parseFloat(reading.closingReading).toFixed(3)}</td>
                    <td className="p-3 text-right font-medium text-green-600">
                      {parseFloat(reading.totalSale).toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDeletePump}
        title="Delete Pump"
        description="Are you sure you want to delete this pump? This action cannot be undone and will remove all pump data and readings."
        itemName={pumpToDelete?.name || "pump"}
        isLoading={deletePumpMutation.isPending}
      />
    </div>
  );
}
