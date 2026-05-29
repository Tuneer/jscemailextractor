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
  isExporting: boolean = false;
  isLoadingAttachment: boolean = false;
  exportProgress: { current: number; total: number } = { current: 0, total: 0 };

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
              uid: Number(email.email_uid) || 0,
              subject: email.subject,
              from: email.from_address,
              date: email.date_received,
              attachments: (email.attachments || []).map((att: any) => ({
                filename: att.filename,
                contentType: att.content_type,
                size: att.size,
                data: [],
                headers: [],
                columnCount: 0,
                rowCount: 0
              }))
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
    if (!this.results || !this.results.processed) return;
    
    this.totalRecords = 0;
    this.results.processed.forEach(email => {
      const attachments = email.attachments || [];
      attachments.forEach(attachment => {
        this.totalRecords += attachment.rowCount || 0;
      });
    });
  }

  viewAttachment(attachment: Attachment): void {
    // If the attachment has no data, fetch it from the database
    if (!attachment.data || attachment.data.length === 0) {
      this.fetchAttachmentDataFromDatabase(attachment);
    } else {
      // Data already exists, show it
      this.selectedAttachment = attachment;
      this.showModal = true;
    }
  }

  fetchAttachmentDataFromDatabase(attachment: Attachment): void {
    this.isLoadingAttachment = true;
    
    // First get all emails with attachments to find the attachment ID
    this.dataService.getEmailsWithAttachments().subscribe({
      next: (response) => {
        if (response.success) {
          // Find the matching attachment by filename in nested attachments
          for (const email of response.emails) {
            const foundAtt = (email.attachments || []).find((att: any) => att.filename === attachment.filename);
            if (foundAtt) {
              // Fetch the actual Excel data using the attachment ID
              this.dataService.getExcelData(foundAtt.id).subscribe({
                next: (dataResponse) => {
                  this.isLoadingAttachment = false;
                  console.log('Excel data response:', dataResponse);
                  console.log('Excel data array:', dataResponse.data);
                  console.log('Data length:', dataResponse.data?.length);
                  
                  if (dataResponse.success && dataResponse.data && dataResponse.data.length > 0) {
                    // Check the structure of the first row
                    console.log('First row structure:', dataResponse.data[0]);
                    console.log('Headers:', Object.keys(dataResponse.data[0]));
                    
                    // Update the attachment with the fetched data
                    const updatedAttachment = {
                      ...attachment,
                      data: dataResponse.data,
                      rowCount: dataResponse.rowCount,
                      columnCount: dataResponse.data.length > 0 ? Object.keys(dataResponse.data[0]).length : attachment.columnCount,
                      // We'll derive headers from the data
                      headers: dataResponse.data.length > 0 ? Object.keys(dataResponse.data[0]) : []
                    };
                    console.log('Updated attachment:', updatedAttachment);
                    this.selectedAttachment = updatedAttachment;
                    this.showModal = true;
                  } else {
                    console.warn('No Excel data found or data is empty');
                    // Show the attachment even without data
                    this.selectedAttachment = attachment;
                    this.showModal = true;
                  }
                },
                error: (error) => {
                  this.isLoadingAttachment = false;
                  console.error('Error fetching Excel data:', error);
                  // Show the attachment even without data
                  this.selectedAttachment = attachment;
                  this.showModal = true;
                }
              });
              return;
            }
          }
          // Attachment not found
          this.isLoadingAttachment = false;
          this.selectedAttachment = attachment;
          this.showModal = true;
        }
      },
      error: (error) => {
        this.isLoadingAttachment = false;
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

  async fetchAttachmentDataAndExport(attachment: Attachment): Promise<void> {
    try {
      const response = await this.dataService.getEmailsWithAttachments().toPromise();
      
      if (response?.success) {
        for (const email of response.emails) {
          const foundAtt = (email.attachments || []).find((att: any) => att.filename === attachment.filename);
          if (foundAtt) {
            const dataResponse = await this.dataService.getExcelData(foundAtt.id).toPromise();
            
            if (dataResponse?.success && dataResponse.data.length > 0) {
              const updatedAttachment = {
                ...attachment,
                data: dataResponse.data,
                headers: dataResponse.data.length > 0 ? Object.keys(dataResponse.data[0]) : []
              };
              const filename = `${this.removeExtension(updatedAttachment.filename)}_data.csv`;
              await this.emailService.exportToCSV(updatedAttachment.data, updatedAttachment.headers, filename);
            }
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Excel data for export:', error);
    }
  }

  // Async version for batch exports
  async fetchAttachmentDataAndExportAsync(attachment: Attachment): Promise<void> {
    try {
      const response = await this.dataService.getEmailsWithAttachments().toPromise();
      
      if (response?.success) {
        for (const email of response.emails) {
          const foundAtt = (email.attachments || []).find((att: any) => att.filename === attachment.filename);
          if (foundAtt) {
            const dataResponse = await this.dataService.getExcelData(foundAtt.id).toPromise();
            
            if (dataResponse?.success && dataResponse.data.length > 0) {
              const updatedAttachment = {
                ...attachment,
                data: dataResponse.data,
                headers: dataResponse.data.length > 0 ? Object.keys(dataResponse.data[0]) : []
              };
              const filename = `${this.removeExtension(updatedAttachment.filename)}_data.csv`;
              await this.emailService.exportToCSV(updatedAttachment.data, updatedAttachment.headers, filename);
            }
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Excel data for export:', error);
    }
  }

  // Helper method to create delays
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async exportAllAttachments(): Promise<void> {
    if (this.isExporting) return; // Prevent multiple exports
    
    if (!this.results) {
      await this.exportAllFromDatabase();
      return;
    }

    try {
      this.isExporting = true;
      const processedEmails = this.results?.processed || [];
      
      // Count total attachments
      let totalAttachments = 0;
      processedEmails.forEach(email => {
        totalAttachments += (email.attachments || []).length;
      });
      
      this.exportProgress = { current: 0, total: totalAttachments };
      
      // Process attachments sequentially with async/await
      for (const email of processedEmails) {
        const attachments = email.attachments || [];
        for (const attachment of attachments) {
          if (attachment.data && attachment.data.length > 0) {
            const filename = `${this.removeExtension(attachment.filename)}_data.csv`;
            await this.emailService.exportToCSV(attachment.data, attachment.headers, filename);
          } else {
            // If no data, fetch from database
            await this.fetchAttachmentDataAndExportAsync(attachment);
          }
          
          this.exportProgress.current++;
          
          // Yield to browser after each export to prevent freezing
          await this.delay(100);
        }
      }
    } catch (error) {
      console.error('Error during export:', error);
    } finally {
      this.isExporting = false;
      this.exportProgress = { current: 0, total: 0 };
    }
  }

  async exportAllFromDatabase(): Promise<void> {
    if (this.isExporting) return;
    
    try {
      this.isExporting = true;
      
      const response = await this.dataService.getEmailsWithAttachments().toPromise();
      
      if (response?.success) {
        // Count total attachments
        let totalAttachments = 0;
        response.emails.forEach(email => {
          totalAttachments += (email.attachments || []).length;
        });
        
        this.exportProgress = { current: 0, total: totalAttachments };
        
        // Process attachments sequentially
        for (const email of response.emails) {
          const attachments = email.attachments || [];
          for (const att of attachments) {
            const dataResponse = await this.dataService.getExcelData(att.id).toPromise();
            
            if (dataResponse?.success && dataResponse.data.length > 0) {
              const attachment = {
                filename: att.filename,
                contentType: att.content_type,
                size: att.size,
                data: dataResponse.data,
                headers: dataResponse.data.length > 0 ? Object.keys(dataResponse.data[0]) : [],
                columnCount: dataResponse.data.length > 0 ? Object.keys(dataResponse.data[0]).length : 0,
                rowCount: dataResponse.rowCount
              };
              const filename = `${this.removeExtension(attachment.filename)}_data.csv`;
              await this.emailService.exportToCSV(attachment.data, attachment.headers, filename);
            }
            
            this.exportProgress.current++;
            
            // Yield to browser
            await this.delay(100);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching emails with attachments for export:', error);
    } finally {
      this.isExporting = false;
      this.exportProgress = { current: 0, total: 0 };
    }
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
    if (!this.results || !this.results.processed) return false;
    return this.results.processed.some(email => 
      (email.attachments || []).some(att => att.data && att.data.length > 0)
    );
  }
}
