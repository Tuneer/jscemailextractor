import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { EmailReaderComponent } from './components/email-reader/email-reader.component';
import { EmailResultsComponent } from './components/email-results/email-results.component';
import { DeveloperContactComponent } from './components/developer-contact/developer-contact.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'email-reader', component: EmailReaderComponent, canActivate: [authGuard] },
  { path: 'email-results', component: EmailResultsComponent, canActivate: [authGuard] },
  { path: 'developer-contact', component: DeveloperContactComponent },
  { path: '**', redirectTo: '/login' }
];
