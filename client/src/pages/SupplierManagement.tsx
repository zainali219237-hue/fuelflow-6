import { useState } from "react";
import type { Supplier } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";

export default function SupplierManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const filteredSuppliers = suppliers.filter((supplier: Supplier) => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "active" && supplier.isActive) ||
                         (filterStatus === "inactive" && !supplier.isActive);
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
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

  const activeSuppliers = suppliers.filter((s: Supplier) => s.isActive).length;
  const totalOutstanding = suppliers.reduce((sum: number, s: Supplier) => sum + parseFloat(s.outstandingAmount || '0'), 0);
  const suppliersWithOutstanding = suppliers.filter((s: Supplier) => parseFloat(s.outstandingAmount || '0') > 0).length;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Supplier Management</h3>
          <p className="text-muted-foreground">Manage vendor relationships and payment terms</p>
        </div>
        <Button data-testid="button-add-supplier">
          + Add New Supplier
        </Button>
      </div>

      {/* Supplier Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary" data-testid="total-suppliers">
              {suppliers.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Suppliers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600" data-testid="active-suppliers">
              {activeSuppliers}
            </div>
            <div className="text-sm text-muted-foreground">Active Suppliers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600" data-testid="total-outstanding-suppliers">
              ₹{totalOutstanding.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Outstanding</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600" data-testid="suppliers-with-outstanding">
              {suppliersWithOutstanding}
            </div>
            <div className="text-sm text-muted-foreground">Pending Payments</div>
          </CardContent>
        </Card>
      </div>

      {/* Supplier List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Supplier Directory</CardTitle>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
                data-testid="input-search-suppliers"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32" data-testid="select-filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Supplier</th>
                  <th className="text-left p-3 font-medium">Contact Person</th>
                  <th className="text-left p-3 font-medium">Payment Terms</th>
                  <th className="text-right p-3 font-medium">Outstanding</th>
                  <th className="text-center p-3 font-medium">Last Order</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Sample supplier data */}
                {[
                  {
                    name: "Bharat Petroleum Corporation",
                    contactPerson: "Ramesh Kumar",
                    phone: "+91 98765 43210",
                    email: "ramesh@bpcl.in",
                    gst: "27AABCB1234L1Z8",
                    paymentTerms: "Net 30 Days",
                    outstanding: "5,52,500",
                    lastOrder: "15 Jan 2024",
                    isActive: true
                  },
                  {
                    name: "Indian Oil Corporation",
                    contactPerson: "Suresh Patel", 
                    phone: "+91 98765 43211",
                    email: "suresh@iocl.in",
                    gst: "27AABCI5678M1Z2",
                    paymentTerms: "Net 15 Days",
                    outstanding: "2,52,750",
                    lastOrder: "16 Jan 2024",
                    isActive: true
                  },
                  {
                    name: "Hindustan Petroleum Corporation",
                    contactPerson: "Ajay Singh",
                    phone: "+91 98765 43212",
                    email: "ajay@hpcl.in",
                    gst: "27AABCH9012N1Z5",
                    paymentTerms: "Net 30 Days",
                    outstanding: "1,85,000",
                    lastOrder: "17 Jan 2024",
                    isActive: true
                  },
                  {
                    name: "Reliance Petroleum Ltd",
                    contactPerson: "Vikram Shah",
                    phone: "+91 98765 43213",
                    email: "vikram@ril.com",
                    gst: "27AABCR3456O1Z7",
                    paymentTerms: "Net 45 Days",
                    outstanding: "0",
                    lastOrder: "10 Dec 2023",
                    isActive: false
                  }
                ].map((supplier, index) => (
                  <tr key={index} className="border-b border-border hover:bg-muted/50">
                    <td className="p-3">
                      <div className="font-medium text-card-foreground" data-testid={`supplier-name-${index}`}>
                        {supplier.name}
                      </div>
                      <div className="text-sm text-muted-foreground">GST: {supplier.gst}</div>
                      <div className="text-sm text-muted-foreground">{supplier.email}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{supplier.contactPerson}</div>
                      <div className="text-sm text-muted-foreground">{supplier.phone}</div>
                    </td>
                    <td className="p-3">{supplier.paymentTerms}</td>
                    <td className="p-3 text-right">
                      {parseFloat(supplier.outstanding) > 0 ? (
                        <span className="font-semibold text-red-600" data-testid={`outstanding-supplier-${index}`}>
                          ₹{supplier.outstanding}
                        </span>
                      ) : (
                        <span className="text-green-600">₹0</span>
                      )}
                    </td>
                    <td className="p-3 text-center text-sm">{supplier.lastOrder}</td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={supplier.isActive ? 'default' : 'secondary'}
                        className={supplier.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                        data-testid={`supplier-status-${index}`}
                      >
                        {supplier.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-800"
                          data-testid={`button-view-supplier-${index}`}
                        >
                          👁️
                        </button>
                        <button 
                          className="text-green-600 hover:text-green-800"
                          data-testid={`button-edit-supplier-${index}`}
                        >
                          ✏️
                        </button>
                        <button 
                          className="text-purple-600 hover:text-purple-800"
                          data-testid={`button-orders-${index}`}
                        >
                          📦
                        </button>
                        <button 
                          className="text-orange-600 hover:text-orange-800"
                          data-testid={`button-payment-${index}`}
                        >
                          💰
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
