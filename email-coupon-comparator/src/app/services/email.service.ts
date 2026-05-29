import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { EmailApiResponse, ExcelDataResponse, EmailWithAttachments } from '../models/email.model';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  // Use production API for local development
  private apiUrl = 'https://jscglobalsolutions.info/emailextractor/api';
  private phpApiUrl = 'https://jscglobalsolutions.info/emailextractor/api';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  getEmailsWithAttachments(): Observable<EmailApiResponse> {
    return this.http.get<EmailApiResponse>(
      `${this.apiUrl}/data/emails`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getExcelData(attachmentId: number): Observable<ExcelDataResponse> {
    return this.http.get<ExcelDataResponse>(
      `${this.apiUrl}/data/excel-data/${attachmentId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getAttachmentFile(attachmentId: number): Observable<Blob> {
    return this.http.get(
      `${this.phpApiUrl}/index.php?action=attachments/download&id=${attachmentId}`,
      { 
        headers: this.getAuthHeaders(),
        responseType: 'blob'
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  processEmailAttachments(emailId: number): Observable<any> {
    return this.http.post(
      `${this.phpApiUrl}/index.php?action=gmail/process-attachments`,
      { email_id: emailId },
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  syncEmails(): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/gmail/sync`,
      {},
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    console.error('API Error:', error);
    return throwError(() => new Error(error.message || 'Server error'));
  }
}
