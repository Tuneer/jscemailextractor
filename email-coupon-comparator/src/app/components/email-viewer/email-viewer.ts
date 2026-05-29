import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmailService } from '../../services/email.service';
import { EmailWithAttachments, Attachment } from '../../models/email.model';

@Component({
  selector: 'app-email-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './email-viewer.html',
  styleUrls: ['./email-viewer.css']
})
export class EmailViewerComponent implements OnInit {
  emails: EmailWithAttachments[] = [];
  selectedEmail: EmailWithAttachments | null = null;
  selectedAttachment: Attachment | null = null;
  loading = false;
  error: string | null = null;
  showAttachmentModal = false;
  attachmentData: any[] = [];
  attachmentHeaders: string[] = [];

  constructor(private emailService: EmailService) {}

  ngOnInit(): void {
    this.loadEmails();
  }

  loadEmails(): void {
    this.loading = true;
    this.error = null;
    
    this.emailService.getEmailsWithAttachments().subscribe({
      next: (response) => {
        if (response.success) {
          this.emails = response.emails;
        } else {
          this.error = response.message || 'Failed to load emails';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error loading emails: ' + err.message;
        this.loading = false;
      }
    });
  }

  selectEmail(email: EmailWithAttachments): void {
    this.selectedEmail = email;
  }

  viewAttachment(attachment: Attachment): void {
    this.selectedAttachment = attachment;
    this.attachmentData = [];
    this.attachmentHeaders = [];
    
    if (attachment.id) {
      this.emailService.getExcelData(attachment.id).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.attachmentData = response.data;
            this.attachmentHeaders = response.headers || 
              (response.data.length > 0 ? Object.keys(response.data[0]) : []);
          }
          this.showAttachmentModal = true;
        },
        error: (err) => {
          console.error('Error loading attachment data:', err);
          this.showAttachmentModal = true;
        }
      });
    } else {
      this.showAttachmentModal = true;
    }
  }

  closeModal(): void {
    this.showAttachmentModal = false;
    this.selectedAttachment = null;
    this.attachmentData = [];
    this.attachmentHeaders = [];
  }

  downloadAttachment(attachment: Attachment): void {
    if (attachment.id) {
      this.emailService.getAttachmentFile(attachment.id).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = attachment.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          console.error('Error downloading attachment:', err);
          alert('Failed to download attachment');
        }
      });
    }
  }

  syncEmails(): void {
    this.loading = true;
    this.emailService.syncEmails().subscribe({
      next: () => {
        this.loadEmails();
      },
      error: (err) => {
        this.error = 'Error syncing emails: ' + err.message;
        this.loading = false;
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getAttachmentIcon(contentType: string): string {
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
      return 'bi-file-earmark-excel';
    } else if (contentType.includes('pdf')) {
      return 'bi-file-earmark-pdf';
    } else if (contentType.includes('csv')) {
      return 'bi-file-earmark-text';
    } else {
      return 'bi-file-earmark';
    }
  }
}
