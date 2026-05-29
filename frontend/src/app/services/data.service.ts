import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface Attachment {
  id: number;
  filename: string;
  content_type: string;
  size: number;
  file_path?: string;
  is_coupon_file?: boolean;
}

export interface EmailWithAttachment {
  id: number;
  email_uid: string;
  subject: string;
  from_address: string;
  from_name?: string;
  to_address?: string;
  date_received: string;
  body_text?: string;
  body_html?: string;
  attachment_count: number;
  attachments: Attachment[];
}

export interface ExcelData {
  data: any[];
  rowCount: number;
}

export interface Template {
  id: number;
  merchant_name: string;
  template_name: string;
  header_rows: any[][];
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getEmailsWithAttachments(): Observable<{ success: boolean; emails: EmailWithAttachment[]; count: number }> {
    return this.http.get<{ success: boolean; emails: EmailWithAttachment[]; count: number }>(
      `${this.apiUrl}/data/emails`,
      { headers: this.getAuthHeaders() }
    );
  }

  getExcelData(attachmentId: number): Observable<{ success: boolean; data: any[]; rowCount: number }> {
    return this.http.get<{ success: boolean; data: any[]; rowCount: number }>(
      `${this.apiUrl}/data/excel-data/${attachmentId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  exportFormattedExcel(
    attachmentId: number, 
    templateId?: number, 
    fileName?: string
  ): Observable<any> {
    const body = {
      attachmentId,
      templateId,
      fileName
    };

    return this.http.post(
      `${this.apiUrl}/data/export-formatted-excel`,
      body,
      { 
        headers: this.getAuthHeaders(),
        responseType: 'blob' // For file download
      }
    );
  }

  saveTemplate(
    merchantName: string, 
    templateName: string, 
    headerRows: any[][]
  ): Observable<{ success: boolean; message: string; templateId: number }> {
    const body = {
      merchantName,
      templateName,
      headerRows
    };

    return this.http.post<{ success: boolean; message: string; templateId: number }>(
      `${this.apiUrl}/data/templates`,
      body,
      { headers: this.getAuthHeaders() }
    );
  }

  getTemplates(): Observable<{ success: boolean; templates: Template[]; count: number }> {
    return this.http.get<{ success: boolean; templates: Template[]; count: number }>(
      `${this.apiUrl}/data/templates`,
      { headers: this.getAuthHeaders() }
    );
  }

  // Automation endpoints for synced emails
  getAutomationStatus(): Observable<{ success: boolean; stats: any }> {
    return this.http.get<{ success: boolean; stats: any }>(
      `${this.apiUrl}/automation/status`,
      { headers: this.getAuthHeaders() }
    );
  }

  getCronHistory(limit: number = 10): Observable<{ success: boolean; history: any[]; count: number }> {
    return this.http.get<{ success: boolean; history: any[]; count: number }>(
      `${this.apiUrl}/automation/cron-history?limit=${limit}`,
      { headers: this.getAuthHeaders() }
    );
  }

  getSyncedEmails(date?: string, startDate?: string, endDate?: string): Observable<{ success: boolean; emails: EmailWithAttachment[]; count: number }> {
    let params = new URLSearchParams();
    if (date) params.append('date', date);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const queryString = params.toString();
    const url = queryString 
      ? `${this.apiUrl}/data/emails?${queryString}` 
      : `${this.apiUrl}/data/emails`;
    
    return this.http.get<{ success: boolean; emails: EmailWithAttachment[]; count: number }>(
      url,
      { headers: this.getAuthHeaders() }
    );
  }
}