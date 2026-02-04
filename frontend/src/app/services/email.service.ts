import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { EmailSearchRequest, EmailSearchResponse, ProcessEmailResponse } from '../models/email.models';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private apiUrl = 'http://localhost:3001/api/gmail';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  searchEmails(request: EmailSearchRequest): Observable<EmailSearchResponse> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<EmailSearchResponse>(`${this.apiUrl}/emails`, request, { headers });
  }

  processEmails(emailIds: number[], senderEmail?: string): Observable<ProcessEmailResponse> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<ProcessEmailResponse>(
      `${this.apiUrl}/process`,
      { emailIds, senderEmail },
      { headers }
    );
  }

  testConnection(): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/test-connection`, { headers });
  }

  exportToCSV(data: any[], headers: string[], filename: string): void {
    if (!data || data.length === 0) {
      return;
    }

    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header] || '';
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',');
    });

    const csvContent = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
