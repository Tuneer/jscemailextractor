import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LilaLiquorService } from '../../services/lila-liquor.service';
import { ComparisonService } from '../../services/comparison.service';
import { EmailService } from '../../services/email.service';
import { LilaLiquorData, LilaLiquorItem } from '../../models/lila-liquor.model';
import { Coupon, ComparisonResult } from '../../models/coupon.model';
import { EmailWithAttachments, Attachment } from '../../models/email.model';
import { ComparisonResultsComponent } from '../comparison-results/comparison-results';

@Component({
  selector: 'app-lila-liquor-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ComparisonResultsComponent],
  templateUrl: './lila-liquor-upload.html',
  styleUrls: ['./lila-liquor-upload.css']
})
export class LilaLiquorUploadComponent implements OnInit {
  @Output() comparisonComplete = new EventEmitter<ComparisonResult>();

  // Data
  currentData: LilaLiquorData | null = null;
  emails: EmailWithAttachments[] = [];
  selectedAttachmentIds: number[] = [];
  extractedCoupons: Coupon[] = [];
  comparisonResult: ComparisonResult | null = null;

  // UI State
  activeStep: 'upload' | 'select' | 'compare' | 'results' = 'upload';
  loading = false;
  error: string | null = null;
  success: string | null = null;
  showItemPreview = false;
  showCouponPreview = false;

  // Preview
  previewItems: LilaLiquorItem[] = [];

  constructor(
    private lilaLiquorService: LilaLiquorService,
    private comparisonService: ComparisonService,
    private emailService: EmailService
  ) {}

  ngOnInit(): void {
    this.currentData = this.lilaLiquorService.getCurrentData();
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

    this.lilaLiquorService.parseLilaLiquorExcel(file).then(
      (data) => {
        this.currentData = data;
        this.lilaLiquorService.setCurrentData(data);
        this.loading = false;
        this.success = `Successfully loaded ${data.itemCount} items for ${data.store.StoreName}`;
        setTimeout(() => this.success = null, 5000);
      },
      (err) => {
        this.error = `Error parsing file: ${err.message}`;
        this.loading = false;
      }
    );
  }

  clearData(): void {
    this.lilaLiquorService.clearData();
    this.currentData = null;
    this.comparisonResult = null;
    this.extractedCoupons = [];
    this.selectedAttachmentIds = [];
    this.activeStep = 'upload';
  }

  goToStep(step: 'upload' | 'select' | 'compare' | 'results'): void {
    if (step === 'select' && !this.currentData) {
      this.error = 'Please upload Lila Liquor data first';
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
      // Try to identify coupon columns
      const couponCode = row['Coupon Code'] || row['Code'] || row['coupon_code'] || 
                         row['PLU'] || row['UPC'] || row['Item Code'] || 
                         row['Barcode'] || `COUPON_${index}`;
      
      const description = row['Description'] || row['description'] || row['Details'] || 
                          row['Item Name'] || row['ItemName'] || row['Product'] || '';
      
      const discountValue = parseFloat(
        row['Discount'] || row['discount'] || row['Value'] || row['value'] || 
        row['Off'] || row['Savings'] || 0
      );
      
      const discountType = this.detectDiscountType(row, description, discountValue);
      
      // Extract applicable items
      const applicableItems = this.extractApplicableItems(row);
      const applicableCategories = this.extractApplicableCategories(row);
      
      const coupon: Coupon = {
        couponCode: String(couponCode),
        couponName: row['Name'] || row['name'] || row['Coupon Name'] || row['Item Name'] || '',
        description: String(description),
        discountType,
        discountValue,
        minPurchase: parseFloat(row['Min Purchase'] || row['min_purchase'] || 0) || undefined,
        maxDiscount: parseFloat(row['Max Discount'] || row['max_discount'] || 0) || undefined,
        validFrom: row['Valid From'] || row['valid_from'] || row['Start Date'] || '',
        validTo: row['Valid To'] || row['valid_to'] || row['End Date'] || '',
        applicableItems,
        applicableCategories,
        terms: row['Terms'] || row['terms'] || row['Conditions'] || '',
        source: 'excel',
        attachmentId,
        extractedText: JSON.stringify(row)
      };
      
      coupons.push(coupon);
    });
    
    return coupons;
  }

  private detectDiscountType(row: any, description: string, discountValue: number): 'percentage' | 'fixed' | 'buy_x_get_y' {
    const desc = (description || '').toLowerCase();
    
    if (desc.includes('%') || desc.includes('percent') || desc.includes('% off')) {
      return 'percentage';
    }
    if (desc.includes('buy') && desc.includes('get')) {
      return 'buy_x_get_y';
    }
    if (row['Discount Type']?.toLowerCase().includes('percent')) {
      return 'percentage';
    }
    if (row['Discount Type']?.toLowerCase().includes('fixed')) {
      return 'fixed';
    }
    
    // Heuristic: if discount value is less than 1, assume percentage
    if (discountValue > 0 && discountValue < 1) {
      return 'percentage';
    }
    // If discount value is between 1 and 100, could be either
    // Default to percentage for values 1-100
    if (discountValue >= 1 && discountValue <= 100) {
      return 'percentage';
    }
    
    return 'fixed';
  }

  private extractApplicableItems(row: any): string[] {
    const items: string[] = [];
    const itemFields = ['Item Code', 'Item Codes', 'SKU', 'SKUs', 'Product Code', 
                        'Applicable Items', 'UPC', 'Barcode', 'PLU', 'Item UPC'];
    
    itemFields.forEach(field => {
      if (row[field]) {
        const codes = String(row[field]).split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
        items.push(...codes);
      }
    });
    
    return [...new Set(items)];
  }

  private extractApplicableCategories(row: any): string[] {
    const categories: string[] = [];
    const categoryFields = ['Category', 'Categories', 'Department', 'Applicable Categories',
                            'Dept', 'Type', 'Class'];
    
    categoryFields.forEach(field => {
      if (row[field]) {
        const cats = String(row[field]).split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
        categories.push(...cats);
      }
    });
    
    return [...new Set(categories)];
  }

  runComparison(): void {
    if (!this.currentData || this.extractedCoupons.length === 0) {
      this.error = 'Missing data for comparison';
      return;
    }

    this.loading = true;
    this.error = null;

    setTimeout(() => {
      this.comparisonResult = this.comparisonService.performLilaLiquorComparison(
        this.currentData!.items,
        this.extractedCoupons,
        this.currentData!.store.StoreName
      );

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

  getDepartmentBreakdown(): { name: string; count: number }[] {
    if (!this.currentData) return [];
    
    const deptCounts = new Map<string, number>();
    this.currentData.items.forEach(item => {
      const dept = item.DepartmentName || 'Unknown';
      deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1);
    });
    
    return Array.from(deptCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }
}
