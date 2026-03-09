import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { EmailReaderComponent } from './components/email-reader/email-reader.component';
import { EmailResultsComponent } from './components/email-results/email-results.component';
import { DeveloperContactComponent } from './components/developer-contact/developer-contact.component';
import { FormattedExcelComponent } from './components/formatted-excel/formatted-excel.component';
import { UserDashboardComponent } from './components/dashboard/dashboard.component';
import { LandingComponent } from './components/landing/landing.component';
import { RegisterComponent } from './components/register/register.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { MerchantsComponent } from './components/merchants/merchants.component';
import { ApplicationsComponent } from './components/applications/applications.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: UserDashboardComponent, canActivate: [authGuard] },
  { path: 'merchants/:id', component: MerchantsComponent, canActivate: [authGuard] },
  { path: 'applications/:id', component: ApplicationsComponent, canActivate: [authGuard] },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'email-reader', component: EmailReaderComponent, canActivate: [authGuard] },
  { path: 'email-results', component: EmailResultsComponent, canActivate: [authGuard] },
  { path: 'formatted-excel', component: FormattedExcelComponent, canActivate: [authGuard] },
  { path: 'developer-contact', component: DeveloperContactComponent },
  { path: 'landing', component: LandingComponent },
  
  // Admin routes
  { path: 'admin/dashboard', component: AdminDashboardComponent },
  
  { path: '**', redirectTo: '/login' }
];