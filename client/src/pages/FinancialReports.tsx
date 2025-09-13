import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";

export default function FinancialReports() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [reportType, setReportType] = useState("profit-loss");
  const [period, setPeriod] = useState("this-month");

  const { data: financialData, isLoading } = useQuery({
    queryKey: ["/api/reports/financial", user?.stationId, period],
    enabled: !!user?.stationId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-semibold text-card-foreground mb-2">Financial Reports</h3>
        <p className="text-muted-foreground">
          Comprehensive financial statements and analysis for your petrol pump business
        </p>
      </div>

      {/* Report Selection */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profit-loss">Profit & Loss Statement</SelectItem>
                  <SelectItem value="balance-sheet">Balance Sheet</SelectItem>
                  <SelectItem value="cash-flow">Cash Flow Statement</SelectItem>
                  <SelectItem value="sales-analysis">Sales Analysis</SelectItem>
                  <SelectItem value="expense-analysis">Expense Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">Period</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger data-testid="select-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="this-quarter">This Quarter</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" data-testid="button-generate-report">
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profit & Loss Statement */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Profit & Loss Statement</CardTitle>
              <p className="text-sm text-muted-foreground">For the month of January 2024</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" data-testid="button-export">
                📊 Export
              </Button>
              <Button variant="outline" size="sm" data-testid="button-print">
                🖨️ Print
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue Section */}
            <div>
              <h5 className="font-semibold text-card-foreground mb-4 pb-2 border-b border-border">
                Revenue
              </h5>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Petrol Sales</span>
                  <span className="font-medium" data-testid="petrol-revenue">{formatCurrency(850000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diesel Sales</span>
                  <span className="font-medium" data-testid="diesel-revenue">{formatCurrency(420000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Other Services</span>
                  <span className="font-medium" data-testid="other-revenue">{formatCurrency(25000)}</span>
                </div>
                <div className="border-t border-border pt-3 mt-4">
                  <div className="flex justify-between font-semibold">
                    <span>Total Revenue</span>
                    <span className="text-green-600" data-testid="total-revenue">{formatCurrency(1295000)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            <div>
              <h5 className="font-semibold text-card-foreground mb-4 pb-2 border-b border-border">
                Expenses
              </h5>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost of Goods Sold</span>
                  <span className="font-medium" data-testid="cogs">{formatCurrency(1180000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staff Salaries</span>
                  <span className="font-medium" data-testid="salaries">{formatCurrency(35000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Electricity & Utilities</span>
                  <span className="font-medium" data-testid="utilities">{formatCurrency(8500)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maintenance</span>
                  <span className="font-medium" data-testid="maintenance">{formatCurrency(12000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Insurance</span>
                  <span className="font-medium" data-testid="insurance">{formatCurrency(3500)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Other Expenses</span>
                  <span className="font-medium" data-testid="other-expenses">{formatCurrency(5200)}</span>
                </div>
                <div className="border-t border-border pt-3 mt-4">
                  <div className="flex justify-between font-semibold">
                    <span>Total Expenses</span>
                    <span className="text-red-600" data-testid="total-expenses">{formatCurrency(1244200)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Net Profit */}
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-card-foreground">Net Profit</span>
              <span className="text-2xl font-bold text-green-600" data-testid="net-profit">{formatCurrency(50800)}</span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Profit Margin: 3.92% | Previous Month: {formatCurrency(45200)} (+12.4%)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
