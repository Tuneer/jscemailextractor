import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { EmailService } from '../../services/email.service';
import { Email, EmailSearchRequest } from '../../models/email.models';

@Component({
  selector: 'app-email-reader',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './email-reader.component.html',
  styleUrls: ['./email-reader.component.css']
})
export class EmailReaderComponent {
  senderEmail: string = '';
  searchQuery: string = 'has:attachment';
  maxResults: number = 50;
  
  emails: Email[] = [];
  loading: boolean = false;
  processing: boolean = false;
  message: string = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  predefinedQueries = [
    { label: 'All with attachments', value: 'has:attachment' },
    { label: 'Last 7 days', value: 'has:attachment newer_than:7d' },
    { label: 'Last 30 days', value: 'has:attachment newer_than:30d' },
    { label: 'Excel files', value: 'has:attachment filename:xlsx OR filename:xls' },
    { label: 'CSV files', value: 'has:attachment filename:csv' }
  ];

  constructor(
    private emailService: EmailService,
    private router: Router
  ) {}

  selectQuery(query: string): void {
    this.searchQuery = query;
  }

  searchEmails(): void {
    if (this.maxResults < 1 || this.maxResults > 100) {
      this.showMessage('Max results must be between 1 and 100', 'error');
      return;
    }

    this.loading = true;
    this.message = '';
    this.emails = [];

    const request: EmailSearchRequest = {
      query: this.searchQuery,
      senderEmail: this.senderEmail,
      maxResults: this.maxResults
    };

    this.emailService.searchEmails(request).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.emails = response.emails.map(email => ({ ...email, selected: false }));
          if (this.emails.length === 0) {
            this.showMessage('No emails found. Try adjusting your search criteria.', 'info');
          } else {
            this.showMessage(`Found ${this.emails.length} email(s) with attachments`, 'success');
          }
        } else {
          this.showMessage(response.message || 'Failed to search emails', 'error');
        }
      },
      error: (error) => {
        this.loading = false;
        this.showMessage(error.error?.message || 'Failed to search emails. Please try again.', 'error');
      }
    });
  }

  toggleSelectAll(event: any): void {
    const checked = event.target.checked;
    this.emails.forEach(email => email.selected = checked);
  }

  get selectedCount(): number {
    return this.emails.filter(e => e.selected).length;
  }

  get allSelected(): boolean {
    return this.emails.length > 0 && this.emails.every(e => e.selected);
  }

  clearSelection(): void {
    this.emails.forEach(email => email.selected = false);
  }

  processSelected(): void {
    const selectedEmails = this.emails.filter(e => e.selected);
    
    if (selectedEmails.length === 0) {
      this.showMessage('Please select at least one email', 'error');
      return;
    }

    this.processing = true;
    this.message = '';

    const emailIds = selectedEmails.map(e => e.uid);

    this.emailService.processEmails(emailIds, this.senderEmail).subscribe({
      next: (response) => {
        this.processing = false;
        if (response.success) {
          this.showMessage(`Processing complete! ${response.count} email(s) processed.`, 'success');
          setTimeout(() => {
            this.router.navigate(['/email-results'], { state: { results: response } });
          }, 1000);
        } else {
          this.showMessage(response.message || 'Failed to process emails', 'error');
        }
      },
      error: (error) => {
        this.processing = false;
        this.showMessage(error.error?.message || 'Failed to process emails. Please try again.', 'error');
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  private showMessage(text: string, type: 'success' | 'error' | 'info'): void {
    this.message = text;
    this.messageType = type;
  }
}
