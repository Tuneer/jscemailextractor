import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComparisonResult, CouponMatch, Coupon } from '../../models/coupon.model';
import { ComparisonService } from '../../services/comparison.service';

@Component({
  selector: 'app-comparison-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comparison-results.html',
  styleUrls: ['./comparison-results.css']
})
export class ComparisonResultsComponent implements OnChanges {
  @Input() result: ComparisonResult | null = null;

  activeTab: 'summary' | 'matched' | 'unmatched' = 'summary';
  selectedMatch: CouponMatch | null = null;
  showMatchDetails = false;

  constructor(private comparisonService: ComparisonService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['result'] && this.result) {
      this.activeTab = 'summary';
    }
  }

  setActiveTab(tab: 'summary' | 'matched' | 'unmatched'): void {
    this.activeTab = tab;
  }

  viewMatchDetails(match: CouponMatch): void {
    this.selectedMatch = match;
    this.showMatchDetails = true;
  }

  closeMatchDetails(): void {
    this.showMatchDetails = false;
    this.selectedMatch = null;
  }

  exportResults(): void {
    if (this.result) {
      this.comparisonService.exportToExcel(this.result);
    }
  }

  getMatchScoreClass(score: number): string {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }

  getMatchScoreLabel(score: number): string {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Weak Match';
  }

  getDiscountDisplay(coupon: Coupon): string {
    if (coupon.discountType === 'percentage') {
      return `${coupon.discountValue}% OFF`;
    } else if (coupon.discountType === 'fixed') {
      return `$${coupon.discountValue} OFF`;
    } else if (coupon.discountType === 'buy_x_get_y') {
      return 'Buy X Get Y';
    }
    return `${coupon.discountValue}`;
  }

  getSavingsColor(savings: number): string {
    if (savings >= 100) return '#28a745';
    if (savings >= 50) return '#20c997';
    if (savings >= 20) return '#ffc107';
    return '#6c757d';
  }

  getTotalPotentialSavings(): number {
    return this.result?.summary.totalPotentialSavings || 0;
  }

  getAverageDiscount(): number {
    return this.result?.summary.averageDiscount || 0;
  }

  getMatchRate(): number {
    if (!this.result || this.result.totalItems === 0) return 0;
    const matchedItems = new Set(this.result.matchedCoupons.map(m => m.item.itemCode)).size;
    return Math.round((matchedItems / this.result.totalItems) * 100);
  }
}
