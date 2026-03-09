import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface AdminLoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    fullName: string;
    role: string;
  };
}

export interface BusinessVertical {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Merchant {
  id: number;
  business_name: string;
  business_vertical_id: number;
  business_vertical_name?: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  website: string;
  business_type: string;
  annual_revenue: number;
  employee_count: number;
  established_year: number;
  tax_id: string;
  additional_data: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'https://emailextractor-apiv1.onrender.com/api/admin';
  private tokenKey = 'admin_token';
  private userKey = 'admin_user';
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {}

  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  login(username: string, password: string): Observable<AdminLoginResponse> {
    return this.http.post<AdminLoginResponse>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        tap(response => {
          if (response.success && response.token && response.user) {
            this.setToken(response.token);
            this.setUserData(response.user);
            this.isAuthenticatedSubject.next(true);
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.isAuthenticatedSubject.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUserData(): any {
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private setUserData(userData: any): void {
    localStorage.setItem(this.userKey, JSON.stringify(userData));
  }

  isAuthenticated(): boolean {
    return this.hasToken();
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Business Verticals APIs
  getBusinessVerticals(): Observable<any> {
    return this.http.get(`${this.apiUrl}/business-verticals`, { headers: this.getAuthHeaders() });
  }

  createBusinessVertical(vertical: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/business-verticals`, vertical, { headers: this.getAuthHeaders() });
  }

  updateBusinessVertical(id: number, vertical: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/business-verticals/${id}`, vertical, { headers: this.getAuthHeaders() });
  }

  deleteBusinessVertical(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/business-verticals/${id}`, { headers: this.getAuthHeaders() });
  }

  // Merchants APIs
  getMerchants(limit: number = 100, offset: number = 0): Observable<any> {
    return this.http.get(`${this.apiUrl}/merchants?limit=${limit}&offset=${offset}`, { headers: this.getAuthHeaders() });
  }

  createMerchant(merchant: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/merchants`, merchant, { headers: this.getAuthHeaders() });
  }

  updateMerchant(id: number, merchant: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/merchants/${id}`, merchant, { headers: this.getAuthHeaders() });
  }

  deleteMerchant(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/merchants/${id}`, { headers: this.getAuthHeaders() });
  }

  // Bulk upload
  uploadMerchants(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`
    });

    return this.http.post(`${this.apiUrl}/merchants/bulk-upload`, formData, { headers });
  }

  // Get sample template
  getSampleTemplate(): Observable<Blob> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`
    });

    return this.http.get(`${this.apiUrl}/merchants/sample-template`, { 
      headers, 
      responseType: 'blob' 
    });
  }
}