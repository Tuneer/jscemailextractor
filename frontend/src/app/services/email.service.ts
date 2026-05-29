import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { EmailSearchRequest, EmailSearchResponse, ProcessEmailResponse } from '../models/email.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  searchEmails(request: EmailSearchRequest): Observable<EmailSearchResponse> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<EmailSearchResponse>(`${this.apiUrl}/gmail/emails`, request, { headers });
  }

  processEmails(emailIds: number[], senderEmail?: string): Observable<ProcessEmailResponse> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<ProcessEmailResponse>(
      `${this.apiUrl}/gmail/process`,
      { emailIds, senderEmail },
      { headers }
    );
  }

  testConnection(): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/gmail/test-connection`, { headers });
  }

  exportToCSV(data: any[], headers: string[], filename: string): Promise<void> {
    return new Promise((resolve) => {
      if (!data || data.length === 0) {
        resolve();
        return;
      }

      // Use requestAnimationFrame to avoid blocking UI
      requestAnimationFrame(() => {
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
        
        // Clean up the object URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
        resolve();
      });
    });
  }
}
