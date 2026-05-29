import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './components/navigation/navigation';
import { ComparisonResult } from './models/coupon.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavigationComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  title = 'email-coupon-comparator';
  comparisonResult: ComparisonResult | null = null;

  onComparisonComplete(result: ComparisonResult): void {
    this.comparisonResult = result;
  }
}
