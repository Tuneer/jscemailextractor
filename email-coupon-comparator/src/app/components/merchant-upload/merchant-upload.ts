import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MerchantService } from '../../services/merchant.service';
import { ComparisonService } from '../../services/comparison.service';
import { EmailService } from '../../services/email.service';
import { MerchantData, MerchantItem } from '../../models/merchant.model';
import { Coupon, ComparisonResult } from '../../models/coupon.model';
import { EmailWithAttachments } from '../../models/email.model';
import { ComparisonResultsComponent } from '../comparison-results/comparison-results';

@Component({
  selector: 'app-merchant-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ComparisonResultsComponent],
  templateUrl: './merchant-upload.html',
  styleUrls: ['./merchant-upload.css']
})
export class MerchantUploadComponent implements OnInit {
  @Output() comparisonComplete = new EventEmitter<ComparisonResult>();

  // Data
  currentMerchant: MerchantData | null = null;
  emails: EmailWithAttachments[] = [];
  selectedAttachmentIds: number[] = [];
  extractedCoupons: Coupon[] = [];
  comparisonResult: ComparisonResult | null = null;

  // UI State
  activeStep: 'upload' | 'select' | 'compare' | 'results' = 'upload';
  loading = false;
  error: string | null = null;
  success: string | null = null;
  
  // Preview
  previewItems: MerchantItem[] = [];
  showPreview = false;
  previewType: 'items' | 'coupons' = 'items';

  constructor(
    private merchantService: MerchantService,
    private comparisonService: ComparisonService,
    private emailService: EmailService
  ) {}

  ngOnInit(): void {
    this.currentMerchant = this.merchantService.getCurrentMerchant();
    this.loadEmails();
  }

  loadEmails(): void {
    this.emailService.getEmailsWithAttachments().subscribe({
      next: (response) => {
        if (response.success) {
          this.emails = response.emails;
        }
      },
      error: (err) => {
        console.error('Error loading emails:', err);
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.loading = true;
    this.error = null;

    this.merchantService.parseExcelFile(file).then(
      (data) => {
        this.currentMerchant = data;
        this.merchantService.setCurrentMerchant(data);
        this.loading = false;
        this.success = `Successfully loaded ${data.items.length} items for ${data.merchantName}`;
        if (data.store) {
          this.success += ` (${data.store.storeName})`;
        }
        setTimeout(() => this.success = null, 5000);
      },
      (err) => {
        this.error = `Error parsing file: ${err.message}`;
        this.loading = false;
      }
    );
  }

  clearData(): void {
    this.merchantService.setCurrentMerchant({
      merchantName: '',
      items: [],
      sales: []
    });
    this.currentMerchant = null;
    this.comparisonResult = null;
    this.extractedCoupons = [];
    this.selectedAttachmentIds = [];
    this.activeStep = 'upload';
  }

  goToStep(step: 'upload' | 'select' | 'compare' | 'results'): void {
    if (step === 'select' && !this.currentMerchant) {
      this.error = 'Please upload merchant data first';
      return;
    }
    if (step === 'compare' && this.selectedAttachmentIds.length === 0) {
      this.error = 'Please select at least one attachment';
      return;
    }
    this.error = null;
    this.activeStep = step;
  }

  toggleAttachmentSelection(attachmentId: number): void {
    const index = this.selectedAttachmentIds.indexOf(attachmentId);
    if (index > -1) {
      this.selectedAttachmentIds.splice(index, 1);
    } else {
      this.selectedAttachmentIds.push(attachmentId);
    }
  }

  isAttachmentSelected(attachmentId: number): boolean {
    return this.selectedAttachmentIds.includes(attachmentId);
  }

  extractCoupons(): void {
    if (this.selectedAttachmentIds.length === 0) {
      this.error = 'Please select at least one attachment';
      return;
    }

    this.loading = true;
    this.error = null;
    this.extractedCoupons = [];

    let processed = 0;
    this.selectedAttachmentIds.forEach((attachmentId) => {
      this.emailService.getExcelData(attachmentId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const coupons = this.parseCouponsFromData(response.data, attachmentId);
            this.extractedCoupons.push(...coupons);
          }
          
          processed++;
          if (processed === this.selectedAttachmentIds.length) {
            this.loading = false;
            if (this.extractedCoupons.length > 0) {
              this.goToStep('compare');
            } else {
              this.error = 'No coupon data found in selected attachments';
            }
          }
        },
        error: (err) => {
          console.error('Error extracting data:', err);
          processed++;
          if (processed === this.selectedAttachmentIds.length) {
            this.loading = false;
            if (this.extractedCoupons.length > 0) {
              this.goToStep('compare');
            } else {
              this.error = 'Failed to extract coupon data';
            }
          }
        }
      });
    });
  }

  private parseCouponsFromData(data: any[], attachmentId: number): Coupon[] {
    const coupons: Coupon[] = [];
    
    data.forEach((row, index) => {
      const couponCode = this.findFieldValue(row, ['Coupon Code', 'Code', 'coupon_code', 'PLU', 'UPC', 'Item Code', 'Barcode', 'SKU']) || `COUPON_${index}`;
      const description = this.findFieldValue(row, ['Description', 'description', 'Details', 'Item Name', 'ItemName', 'Product']) || '';
      const discountValue = parseFloat(
        this.findFieldValue(row, ['Discount', 'discount', 'Value', 'value', 'Off', 'Savings', 'Amount']) || 0
      );
      
      const discountType = this.detectDiscountType(row, description, discountValue);
      const applicableItems = this.extractApplicableItems(row);
      const applicableCategories = this.extractApplicableCategories(row);
      
      const coupon: Coupon = {
        couponCode: String(couponCode),
        couponName: this.findFieldValue(row, ['Name', 'name', 'Coupon Name', 'Item Name', 'ProductName']) || '',
        description: String(description),
        discountType,
        discountValue,
        minPurchase: parseFloat(this.findFieldValue(row, ['Min Purchase', 'min_purchase', 'Minimum']) || 0) || undefined,
        maxDiscount: parseFloat(this.findFieldValue(row, ['Max Discount', 'max_discount', 'Maximum']) || 0) || undefined,
        validFrom: this.findFieldValue(row, ['Valid From', 'valid_from', 'Start Date', 'StartDate']) || '',
        validTo: this.findFieldValue(row, ['Valid To', 'valid_to', 'End Date', 'EndDate']) || '',
        applicableItems,
        applicableCategories,
        terms: this.findFieldValue(row, ['Terms', 'terms', 'Conditions']) || '',
        source: 'excel',
        attachmentId,
        extractedText: JSON.stringify(row)
      };
      
      coupons.push(coupon);
    });
    
    return coupons;
  }

  private findFieldValue(row: any, fieldNames: string[]): any {
    for (const name of fieldNames) {
      if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
        return row[name];
      }
      const key = Object.keys(row).find(k => k.toLowerCase() === name.toLowerCase());
      if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return row[key];
      }
    }
    return undefined;
  }

  private detectDiscountType(row: any, description: string, discountValue: number): 'percentage' | 'fixed' | 'buy_x_get_y' {
    const desc = (description || '').toLowerCase();
    
    if (desc.includes('%') || desc.includes('percent') || desc.includes('% off')) {
      return 'percentage';
    }
    if (desc.includes('buy') && desc.includes('get')) {
      return 'buy_x_get_y';
    }
    if (discountValue >= 1 && discountValue <= 100) {
      return 'percentage';
    }
    
    return 'fixed';
  }

  private extractApplicableItems(row: any): string[] {
    const items: string[] = [];
    const itemFields = ['Item Code', 'Item Codes', 'SKU', 'SKUs', 'Product Code', 'Applicable Items', 'UPC', 'Barcode', 'PLU', 'Item UPC', 'ItemId'];
    
    itemFields.forEach(field => {
      const value = this.findFieldValue(row, [field]);
      if (value) {
        const codes = String(value).split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
        items.push(...codes);
      }
    });
    
    return [...new Set(items)];
  }

  private extractApplicableCategories(row: any): string[] {
    const categories: string[] = [];
    const categoryFields = ['Category', 'Categories', 'Department', 'Applicable Categories', 'Dept', 'Type', 'Class'];
    
    categoryFields.forEach(field => {
      const value = this.findFieldValue(row, [field]);
      if (value) {
        const cats = String(value).split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
        categories.push(...cats);
      }
    });
    
    return [...new Set(categories)];
  }

  runComparison(): void {
    if (!this.currentMerchant || this.extractedCoupons.length === 0) {
      this.error = 'Missing data for comparison';
      return;
    }

    this.loading = true;
    this.error = null;

    setTimeout(() => {
      this.comparisonResult = this.comparisonService.performLocalComparison(
        this.currentMerchant!.items,
        this.extractedCoupons,
        this.currentMerchant!.sales
      );

      this.comparisonResult.merchantName = this.currentMerchant!.merchantName;
      
      this.loading = false;
      this.comparisonComplete.emit(this.comparisonResult);
      this.success = `Found ${this.comparisonResult.matchedCoupons.length} matching coupons!`;
      this.goToStep('results');
    }, 500);
  }

  exportResults(): void {
    if (this.comparisonResult) {
      this.comparisonService.exportToExcel(this.comparisonResult);
    }
  }

  showItemPreview(): void {
    if (this.currentMerchant && this.currentMerchant.items.length > 0) {
      this.previewItems = this.currentMerchant.items.slice(0, 50);
      this.previewType = 'items';
      this.showPreview = true;
    }
  }

  showCouponPreview(): void {
    if (this.extractedCoupons.length > 0) {
      this.previewType = 'coupons';
      this.showPreview = true;
    }
  }

  closePreview(): void {
    this.showPreview = false;
  }

  // Helpers
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getCategoryBreakdown(): { name: string; count: number }[] {
    if (!this.currentMerchant) return [];
    
    const categoryCounts = new Map<string, number>();
    this.currentMerchant.items.forEach(item => {
      const cat = item.category || item.department || 'Unknown';
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    });
    
    return Array.from(categoryCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  getVendorBreakdown(): { name: string; count: number }[] {
    if (!this.currentMerchant || !this.currentMerchant.vendors) return [];
    
    const vendorCounts = new Map<string, number>();
    this.currentMerchant.items.forEach(item => {
      const vendor = item.vendor || 'Unknown';
      vendorCounts.set(vendor, (vendorCounts.get(vendor) || 0) + 1);
    });
    
    return Array.from(vendorCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}
