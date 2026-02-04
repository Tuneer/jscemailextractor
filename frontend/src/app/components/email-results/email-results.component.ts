import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { EmailService } from '../../services/email.service';
import { DataService } from '../../services/data.service';
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
    private dataService: DataService,
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
    } else {
      // If no results from navigation state, try to load from database
      this.loadEmailsFromDatabase();
    }
  }

  loadEmailsFromDatabase(): void {
    this.dataService.getEmailsWithAttachments().subscribe({
      next: (response) => {
        if (response.success) {
          // Transform the database response to match the expected format
          this.results = {
            success: true,
            processed: response.emails.map(email => ({
              id: email.id,
              uid: Number(email.email_uid) || 0, // Convert string to number
              subject: email.subject,
              from: email.from_address,
              date: email.date_received,
              attachments: [{
                filename: email.filename,
                contentType: email.content_type,
                size: email.size,
                data: [], // We'll fetch this separately when needed
                headers: [],
                columnCount: 0,
                rowCount: 0
              }]
            })),
            count: response.emails.length,
            total: response.emails.length,
            failed: 0
          };
          this.calculateTotalRecords();
        }
      },
      error: (error) => {
        console.error('Error loading emails from database:', error);
      }
    });
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
    // If the attachment has no data, try to fetch it from the database
    if (!attachment.data || attachment.data.length === 0) {
      // We need to find the attachment ID to fetch data from database
      // For now, we'll use the filename to look up the attachment
      this.fetchAttachmentDataFromDatabase(attachment);
    } else {
      this.selectedAttachment = attachment;
      this.showModal = true;
    }
  }

  fetchAttachmentDataFromDatabase(attachment: Attachment): void {
    // First get all emails with attachments to find the attachment ID
    this.dataService.getEmailsWithAttachments().subscribe({
      next: (response) => {
        if (response.success) {
          // Find the matching attachment by filename
          const emailWithAttachment = response.emails.find(email => email.filename === attachment.filename);
          if (emailWithAttachment) {
            // Fetch the actual Excel data using the attachment ID
            this.dataService.getExcelData(emailWithAttachment.attachment_id).subscribe({
              next: (dataResponse) => {
                if (dataResponse.success) {
                  // Update the attachment with the fetched data
                  const updatedAttachment = {
                    ...attachment,
                    data: dataResponse.data,
                    rowCount: dataResponse.rowCount,
                    // We'll derive headers from the data
                    headers: dataResponse.data.length > 0 ? Object.keys(dataResponse.data[0]) : []
                  };
                  this.selectedAttachment = updatedAttachment;
                  this.showModal = true;
                }
              },
              error: (error) => {
                console.error('Error fetching Excel data:', error);
                // Show the attachment even without data
                this.selectedAttachment = attachment;
                this.showModal = true;
              }
            });
          }
        }
      },
      error: (error) => {
        console.error('Error fetching emails with attachments:', error);
        // Show the attachment even without data
        this.selectedAttachment = attachment;
        this.showModal = true;
      }
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedAttachment = null;
  }

  exportAttachment(attachment: Attachment): void {
    if (attachment.data && attachment.data.length > 0) {
      const filename = `${this.removeExtension(attachment.filename)}_data.csv`;
      this.emailService.exportToCSV(attachment.data, attachment.headers, filename);
    } else {
      // If no data, fetch from database first
      this.fetchAttachmentDataAndExport(attachment);
    }
  }

  fetchAttachmentDataAndExport(attachment: Attachment): void {
    // Find the attachment ID in the database to fetch data
    this.dataService.getEmailsWithAttachments().subscribe({
      next: (response) => {
        if (response.success) {
          const emailWithAttachment = response.emails.find(email => email.filename === attachment.filename);
          if (emailWithAttachment) {
            this.dataService.getExcelData(emailWithAttachment.attachment_id).subscribe({
              next: (dataResponse) => {
                if (dataResponse.success && dataResponse.data.length > 0) {
                  const updatedAttachment = {
                    ...attachment,
                    data: dataResponse.data,
                    headers: dataResponse.data.length > 0 ? Object.keys(dataResponse.data[0]) : []
                  };
                  const filename = `${this.removeExtension(updatedAttachment.filename)}_data.csv`;
                  this.emailService.exportToCSV(updatedAttachment.data, updatedAttachment.headers, filename);
                }
              },
              error: (error) => {
                console.error('Error fetching Excel data for export:', error);
              }
            });
          }
        }
      },
      error: (error) => {
        console.error('Error fetching emails with attachments for export:', error);
      }
    });
  }

  exportAllAttachments(): void {
    if (!this.results) {
      // If no results from navigation state, export all from database
      this.exportAllFromDatabase();
      return;
    }

    let exportCount = 0;
    this.results.processed.forEach(email => {
      email.attachments.forEach(attachment => {
        if (attachment.data && attachment.data.length > 0) {
          const filename = `${this.removeExtension(attachment.filename)}_data.csv`;
          setTimeout(() => {
            this.emailService.exportToCSV(attachment.data, attachment.headers, filename);
          }, exportCount * 100);
          exportCount++;
        } else {
          // If no data, fetch from database
          setTimeout(() => {
            this.fetchAttachmentDataAndExport(attachment);
          }, exportCount * 100);
          exportCount++;
        }
      });
    });
  }

  exportAllFromDatabase(): void {
    this.dataService.getEmailsWithAttachments().subscribe({
      next: (response) => {
        if (response.success) {
          let exportCount = 0;
          response.emails.forEach(email => {
            setTimeout(() => {
              this.dataService.getExcelData(email.attachment_id).subscribe({
                next: (dataResponse) => {
                  if (dataResponse.success && dataResponse.data.length > 0) {
                    const attachment = {
                      filename: email.filename,
                      contentType: email.content_type,
                      size: email.size,
                      data: dataResponse.data,
                      headers: dataResponse.data.length > 0 ? Object.keys(dataResponse.data[0]) : [],
                      columnCount: dataResponse.data.length > 0 ? Object.keys(dataResponse.data[0]).length : 0,
                      rowCount: dataResponse.rowCount
                    };
                    const filename = `${this.removeExtension(attachment.filename)}_data.csv`;
                    this.emailService.exportToCSV(attachment.data, attachment.headers, filename);
                  }
                },
                error: (error) => {
                  console.error('Error fetching Excel data for export:', error);
                }
              });
            }, exportCount * 100);
            exportCount++;
          });
        }
      },
      error: (error) => {
        console.error('Error fetching emails with attachments for export:', error);
      }
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
