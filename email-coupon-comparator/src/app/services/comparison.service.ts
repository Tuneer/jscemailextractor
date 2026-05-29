import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { 
  ComparisonRequest, 
  ComparisonResponse, 
  ComparisonResult, 
  Coupon, 
  CouponMatch,
  ExportData,
  ExcelSheet 
} from '../models/coupon.model';
import { MerchantItem, SalesData } from '../models/merchant.model';
import { LilaLiquorItem } from '../models/lila-liquor.model';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ComparisonService {
  // Use production API for local development
  private apiUrl = 'https://jscglobalsolutions.info/emailextractor/api';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  compareData(request: ComparisonRequest): Observable<ComparisonResponse> {
    return this.http.post<ComparisonResponse>(
      `${this.apiUrl}/comparison/compare`,
      request,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  performLocalComparison(
    items: MerchantItem[],
    coupons: Coupon[],
    salesData?: SalesData[]
  ): ComparisonResult {
    const matchedCoupons: CouponMatch[] = [];
    const unmatchedItems: string[] = [];
    const matchedItemCodes = new Set<string>();

    items.forEach(item => {
      let itemMatched = false;
      
      coupons.forEach(coupon => {
        const match = this.matchCouponToItem(coupon, item);
        
        if (match.isMatch) {
          itemMatched = true;
          matchedItemCodes.add(item.itemCode);
          
          const estimatedSavings = this.calculateEstimatedSavings(coupon, item, salesData);
          
          matchedCoupons.push({
            coupon,
            item: {
              itemCode: item.itemCode,
              itemName: item.itemName
            },
            matchScore: match.score,
            matchReason: match.reason,
            estimatedSavings
          });
        }
      });

      if (!itemMatched) {
        unmatchedItems.push(item.itemCode);
      }
    });

    const unmatchedCoupons = coupons.filter(c => 
      !matchedCoupons.some(mc => mc.coupon.couponCode === c.couponCode)
    );

    const totalPotentialSavings = matchedCoupons.reduce((sum, mc) => sum + mc.estimatedSavings, 0);
    const averageDiscount = coupons.length > 0 
      ? coupons.reduce((sum, c) => sum + c.discountValue, 0) / coupons.length 
      : 0;

    const bestCoupon = matchedCoupons.length > 0
      ? matchedCoupons.reduce((best, current) => 
          current.estimatedSavings > best.estimatedSavings ? current : best
        ).coupon
      : undefined;

    return {
      merchantName: 'Local Comparison',
      totalItems: items.length,
      totalCoupons: coupons.length,
      matchedCoupons,
      unmatchedItems,
      unmatchedCoupons,
      summary: {
        totalPotentialSavings,
        averageDiscount,
        bestCoupon
      }
    };
  }

  // Lila Liquor specific comparison
  performLilaLiquorComparison(
    items: LilaLiquorItem[],
    coupons: Coupon[],
    storeName: string = 'Lila Wine and Spirits'
  ): ComparisonResult {
    const matchedCoupons: CouponMatch[] = [];
    const unmatchedItems: string[] = [];
    const matchedItemIds = new Set<string>();

    items.forEach(item => {
      let itemMatched = false;
      
      coupons.forEach(coupon => {
        const match = this.matchCouponToLilaLiquorItem(coupon, item);
        
        if (match.isMatch) {
          itemMatched = true;
          matchedItemIds.add(String(item.ItemId));
          
          const estimatedSavings = this.calculateLilaLiquorSavings(coupon, item);
          
          matchedCoupons.push({
            coupon,
            item: {
              itemCode: String(item.ItemId || item.BarCodeID),
              itemName: item.ItemNameLine1
            },
            matchScore: match.score,
            matchReason: match.reason,
            estimatedSavings
          });
        }
      });

      if (!itemMatched) {
        unmatchedItems.push(String(item.ItemId || item.BarCodeID));
      }
    });

    const unmatchedCoupons = coupons.filter(c => 
      !matchedCoupons.some(mc => mc.coupon.couponCode === c.couponCode)
    );

    const totalPotentialSavings = matchedCoupons.reduce((sum, mc) => sum + mc.estimatedSavings, 0);
    const averageDiscount = coupons.length > 0 
      ? coupons.reduce((sum, c) => sum + c.discountValue, 0) / coupons.length 
      : 0;

    const bestCoupon = matchedCoupons.length > 0
      ? matchedCoupons.reduce((best, current) => 
          current.estimatedSavings > best.estimatedSavings ? current : best
        ).coupon
      : undefined;

    return {
      merchantName: storeName,
      totalItems: items.length,
      totalCoupons: coupons.length,
      matchedCoupons,
      unmatchedItems,
      unmatchedCoupons,
      summary: {
        totalPotentialSavings,
        averageDiscount,
        bestCoupon
      }
    };
  }

  private matchCouponToLilaLiquorItem(coupon: Coupon, item: LilaLiquorItem): { isMatch: boolean; score: number; reason: string } {
    let score = 0;
    const reasons: string[] = [];

    const itemId = String(item.ItemId || item.BarCodeID || '');
    const itemName = (item.ItemNameLine1 || '').toLowerCase();
    const deptName = (item.DepartmentName || '').toLowerCase();
    const vendorName = (item.VendorName || '').toLowerCase();
    const supplierCode = item.SupplierItemCode || '';

    // Check if coupon has applicable items
    if (coupon.applicableItems && coupon.applicableItems.length > 0) {
      const itemMatch = coupon.applicableItems.some(code => {
        const codeLower = code.toLowerCase();
        return (
          codeLower === itemId.toLowerCase() ||
          codeLower === String(item.BarCodeID).toLowerCase() ||
          codeLower === supplierCode.toLowerCase() ||
          itemId.toLowerCase().includes(codeLower) ||
          String(item.BarCodeID).toLowerCase().includes(codeLower) ||
          itemName.includes(codeLower) ||
          codeLower.includes(itemId.toLowerCase())
        );
      });
      
      if (itemMatch) {
        score += 50;
        reasons.push('Direct item/barcode/supplier code match');
      }
    }

    // Check category/department match (Beer, Wine, Liquor)
    if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
      const categoryMatch = coupon.applicableCategories.some(cat => {
        const catLower = cat.toLowerCase();
        return (
          catLower === deptName ||
          deptName.includes(catLower) ||
          catLower.includes(deptName)
        );
      });
      
      if (categoryMatch) {
        score += 40;
        reasons.push(`Department match: ${item.DepartmentName}`);
      }
    }

    // Check exclusions
    if (coupon.exclusions && coupon.exclusions.length > 0) {
      const isExcluded = coupon.exclusions.some(exclusion => {
        const exclLower = exclusion.toLowerCase();
        return (
          itemId.toLowerCase().includes(exclLower) ||
          itemName.includes(exclLower) ||
          deptName.includes(exclLower)
        );
      });
      
      if (isExcluded) {
        return { isMatch: false, score: 0, reason: 'Item excluded by coupon' };
      }
    }

    // Check description for brand/vendor matches
    if (coupon.description) {
      const descLower = coupon.description.toLowerCase();
      
      // Check if item name appears in coupon description
      if (descLower.includes(itemName) || itemName.includes(descLower)) {
        score += 25;
        reasons.push('Item name found in coupon description');
      }
      
      // Check if vendor/brand name appears in coupon
      if (vendorName && descLower.includes(vendorName)) {
        score += 20;
        reasons.push(`Vendor match: ${item.VendorName}`);
      }
    }

    // Check coupon name for item matches
    if (coupon.couponName) {
      const couponNameLower = coupon.couponName.toLowerCase();
      
      if (itemName.includes(couponNameLower) || couponNameLower.includes(itemName)) {
        score += 30;
        reasons.push('Coupon name matches item');
      }
      
      if (vendorName && couponNameLower.includes(vendorName)) {
        score += 15;
        reasons.push('Vendor in coupon name');
      }
    }

    const isMatch = score >= 30;
    return {
      isMatch,
      score,
      reason: reasons.length > 0 ? reasons.join(', ') : 'No significant match found'
    };
  }

  private calculateLilaLiquorSavings(coupon: Coupon, item: LilaLiquorItem): number {
    const itemPrice = item.Price || 0;
    let savings = 0;

    if (coupon.discountType === 'percentage') {
      savings = itemPrice * (coupon.discountValue / 100);
      if (coupon.maxDiscount) {
        savings = Math.min(savings, coupon.maxDiscount);
      }
    } else if (coupon.discountType === 'fixed') {
      savings = coupon.discountValue;
    }

    return Math.round(savings * 100) / 100;
  }

  private matchCouponToItem(coupon: Coupon, item: MerchantItem): { isMatch: boolean; score: number; reason: string } {
    let score = 0;
    const reasons: string[] = [];

    if (coupon.applicableItems && coupon.applicableItems.length > 0) {
      const itemMatch = coupon.applicableItems.some(code => 
        code.toLowerCase() === item.itemCode.toLowerCase() ||
        item.itemCode.toLowerCase().includes(code.toLowerCase()) ||
        code.toLowerCase().includes(item.itemCode.toLowerCase())
      );
      
      if (itemMatch) {
        score += 50;
        reasons.push('Direct item code match');
      }
    }

    if (coupon.applicableCategories && coupon.applicableCategories.length > 0 && item.category) {
      const categoryMatch = coupon.applicableCategories.some(cat => 
        cat.toLowerCase() === item.category?.toLowerCase() ||
        item.category?.toLowerCase().includes(cat.toLowerCase()) ||
        cat.toLowerCase().includes(item.category?.toLowerCase() || '')
      );
      
      if (categoryMatch) {
        score += 30;
        reasons.push('Category match');
      }
    }

    if (coupon.exclusions && coupon.exclusions.length > 0) {
      const isExcluded = coupon.exclusions.some(exclusion => 
        item.itemCode.toLowerCase().includes(exclusion.toLowerCase()) ||
        item.itemName.toLowerCase().includes(exclusion.toLowerCase())
      );
      
      if (isExcluded) {
        return { isMatch: false, score: 0, reason: 'Item excluded by coupon' };
      }
    }

    if (coupon.description) {
      const descLower = coupon.description.toLowerCase();
      const itemNameLower = item.itemName.toLowerCase();
      const brandLower = item.brand?.toLowerCase() || '';
      
      if (descLower.includes(itemNameLower) || itemNameLower.includes(descLower)) {
        score += 20;
        reasons.push('Name similarity in description');
      }
      
      if (brandLower && descLower.includes(brandLower)) {
        score += 15;
        reasons.push('Brand mentioned in coupon');
      }
    }

    const isMatch = score >= 30;
    return {
      isMatch,
      score,
      reason: reasons.length > 0 ? reasons.join(', ') : 'No significant match found'
    };
  }

  private calculateEstimatedSavings(coupon: Coupon, item: MerchantItem, salesData?: SalesData[]): number {
    const itemPrice = item.price || 0;
    let savings = 0;

    if (coupon.discountType === 'percentage') {
      savings = itemPrice * (coupon.discountValue / 100);
      if (coupon.maxDiscount) {
        savings = Math.min(savings, coupon.maxDiscount);
      }
    } else if (coupon.discountType === 'fixed') {
      savings = coupon.discountValue;
    }

    if (salesData) {
      const itemSales = salesData.find(s => s.itemCode === item.itemCode);
      if (itemSales) {
        savings *= (itemSales.quantitySold || 1);
      }
    }

    return Math.round(savings * 100) / 100;
  }

  exportToExcel(result: ComparisonResult): void {
    const sheets: ExcelSheet[] = [];

    sheets.push({
      name: 'Summary',
      data: [{
        'Merchant Name': result.merchantName,
        'Total Items': result.totalItems,
        'Total Coupons': result.totalCoupons,
        'Matched Coupons': result.matchedCoupons.length,
        'Total Potential Savings': result.summary.totalPotentialSavings,
        'Average Discount': result.summary.averageDiscount + '%'
      }],
      headers: ['Merchant Name', 'Total Items', 'Total Coupons', 'Matched Coupons', 'Total Potential Savings', 'Average Discount']
    });

    if (result.matchedCoupons.length > 0) {
      sheets.push({
        name: 'Matched Coupons',
        data: result.matchedCoupons.map(mc => ({
          'Coupon Code': mc.coupon.couponCode,
          'Coupon Name': mc.coupon.couponName || '',
          'Discount Type': mc.coupon.discountType,
          'Discount Value': mc.coupon.discountValue,
          'Item Code': mc.item.itemCode,
          'Item Name': mc.item.itemName,
          'Match Score': mc.matchScore,
          'Match Reason': mc.matchReason,
          'Estimated Savings': mc.estimatedSavings
        })),
        headers: ['Coupon Code', 'Coupon Name', 'Discount Type', 'Discount Value', 'Item Code', 'Item Name', 'Match Score', 'Match Reason', 'Estimated Savings']
      });
    }

    if (result.unmatchedItems.length > 0) {
      sheets.push({
        name: 'Unmatched Items',
        data: result.unmatchedItems.map(code => ({ 'Item Code': code })),
        headers: ['Item Code']
      });
    }

    if (result.unmatchedCoupons.length > 0) {
      sheets.push({
        name: 'Unmatched Coupons',
        data: result.unmatchedCoupons.map(c => ({
          'Coupon Code': c.couponCode,
          'Coupon Name': c.couponName || '',
          'Discount Type': c.discountType,
          'Discount Value': c.discountValue,
          'Source': c.source,
          'Attachment': c.attachmentFilename || ''
        })),
        headers: ['Coupon Code', 'Coupon Name', 'Discount Type', 'Discount Value', 'Source', 'Attachment']
      });
    }

    this.generateExcelFile(sheets, `Coupon_Comparison_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  private generateExcelFile(sheets: ExcelSheet[], filename: string): void {
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();

    sheets.forEach(sheet => {
      const worksheet = XLSX.utils.json_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });

    XLSX.writeFile(workbook, filename);
  }

  private handleError(error: any) {
    console.error('Comparison Service Error:', error);
    return throwError(() => new Error(error.message || 'Server error'));
  }
}
