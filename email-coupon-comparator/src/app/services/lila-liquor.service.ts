import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { 
  LilaLiquorItem, 
  LilaLiquorStore, 
  LilaLiquorDepartment, 
  LilaLiquorVendor,
  LilaLiquorData,
  LilaLiquorUploadResponse 
} from '../models/lila-liquor.model';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class LilaLiquorService {
  // Use production API for local development
  private apiUrl = 'https://jscglobalsolutions.info/emailextractor/api';
  
  private currentDataSubject = new BehaviorSubject<LilaLiquorData | null>(null);
  public currentData$ = this.currentDataSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  parseLilaLiquorExcel(file: File): Promise<LilaLiquorData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Parse tblStores
          const storesSheet = workbook.Sheets['tblStores'];
          const storesData = storesSheet ? XLSX.utils.sheet_to_json(storesSheet) : [];
          const store: LilaLiquorStore = storesData.length > 0 ? storesData[0] as LilaLiquorStore : {
            StoreId: 1,
            StoreName: 'Unknown Store',
            StreetLine1: '',
            AddrCity: '',
            AddrState: '',
            AddrZip: '',
            AddrCountry: '',
            Phone1: ''
          };

          // Parse tblItemMaster
          const itemsSheet = workbook.Sheets['tblItemMaster'];
          const itemsData = itemsSheet ? XLSX.utils.sheet_to_json(itemsSheet) : [];
          const items: LilaLiquorItem[] = itemsData.map((item: any) => ({
            ...item,
            ItemId: item.ItemId || item.BarCodeID || '',
            ItemNameLine1: item.ItemNameLine1 || item.ItemNameLine2 || 'Unknown Item',
            Cost: parseFloat(item.Cost) || 0,
            Price: parseFloat(item.Price) || 0,
            DepartmentId: parseInt(item.DepartmentId) || -1,
            VendorId: parseInt(item.VendorId) || -1
          }));

          // Parse tblDepartments
          const deptSheet = workbook.Sheets['tblDepartments'];
          const deptData = deptSheet ? XLSX.utils.sheet_to_json(deptSheet) : [];
          const departments: LilaLiquorDepartment[] = deptData.map((d: any) => ({
            DepartmentId: parseInt(d.DepartmentId) || -1,
            StoreId: parseInt(d.StoreId) || 1,
            DeptName: d.DeptName || 'Unknown',
            DeptDesc: d.DeptDesc || ''
          }));

          // Parse tblVendors
          const vendorSheet = workbook.Sheets['tblVendors'];
          const vendorData = vendorSheet ? XLSX.utils.sheet_to_json(vendorSheet) : [];
          const vendors: LilaLiquorVendor[] = vendorData.map((v: any) => ({
            VendorId: parseInt(v.VendorId) || -1,
            VendorName: v.VendorName || 'Unknown',
            VendorType: v.VendorType || ''
          }));

          // Parse tblItemSupplier for supplier item codes
          const supplierSheet = workbook.Sheets['tblItemSupplier'];
          const supplierData = supplierSheet ? XLSX.utils.sheet_to_json(supplierSheet) : [];
          
          // Create a map of ItemId to SupplierItemCode
          const supplierMap = new Map<string, string>();
          supplierData.forEach((s: any) => {
            const itemId = s.POSItemId || s.ItemBarCode;
            const supplierCode = s.SupplierItemId || s.SupplierItemName;
            if (itemId && supplierCode) {
              supplierMap.set(String(itemId), String(supplierCode));
            }
          });

          // Enrich items with department name, vendor name, and supplier code
          const deptMap = new Map<number, string>();
          departments.forEach(d => deptMap.set(d.DepartmentId, d.DeptName));
          
          const vendorMap = new Map<number, string>();
          vendors.forEach(v => vendorMap.set(v.VendorId, v.VendorName));

          items.forEach(item => {
            item.DepartmentName = deptMap.get(item.DepartmentId) || 'Unknown';
            item.VendorName = vendorMap.get(item.VendorId) || 'Unknown';
            item.SupplierItemCode = supplierMap.get(String(item.ItemId)) || 
                                    supplierMap.get(String(item.BarCodeID)) || '';
          });

          const lilaData: LilaLiquorData = {
            store,
            items,
            departments,
            vendors,
            itemCount: items.length,
            uploadedAt: new Date()
          };

          resolve(lilaData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  setCurrentData(data: LilaLiquorData): void {
    this.currentDataSubject.next(data);
    localStorage.setItem('lilaLiquorData', JSON.stringify(data));
  }

  getCurrentData(): LilaLiquorData | null {
    const stored = localStorage.getItem('lilaLiquorData');
    if (stored) {
      const data = JSON.parse(stored);
      this.currentDataSubject.next(data);
      return data;
    }
    return this.currentDataSubject.value;
  }

  clearData(): void {
    this.currentDataSubject.next(null);
    localStorage.removeItem('lilaLiquorData');
  }

  uploadLilaLiquorData(data: LilaLiquorData): Observable<LilaLiquorUploadResponse> {
    return this.http.post<LilaLiquorUploadResponse>(
      `${this.apiUrl}/lila-liquor/upload`,
      data,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    console.error('Lila Liquor Service Error:', error);
    return throwError(() => new Error(error.message || 'Server error'));
  }
}
