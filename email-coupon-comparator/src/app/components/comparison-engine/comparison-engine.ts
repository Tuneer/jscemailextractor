import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmailService } from '../../services/email.service';
import { MerchantService } from '../../services/merchant.service';
import { ComparisonService } from '../../services/comparison.service';
import { EmailWithAttachments, Attachment } from '../../models/email.model';
import { MerchantData, UploadedFile } from '../../models/merchant.model';
import { Coupon, ComparisonResult } from '../../models/coupon.model';

@Component({
  selector: 'app-comparison-engine',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comparison-engine.html',
  styleUrls: ['./comparison-engine.css']
})
export class ComparisonEngineComponent implements OnInit {
  @Output() comparisonComplete = new EventEmitter<ComparisonResult>();

  emails: EmailWithAttachments[] = [];
  currentMerchant: MerchantData | null = null;
  uploadedFiles: UploadedFile[] = [];
  
  selectedAttachmentIds: number[] = [];
  comparisonType: 'items_only' | 'items_and_sales' = 'items_only';
  
  loading = false;
  error: string | null = null;
  success: string | null = null;
  
  extractedCoupons: Coupon[] = [];
  comparisonResult: ComparisonResult | null = null;
  
  activeStep: 1 | 2 | 3 = 1;

  constructor(
    private emailService: EmailService,
    private merchantService: MerchantService,
    private comparisonService: ComparisonService
  ) {}

  ngOnInit(): void {
    this.loadEmails();
    this.currentMerchant = this.merchantService.getCurrentMerchant();
    
    this.merchantService.uploadedFiles$.subscribe(files => {
      this.uploadedFiles = files;
      if (!this.currentMerchant && files.length > 0) {
        const itemsFile = files.find(f => f.type === 'items');
        if (itemsFile) {
          this.currentMerchant = {
            merchantName: 'Current Upload',
            items: itemsFile.data as any[],
            sales: files.find(f => f.type === 'sales')?.data as any[] || [],
            uploadedAt: new Date()
          };
        }
      }
    });
  }

  loadEmails(): void {
    this.loading = true;
    this.emailService.getEmailsWithAttachments().subscribe({
      next: (response) => {
        if (response.success) {
          this.emails = response.emails;
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error loading emails: ' + err.message;
        this.loading = false;
      }
    });
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

  selectAllAttachmentsFromEmail(email: EmailWithAttachments): void {
    if (!email.attachments) return;
    
    const allSelected = email.attachments.every(att => 
      this.selectedAttachmentIds.includes(att.id)
    );
    
    if (allSelected) {
      email.attachments.forEach(att => {
        const index = this.selectedAttachmentIds.indexOf(att.id);
        if (index > -1) {
          this.selectedAttachmentIds.splice(index, 1);
        }
      });
    } else {
      email.attachments.forEach(att => {
        if (!this.selectedAttachmentIds.includes(att.id)) {
          this.selectedAttachmentIds.push(att.id);
        }
      });
    }
  }

  goToStep(step: 1 | 2 | 3): void {
    if (step === 2 && this.selectedAttachmentIds.length === 0) {
      this.error = 'Please select at least one attachment';
      return;
    }
    if (step === 3 && (!this.currentMerchant || this.currentMerchant.items.length === 0)) {
      this.error = 'Please upload merchant items data first';
      return;
    }
    this.error = null;
    this.activeStep = step;
  }

  extractCouponsFromAttachments(): void {
    this.loading = true;
    this.error = null;
    this.extractedCoupons = [];

    this.selectedAttachmentIds.forEach((attachmentId, index) => {
      this.emailService.getExcelData(attachmentId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const coupons = this.parseCouponsFromData(response.data, attachmentId);
            this.extractedCoupons.push(...coupons);
          }
          
          if (index === this.selectedAttachmentIds.length - 1) {
            this.loading = false;
            this.goToStep(3);
          }
        },
        error: (err) => {
          console.error('Error extracting data:', err);
          if (index === this.selectedAttachmentIds.length - 1) {
            this.loading = false;
            if (this.extractedCoupons.length > 0) {
              this.goToStep(3);
            } else {
              this.error = 'Failed to extract coupon data from attachments';
            }
          }
        }
      });
    });
  }

  private parseCouponsFromData(data: any[], attachmentId: number): Coupon[] {
    const coupons: Coupon[] = [];
    
    data.forEach((row, index) => {
      const couponCode = row['Coupon Code'] || row['Code'] || row['coupon_code'] || row['code'] || `COUPON_${index}`;
      const description = row['Description'] || row['description'] || row['Details'] || '';
      const discountValue = parseFloat(row['Discount'] || row['discount'] || row['Value'] || row['value'] || 0);
      const discountType = this.detectDiscountType(row, description);
      
      const applicableItems = this.extractApplicableItems(row);
      const applicableCategories = this.extractApplicableCategories(row);
      
      const coupon: Coupon = {
        couponCode: String(couponCode),
        couponName: row['Name'] || row['name'] || row['Coupon Name'] || '',
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

  private detectDiscountType(row: any, description: string): 'percentage' | 'fixed' | 'buy_x_get_y' {
    const desc = (description || '').toLowerCase();
    
    if (desc.includes('%') || desc.includes('percent') || desc.includes('off')) {
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
    
    const discountValue = parseFloat(row['Discount'] || row['discount'] || 0);
    if (discountValue > 0 && discountValue < 1) {
      return 'percentage';
    }
    
    return 'fixed';
  }

  private extractApplicableItems(row: any): string[] {
    const items: string[] = [];
    const itemFields = ['Item Code', 'Item Codes', 'SKU', 'SKUs', 'Product Code', 'Applicable Items'];
    
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
    const categoryFields = ['Category', 'Categories', 'Department', 'Applicable Categories'];
    
    categoryFields.forEach(field => {
      if (row[field]) {
        const cats = String(row[field]).split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
        categories.push(...cats);
      }
    });
    
    return [...new Set(categories)];
  }

  runComparison(): void {
    if (!this.currentMerchant || this.extractedCoupons.length === 0) {
      this.error = 'Missing merchant data or coupon data';
      return;
    }

    this.loading = true;
    this.error = null;

    setTimeout(() => {
      this.comparisonResult = this.comparisonService.performLocalComparison(
        this.currentMerchant!.items,
        this.extractedCoupons,
        this.comparisonType === 'items_and_sales' ? this.currentMerchant!.sales : undefined
      );

      this.comparisonResult.merchantName = this.currentMerchant!.merchantName;
      
      this.loading = false;
      this.comparisonComplete.emit(this.comparisonResult);
      this.success = `Comparison complete! Found ${this.comparisonResult.matchedCoupons.length} matching coupons.`;
    }, 500);
  }

  getSelectedAttachmentsCount(): number {
    return this.selectedAttachmentIds.length;
  }

  getCouponFilesCount(): number {
    return this.emails.reduce((count, email) => {
      return count + (email.attachments?.filter(att => att.is_coupon_file).length || 0);
    }, 0);
  }

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
}
