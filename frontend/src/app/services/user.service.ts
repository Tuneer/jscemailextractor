import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

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

export interface MerchantApplication {
  id: number;
  merchant_id: number;
  application_name: string;
  application_description: string;
  application_url: string;
  application_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:3001/api/user';
  private tokenKey = 'auth_token';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.tokenKey);
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Get all business verticals for the user
  getBusinessVerticals(): Observable<any> {
    return this.http.get(`${this.apiUrl}/business-verticals`, { 
      headers: this.getAuthHeaders() 
    });
  }

  // Get merchants by business vertical
  getMerchantsByVertical(verticalId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/merchants/vertical/${verticalId}`, { 
      headers: this.getAuthHeaders() 
    });
  }

  // Get applications for a specific merchant
  getMerchantApplications(merchantId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/merchants/${merchantId}/applications`, { 
      headers: this.getAuthHeaders() 
    });
  }

  // Get merchant details
  getMerchant(merchantId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/merchants/${merchantId}`, { 
      headers: this.getAuthHeaders() 
    });
  }
}