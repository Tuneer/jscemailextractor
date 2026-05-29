import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard';
import { EmailViewerComponent } from './components/email-viewer/email-viewer';
import { MerchantUploadComponent } from './components/merchant-upload/merchant-upload';
import { ComparisonEngineComponent } from './components/comparison-engine/comparison-engine';
import { ComparisonResultsComponent } from './components/comparison-results/comparison-results';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'emails', component: EmailViewerComponent },
  { path: 'merchant-upload', component: MerchantUploadComponent },
  { path: 'comparison', component: ComparisonEngineComponent },
  { path: 'results', component: ComparisonResultsComponent },
  { path: '**', redirectTo: '/dashboard' }
];
