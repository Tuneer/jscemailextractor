import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DataService, EmailWithAttachment, Template } from '../../services/data.service';

@Component({
  selector: 'app-formatted-excel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './formatted-excel.component.html',
  styleUrls: ['./formatted-excel.component.css']
})
export class FormattedExcelComponent implements OnInit {
  emails: EmailWithAttachment[] = [];
  templates: Template[] = [];
  selectedEmail: EmailWithAttachment | null = null;
  selectedTemplate: Template | null = null;
  loading: boolean = false;
  processing: boolean = false;
  message: string = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  showTemplateForm: boolean = false;
  
  // Template form variables
  newTemplateName: string = '';
  newMerchantName: string = '';
  headerRow1: string = '';
  headerRow2: string = '';
  headerRow3: string = '';
  headerRow4: string = '';
  headerRow5: string = '';

  constructor(
    private dataService: DataService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadEmails();
    this.loadTemplates();
  }

  loadEmails(): void {
    this.loading = true;
    this.dataService.getEmailsWithAttachments().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.emails = response.emails.filter(email => email.attachment_id); // Only emails with attachments
          if (this.emails.length === 0) {
            this.showMessage('No emails with attachments found in the database.', 'info');
          }
        } else {
          this.showMessage('Failed to load emails', 'error');
        }
      },
      error: (error) => {
        this.loading = false;
        this.showMessage('Failed to load emails. Please try again.', 'error');
      }
    });
  }

  loadTemplates(): void {
    this.dataService.getTemplates().subscribe({
      next: (response) => {
        if (response.success) {
          this.templates = response.templates;
        }
      },
      error: (error) => {
        console.error('Failed to load templates:', error);
      }
    });
  }

  onEmailSelect(email: EmailWithAttachment): void {
    this.selectedEmail = email;
    this.selectedTemplate = null; // Reset selected template when changing email
  }

  onTemplateSelect(template: Template | null): void {
    this.selectedTemplate = template;
  }

  exportFormattedExcel(): void {
    if (!this.selectedEmail) {
      this.showMessage('Please select an email with attachment', 'error');
      return;
    }

    this.processing = true;
    const templateId = this.selectedTemplate?.id;

    this.dataService.exportFormattedExcel(
      this.selectedEmail.attachment_id,
      templateId,
      `${this.selectedEmail.filename}_formatted.xlsx`
    ).subscribe({
      next: (response) => {
        this.processing = false;
        // Create blob from response and trigger download
        const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.selectedEmail?.filename}_formatted.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.showMessage('Formatted Excel exported successfully!', 'success');
      },
      error: (error) => {
        this.processing = false;
        this.showMessage('Failed to export formatted Excel. Please try again.', 'error');
      }
    });
  }

  showTemplateFormHandler(): void {
    this.showTemplateForm = true;
    this.resetTemplateForm();
  }

  navigateToHome(): void {
    this.router.navigate(['/home']);
  }

  hideTemplateForm(): void {
    this.showTemplateForm = false;
    this.resetTemplateForm();
  }

  resetTemplateForm(): void {
    this.newTemplateName = '';
    this.newMerchantName = '';
    this.headerRow1 = '';
    this.headerRow2 = '';
    this.headerRow3 = '';
    this.headerRow4 = '';
    this.headerRow5 = '';
  }

  saveTemplate(): void {
    if (!this.newMerchantName || !this.newTemplateName) {
      this.showMessage('Merchant name and template name are required', 'error');
      return;
    }

    const headerRows = [
      this.headerRow1.split(','),
      this.headerRow2.split(','),
      this.headerRow3.split(','),
      this.headerRow4.split(','),
      this.headerRow5.split(',')
    ];

    this.dataService.saveTemplate(
      this.newMerchantName,
      this.newTemplateName,
      headerRows
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.showMessage('Template saved successfully!', 'success');
          this.hideTemplateForm();
          this.loadTemplates(); // Reload templates
        } else {
          this.showMessage(response.message || 'Failed to save template', 'error');
        }
      },
      error: (error) => {
        this.showMessage('Failed to save template. Please try again.', 'error');
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