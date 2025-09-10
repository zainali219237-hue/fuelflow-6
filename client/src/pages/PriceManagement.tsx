import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";

export default function PriceManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  const updatePriceMutation = useMutation({
    mutationFn: async ({ productId, newPrice }: { productId: string; newPrice: number }) => {
      const response = await apiRequest("PUT", `/api/products/${productId}`, {
        currentPrice: newPrice.toString()
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Price updated",
        description: "Product price updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: () => {
      toast({
        title: "Price update failed",
        description: "Failed to update product price",
        variant: "destructive",
      });
    },
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

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Price Management</h3>
          <p className="text-muted-foreground">Manage product pricing and profit margins</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button data-testid="button-bulk-price-update">
            📊 Bulk Update
          </Button>
          <Button variant="outline" data-testid="button-price-history">
            📈 Price History
          </Button>
        </div>
      </div>

      {/* Market Prices Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Current Market Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600" data-testid="market-petrol-price">₹110.50</div>
                <div className="text-sm text-green-700">Petrol - Market Rate</div>
                <div className="text-xs text-green-600 mt-1">↑ +0.50 from yesterday</div>
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600" data-testid="market-diesel-price">₹84.25</div>
                <div className="text-sm text-blue-700">Diesel - Market Rate</div>
                <div className="text-xs text-blue-600 mt-1">↓ -0.25 from yesterday</div>
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600" data-testid="market-premium-price">₹115.75</div>
                <div className="text-sm text-purple-700">Premium - Market Rate</div>
                <div className="text-xs text-purple-600 mt-1">→ No change</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Pricing Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Price Management</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Product</th>
                  <th className="text-center p-3 font-medium">Category</th>
                  <th className="text-right p-3 font-medium">Cost Price</th>
                  <th className="text-right p-3 font-medium">Selling Price</th>
                  <th className="text-right p-3 font-medium">Margin</th>
                  <th className="text-center p-3 font-medium">Last Updated</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Sample product pricing data */}
                {[
                  {
                    name: "Petrol (Regular)",
                    category: "fuel",
                    costPrice: "108.00",
                    sellingPrice: "110.50",
                    margin: "2.31",
                    lastUpdated: "18 Jan 2024",
                    status: "active",
                    priceChange: "increased"
                  },
                  {
                    name: "Diesel (HSD)",
                    category: "fuel", 
                    costPrice: "82.00",
                    sellingPrice: "84.25",
                    margin: "2.74",
                    lastUpdated: "18 Jan 2024",
                    status: "active",
                    priceChange: "decreased"
                  },
                  {
                    name: "Premium Petrol",
                    category: "fuel",
                    costPrice: "112.50",
                    sellingPrice: "115.75",
                    margin: "2.89",
                    lastUpdated: "17 Jan 2024",
                    status: "active",
                    priceChange: "stable"
                  },
                  {
                    name: "Engine Oil 5W-30",
                    category: "lubricant",
                    costPrice: "450.00",
                    sellingPrice: "550.00",
                    margin: "18.18",
                    lastUpdated: "15 Jan 2024",
                    status: "active",
                    priceChange: "stable"
                  }
                ].map((product, index) => {
                  const costPrice = parseFloat(product.costPrice);
                  const sellingPrice = parseFloat(product.sellingPrice);
                  const marginPercentage = ((sellingPrice - costPrice) / costPrice * 100).toFixed(2);
                  
                  return (
                    <tr key={index} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3">
                        <div className="font-medium text-card-foreground" data-testid={`product-name-${index}`}>
                          {product.name}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="secondary" data-testid={`product-category-${index}`}>
                          {product.category}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono" data-testid={`cost-price-${index}`}>
                        ₹{product.costPrice}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <span className="font-semibold font-mono" data-testid={`selling-price-${index}`}>
                            ₹{product.sellingPrice}
                          </span>
                          {product.priceChange === 'increased' && (
                            <span className="text-green-600 text-xs">↑</span>
                          )}
                          {product.priceChange === 'decreased' && (
                            <span className="text-red-600 text-xs">↓</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-semibold ${parseFloat(marginPercentage) > 5 ? 'text-green-600' : 
                                      parseFloat(marginPercentage) > 2 ? 'text-orange-600' : 'text-red-600'}`}
                              data-testid={`margin-${index}`}>
                          {marginPercentage}%
                        </span>
                      </td>
                      <td className="p-3 text-center text-sm">{product.lastUpdated}</td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={product.status === 'active' ? 'default' : 'secondary'}
                          className={product.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                          data-testid={`product-status-${index}`}
                        >
                          {product.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            className="text-blue-600 hover:text-blue-800"
                            data-testid={`button-edit-price-${index}`}
                          >
                            ✏️
                          </button>
                          <button 
                            className="text-green-600 hover:text-green-800"
                            data-testid={`button-history-${index}`}
                          >
                            📈
                          </button>
                          <button 
                            className="text-purple-600 hover:text-purple-800"
                            data-testid={`button-schedule-${index}`}
                          >
                            ⏰
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Price Change Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Price Change Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-start">
                <span className="text-green-500 mr-2">📈</span>
                <div>
                  <div className="text-sm font-medium text-green-800">Price Increase</div>
                  <div className="text-xs text-green-600">
                    Petrol price increased by ₹0.50 to ₹110.50 per liter effective from today
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start">
                <span className="text-red-500 mr-2">📉</span>
                <div>
                  <div className="text-sm font-medium text-red-800">Price Decrease</div>
                  <div className="text-xs text-red-600">
                    Diesel price decreased by ₹0.25 to ₹84.25 per liter effective from today
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-start">
                <span className="text-yellow-500 mr-2">⚠️</span>
                <div>
                  <div className="text-sm font-medium text-yellow-800">Margin Alert</div>
                  <div className="text-xs text-yellow-600">
                    Diesel margin has dropped below 3%. Consider adjusting selling price.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
