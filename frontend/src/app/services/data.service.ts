import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface EmailWithAttachment {
  id: number;
  email_uid: string;
  subject: string;
  from_address: string;
  date_received: string;
  attachment_id: number;
  filename: string;
  content_type: string;
  size: number;
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
  private apiUrl = 'http://localhost:3001/api/data';

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
      `${this.apiUrl}/emails`,
      { headers: this.getAuthHeaders() }
    );
  }

  getExcelData(attachmentId: number): Observable<{ success: boolean; data: any[]; rowCount: number }> {
    return this.http.get<{ success: boolean; data: any[]; rowCount: number }>(
      `${this.apiUrl}/excel-data/${attachmentId}`,
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
      `${this.apiUrl}/export-formatted-excel`,
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
      `${this.apiUrl}/templates`,
      body,
      { headers: this.getAuthHeaders() }
    );
  }

  getTemplates(): Observable<{ success: boolean; templates: Template[]; count: number }> {
    return this.http.get<{ success: boolean; templates: Template[]; count: number }>(
      `${this.apiUrl}/templates`,
      { headers: this.getAuthHeaders() }
    );
  }
}