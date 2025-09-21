import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  Printer, 
  Download, 
  FileText, 
  Image, 
  ChevronDown 
} from "lucide-react";

type PrintType = 'invoice' | 'receipt' | 'statement' | 'expense' | 'purchaseOrder' | 'pumpReading';
type PrintFormat = 'pdf' | 'png';

interface PrintActionsProps {
  /** The type of document to print */
  type: PrintType;
  /** The ID of the document */
  id: string;
  /** Optional return URL after printing (defaults to current page) */
  returnUrl?: string;
  /** Custom button variant */
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  /** Custom button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Show as individual buttons instead of dropdown */
  layout?: 'dropdown' | 'buttons';
  /** Custom class names */
  className?: string;
}

export function PrintActions({ 
  type, 
  id, 
  returnUrl, 
  variant = "outline", 
  size = "default",
  layout = "dropdown",
  className = ""
}: PrintActionsProps) {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  // Get current URL for return navigation
  const currentUrl = returnUrl || window.location.pathname + window.location.search;

  const handlePrint = () => {
    setIsLoading(true);
    const printUrl = `/print?type=${type}&id=${id}&mode=print&return=${encodeURIComponent(currentUrl)}`;
    navigate(printUrl);
  };

  const handleDownload = (format: PrintFormat) => {
    setIsLoading(true);
    const downloadUrl = `/print?type=${type}&id=${id}&mode=download&format=${format}&return=${encodeURIComponent(currentUrl)}`;
    navigate(downloadUrl);
  };

  // Get document type display name
  const getDocumentName = (type: PrintType) => {
    switch (type) {
      case 'invoice': return 'Invoice';
      case 'receipt': return 'Receipt';
      case 'statement': return 'Statement';
      case 'expense': return 'Expense Receipt';
      case 'purchaseOrder': return 'Purchase Order';
      case 'pumpReading': return 'Pump Reading';
      default: return 'Document';
    }
  };

  if (layout === 'buttons') {
    return (
      <div className={`flex space-x-2 ${className}`}>
        <Button
          onClick={handlePrint}
          variant={variant}
          size={size}
          disabled={isLoading}
          data-testid={`button-print-${type}`}
        >
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
        <Button
          onClick={() => handleDownload('pdf')}
          variant={variant}
          size={size}
          disabled={isLoading}
          data-testid={`button-download-pdf-${type}`}
        >
          <FileText className="w-4 h-4 mr-2" />
          PDF
        </Button>
        <Button
          onClick={() => handleDownload('png')}
          variant={variant}
          size={size}
          disabled={isLoading}
          data-testid={`button-download-png-${type}`}
        >
          <Image className="w-4 h-4 mr-2" />
          PNG
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          disabled={isLoading}
          className={className}
          data-testid={`button-print-actions-${type}`}
        >
          <Printer className="w-4 h-4 mr-2" />
          {isLoading ? 'Loading...' : `Print ${getDocumentName(type)}`}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={handlePrint}
          data-testid={`menu-print-${type}`}
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Document
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => handleDownload('pdf')}
          data-testid={`menu-download-pdf-${type}`}
        >
          <FileText className="w-4 h-4 mr-2" />
          Download as PDF
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleDownload('png')}
          data-testid={`menu-download-png-${type}`}
        >
          <Image className="w-4 h-4 mr-2" />
          Download as PNG
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default PrintActions;