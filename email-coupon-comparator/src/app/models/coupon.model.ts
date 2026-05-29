export interface Coupon {
  id?: number;
  couponCode: string;
  couponName?: string;
  description?: string;
  discountType: 'percentage' | 'fixed' | 'buy_x_get_y';
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  validFrom?: string;
  validTo?: string;
  applicableItems?: string[];
  applicableCategories?: string[];
  exclusions?: string[];
  terms?: string;
  source: 'excel' | 'pdf';
  attachmentId?: number;
  attachmentFilename?: string;
  extractedText?: string;
}

export interface CouponMatch {
  coupon: Coupon;
  item: {
    itemCode: string;
    itemName: string;
  };
  matchScore: number;
  matchReason: string;
  estimatedSavings: number;
}

export interface ComparisonResult {
  merchantName: string;
  totalItems: number;
  totalCoupons: number;
  matchedCoupons: CouponMatch[];
  unmatchedItems: string[];
  unmatchedCoupons: Coupon[];
  summary: {
    totalPotentialSavings: number;
    averageDiscount: number;
    bestCoupon?: Coupon;
  };
}

export interface ComparisonRequest {
  merchantId: number;
  attachmentIds: number[];
  comparisonType: 'items_only' | 'items_and_sales';
}

export interface ComparisonResponse {
  success: boolean;
  results: ComparisonResult;
  exportUrl?: string;
  message?: string;
}

export interface ExcelSheet {
  name: string;
  data: any[];
  headers: string[];
}

export interface ExportData {
  sheets: ExcelSheet[];
  filename: string;
}
