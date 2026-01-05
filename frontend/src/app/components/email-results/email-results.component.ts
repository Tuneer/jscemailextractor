import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { EmailService } from '../../services/email.service';
import { ProcessEmailResponse, ProcessedEmail, Attachment } from '../../models/email.models';

@Component({
  selector: 'app-email-results',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './email-results.component.html',
  styleUrls: ['./email-results.component.css']
})
export class EmailResultsComponent implements OnInit {
  results: ProcessEmailResponse | null = null;
  selectedAttachment: Attachment | null = null;
  showModal: boolean = false;
  totalRecords: number = 0;

  constructor(
    private emailService: EmailService,
    private router: Router
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.results = navigation.extras.state['results'];
    }
  }

  ngOnInit(): void {
    if (this.results) {
      this.calculateTotalRecords();
    }
  }

  calculateTotalRecords(): void {
    if (!this.results) return;
    
    this.totalRecords = 0;
    this.results.processed.forEach(email => {
      email.attachments.forEach(attachment => {
        this.totalRecords += attachment.rowCount;
      });
    });
  }

  viewAttachment(attachment: Attachment): void {
    this.selectedAttachment = attachment;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedAttachment = null;
  }

  exportAttachment(attachment: Attachment): void {
    if (attachment.data && attachment.data.length > 0) {
      const filename = `${this.removeExtension(attachment.filename)}_data.csv`;
      this.emailService.exportToCSV(attachment.data, attachment.headers, filename);
    }
  }

  exportAllAttachments(): void {
    if (!this.results) return;

    let exportCount = 0;
    this.results.processed.forEach(email => {
      email.attachments.forEach(attachment => {
        if (attachment.data && attachment.data.length > 0) {
          const filename = `${this.removeExtension(attachment.filename)}_data.csv`;
          setTimeout(() => {
            this.emailService.exportToCSV(attachment.data, attachment.headers, filename);
          }, exportCount * 100);
          exportCount++;
        }
      });
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  getFileIcon(contentType: string, filename: string): string {
    if (contentType.includes('excel') || filename.match(/\.xlsx?$/i)) {
      return '📊';
    } else if (contentType.includes('csv') || filename.endsWith('.csv')) {
      return '📄';
    } else if (contentType.includes('pdf')) {
      return '📕';
    }
    return '📎';
  }

  private removeExtension(filename: string): string {
    return filename.replace(/\.[^/.]+$/, '');
  }

  hasData(): boolean {
    if (!this.results) return false;
    return this.results.processed.some(email => 
      email.attachments.some(att => att.data && att.data.length > 0)
    );
  }
}
