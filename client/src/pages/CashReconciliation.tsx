import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function CashReconciliation() {
  const [shift, setShift] = useState("day");
  const [reconciliationDate, setReconciliationDate] = useState(new Date().toISOString().split('T')[0]);

  // Sample data for demonstration
  const cashData = {
    openingBalance: 5000,
    expectedCash: 45750,
    actualCash: 45500,
    difference: -250,
    cardSales: 28500,
    creditSales: 18200,
    expenses: 1200
  };

  const denominations = [
    { value: 2000, count: 15, total: 30000 },
    { value: 500, count: 20, total: 10000 },
    { value: 200, count: 15, total: 3000 },
    { value: 100, count: 20, total: 2000 },
    { value: 50, count: 6, total: 300 },
    { value: 20, count: 5, total: 100 },
    { value: 10, count: 10, total: 100 },
    { value: 5, count: 0, total: 0 },
    { value: 2, count: 0, total: 0 },
    { value: 1, count: 0, total: 0 }
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Cash Reconciliation</h3>
          <p className="text-muted-foreground">Daily cash balancing and shift-wise reporting</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button data-testid="button-start-reconciliation">
            🔄 Start Reconciliation
          </Button>
          <Button variant="outline" data-testid="button-print-report">
            🖨️ Print Report
          </Button>
        </div>
      </div>

      {/* Reconciliation Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">Shift</label>
              <Select value={shift} onValueChange={setShift}>
                <SelectTrigger data-testid="select-shift">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day Shift (6 AM - 6 PM)</SelectItem>
                  <SelectItem value="night">Night Shift (6 PM - 6 AM)</SelectItem>
                  <SelectItem value="full">Full Day (24 Hours)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">Date</label>
              <Input
                type="date"
                value={reconciliationDate}
                onChange={(e) => setReconciliationDate(e.target.value)}
                data-testid="input-reconciliation-date"
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" data-testid="button-load-data">
                Load Shift Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold" data-testid="opening-balance">₹{cashData.openingBalance.toLocaleString()}</div>
              <div className="text-sm text-green-100">Opening Balance</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold" data-testid="expected-cash">₹{cashData.expectedCash.toLocaleString()}</div>
              <div className="text-sm text-blue-100">Expected Cash</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold" data-testid="actual-cash">₹{cashData.actualCash.toLocaleString()}</div>
              <div className="text-sm text-purple-100">Actual Cash</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold" data-testid="cash-difference">₹{Math.abs(cashData.difference).toLocaleString()}</div>
              <div className="text-sm text-red-100">
                {cashData.difference >= 0 ? 'Excess' : 'Shortage'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Counting */}
        <Card>
          <CardHeader>
            <CardTitle>Cash Denomination Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {denominations.map((denom, index) => (
                <div key={denom.value} className="grid grid-cols-4 gap-4 items-center">
                  <div className="font-medium">₹{denom.value}</div>
                  <div className="text-center">×</div>
                  <Input
                    type="number"
                    defaultValue={denom.count}
                    className="text-center"
                    data-testid={`denom-count-${denom.value}`}
                  />
                  <div className="text-right font-semibold" data-testid={`denom-total-${denom.value}`}>
                    ₹{denom.total.toLocaleString()}
                  </div>
                </div>
              ))}
              <div className="border-t pt-3 mt-4">
                <div className="grid grid-cols-4 gap-4 font-bold">
                  <div>Total Cash:</div>
                  <div></div>
                  <div></div>
                  <div className="text-right text-lg" data-testid="total-counted-cash">
                    ₹{cashData.actualCash.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Shift Sales Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-md">
                <span className="font-medium">Cash Sales</span>
                <span className="text-lg font-bold text-green-600" data-testid="cash-sales">
                  ₹{cashData.expectedCash.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-md">
                <span className="font-medium">Card Sales</span>
                <span className="text-lg font-bold text-blue-600" data-testid="card-sales">
                  ₹{cashData.cardSales.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-md">
                <span className="font-medium">Credit Sales</span>
                <span className="text-lg font-bold text-orange-600" data-testid="credit-sales">
                  ₹{cashData.creditSales.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-md">
                <span className="font-medium">Expenses Paid</span>
                <span className="text-lg font-bold text-red-600" data-testid="expenses-paid">
                  ₹{cashData.expenses.toLocaleString()}
                </span>
              </div>
              
              <div className="border-t pt-4 mt-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Net Cash Movement:</span>
                  <span className="text-xl font-bold text-primary" data-testid="net-cash-movement">
                    ₹{(cashData.expectedCash - cashData.expenses).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation Status */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <div className="font-semibold text-lg">
                Cash Reconciliation - {shift.charAt(0).toUpperCase() + shift.slice(1)} Shift
              </div>
              <div className="text-sm text-muted-foreground">
                Date: {new Date(reconciliationDate).toLocaleDateString('en-IN')}
              </div>
            </div>
            <div className="text-right">
              <Badge
                variant={Math.abs(cashData.difference) <= 100 ? 'default' : 'destructive'}
                className={Math.abs(cashData.difference) <= 100 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                data-testid="reconciliation-status"
              >
                {Math.abs(cashData.difference) <= 100 ? 'Balanced' : 'Variance Detected'}
              </Badge>
              {cashData.difference !== 0 && (
                <div className={`mt-2 font-semibold ${cashData.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {cashData.difference > 0 ? 'Excess: ' : 'Shortage: '}
                  ₹{Math.abs(cashData.difference)}
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4 flex justify-end space-x-2">
            <Button variant="outline" data-testid="button-save-draft">
              Save Draft
            </Button>
            <Button data-testid="button-complete-reconciliation">
              Complete Reconciliation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
