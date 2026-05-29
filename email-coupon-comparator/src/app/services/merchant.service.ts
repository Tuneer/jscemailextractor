import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { 
  MerchantData, 
  MerchantItem, 
  SalesData, 
  MerchantUploadResponse, 
  UploadedFile,
  MerchantStore,
  MerchantDepartment,
  MerchantVendor,
  FIELD_MAPPINGS
} from '../models/merchant.model';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class MerchantService {
  private apiUrl = 'https://jscglobalsolutions.info/emailextractor/api';
  
  private currentMerchantSubject = new BehaviorSubject<MerchantData | null>(null);
  public currentMerchant$ = this.currentMerchantSubject.asObservable();

  public uploadedFilesSubject = new BehaviorSubject<UploadedFile[]>([]);
  public uploadedFiles$ = this.uploadedFilesSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  /**
   * Parse an Excel file and auto-detect its structure
   * Supports multi-sheet files like Lila Liquor format
   */
  parseExcelFile(file: File): Promise<MerchantData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const merchantData = this.processWorkbook(workbook, file.name);
          resolve(merchantData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Process the entire workbook and extract all relevant data
   */
  private processWorkbook(workbook: XLSX.WorkBook, filename: string): MerchantData {
    const sheetNames = workbook.SheetNames;
    const rawSheets: { [sheetName: string]: any[] } = {};
    
    // Store all raw sheet data
    sheetNames.forEach(name => {
      const sheet = workbook.Sheets[name];
      rawSheets[name] = XLSX.utils.sheet_to_json(sheet);
    });

    // Detect and parse store information
    const store = this.parseStoreInfo(workbook, rawSheets);
    
    // Detect and parse items
    const items = this.parseItems(workbook, rawSheets);
    
    // Detect and parse departments
    const departments = this.parseDepartments(workbook, rawSheets);
    
    // Detect and parse vendors
    const vendors = this.parseVendors(workbook, rawSheets);
    
    // Detect and parse sales data
    const sales = this.parseSales(workbook, rawSheets);
    
    // Enrich items with department and vendor names
    this.enrichItems(items, departments, vendors, rawSheets);

    // Extract merchant name from store or filename
    const merchantName = store?.storeName || this.extractMerchantName(filename);

    return {
      merchantName,
      store,
      items,
      sales,
      departments,
      vendors,
      uploadedAt: new Date(),
      rawSheets
    };
  }

  /**
   * Parse store information from common sheet names
   */
  private parseStoreInfo(workbook: XLSX.WorkBook, rawSheets: { [key: string]: any[] }): MerchantStore | undefined {
    const storeSheetNames = ['tblStores', 'Stores', 'Store', 'Company', 'Location'];
    
    for (const sheetName of storeSheetNames) {
      const lowerSheetName = sheetName.toLowerCase();
      const found = Object.keys(rawSheets).find(name => name.toLowerCase().includes(lowerSheetName));
      
      if (found && rawSheets[found].length > 0) {
        const storeData = rawSheets[found][0];
        return {
          storeId: storeData.StoreId || storeData.storeId || storeData.ID || storeData.id,
          storeName: storeData.StoreName || storeData.Name || storeData.store_name || 'Unknown Store',
          address: storeData.StreetLine1 || storeData.Address || storeData.address || storeData.Street,
          city: storeData.AddrCity || storeData.City || storeData.city,
          state: storeData.AddrState || storeData.State || storeData.state,
          zip: storeData.AddrZip || storeData.Zip || storeData.zip || storeData.PostalCode,
          phone: storeData.Phone1 || storeData.Phone || storeData.phone,
          email: storeData.EmailAddr || storeData.Email || storeData.email
        };
      }
    }
    
    return undefined;
  }

  /**
   * Parse items from common sheet names
   */
  private parseItems(workbook: XLSX.WorkBook, rawSheets: { [key: string]: any[] }): MerchantItem[] {
    const itemSheetNames = ['tblItemMaster', 'Items', 'Item', 'Products', 'Product', 'Inventory', 'SKU'];
    
    for (const sheetName of itemSheetNames) {
      const lowerSheetName = sheetName.toLowerCase();
      const found = Object.keys(rawSheets).find(name => 
        name.toLowerCase().includes(lowerSheetName) || 
        name.toLowerCase().includes('item')
      );
      
      if (found && rawSheets[found].length > 0) {
        return rawSheets[found].map((row, index) => this.mapRowToItem(row, index));
      }
    }
    
    // If no specific items sheet found, try to use the first sheet with substantial data
    const sheetNames = Object.keys(rawSheets);
    for (const name of sheetNames) {
      if (rawSheets[name].length > 10) {
        // Check if this looks like an items sheet
        const firstRow = rawSheets[name][0];
        if (this.looksLikeItemData(firstRow)) {
          return rawSheets[name].map((row, index) => this.mapRowToItem(row, index));
        }
      }
    }
    
    return [];
  }

  /**
   * Check if a row looks like item data
   */
  private looksLikeItemData(row: any): boolean {
    const keys = Object.keys(row).map(k => k.toLowerCase());
    return keys.some(k => 
      k.includes('item') || 
      k.includes('product') || 
      k.includes('sku') || 
      k.includes('barcode') ||
      k.includes('price')
    );
  }

  /**
   * Map a raw row to a MerchantItem using field mappings
   */
  private mapRowToItem(row: any, index: number): MerchantItem {
    const item: MerchantItem = {
      id: index + 1,
      itemCode: '',
      itemName: ''
    };

    // Map each field using the mappings
    item.itemCode = this.findFieldValue(row, FIELD_MAPPINGS.itemCode) || `ITEM_${index + 1}`;
    item.itemName = this.findFieldValue(row, FIELD_MAPPINGS.itemName) || 'Unknown Item';
    item.category = this.findFieldValue(row, FIELD_MAPPINGS.category);
    item.price = this.parseNumber(this.findFieldValue(row, FIELD_MAPPINGS.price));
    item.cost = this.parseNumber(this.findFieldValue(row, FIELD_MAPPINGS.cost));
    item.barcode = String(this.findFieldValue(row, FIELD_MAPPINGS.barcode) || '');
    item.vendor = this.findFieldValue(row, FIELD_MAPPINGS.vendor);
    item.department = this.findFieldValue(row, FIELD_MAPPINGS.department);
    item.supplierCode = this.findFieldValue(row, FIELD_MAPPINGS.supplierCode);
    item.inStock = this.parseNumber(this.findFieldValue(row, FIELD_MAPPINGS.inStock));
    item.margin = this.parseNumber(this.findFieldValue(row, FIELD_MAPPINGS.margin));

    // Store all original fields for reference
    Object.keys(row).forEach(key => {
      if (!(key in item)) {
        item[key] = row[key];
      }
    });

    return item;
  }

  /**
   * Find a field value from a row using multiple possible field names
   */
  private findFieldValue(row: any, fieldNames: string[]): any {
    for (const name of fieldNames) {
      // Try exact match first
      if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
        return row[name];
      }
      // Try case-insensitive match
      const key = Object.keys(row).find(k => k.toLowerCase() === name.toLowerCase());
      if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return row[key];
      }
    }
    return undefined;
  }

  /**
   * Parse a number from various formats
   */
  private parseNumber(value: any): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const num = parseFloat(String(value));
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parse departments from common sheet names
   */
  private parseDepartments(workbook: XLSX.WorkBook, rawSheets: { [key: string]: any[] }): MerchantDepartment[] {
    const deptSheetNames = ['tblDepartments', 'Departments', 'Department', 'Dept', 'Categories', 'Category'];
    
    for (const sheetName of deptSheetNames) {
      const lowerSheetName = sheetName.toLowerCase();
      const found = Object.keys(rawSheets).find(name => name.toLowerCase().includes(lowerSheetName));
      
      if (found && rawSheets[found].length > 0) {
        return rawSheets[found].map((row) => ({
          departmentId: row.DepartmentId || row.departmentId || row.ID || row.id,
          name: row.DeptName || row.Name || row.DepartmentName || row.name || 'Unknown',
          description: row.DeptDesc || row.Description || row.description
        }));
      }
    }
    
    return [];
  }

  /**
   * Parse vendors from common sheet names
   */
  private parseVendors(workbook: XLSX.WorkBook, rawSheets: { [key: string]: any[] }): MerchantVendor[] {
    const vendorSheetNames = ['tblVendors', 'Vendors', 'Vendor', 'Suppliers', 'Supplier'];
    
    for (const sheetName of vendorSheetNames) {
      const lowerSheetName = sheetName.toLowerCase();
      const found = Object.keys(rawSheets).find(name => name.toLowerCase().includes(lowerSheetName));
      
      if (found && rawSheets[found].length > 0) {
        return rawSheets[found].map((row) => ({
          vendorId: row.VendorId || row.vendorId || row.ID || row.id,
          name: row.VendorName || row.Name || row.name || 'Unknown',
          type: row.VendorType || row.Type || row.type
        }));
      }
    }
    
    return [];
  }

  /**
   * Parse sales data from common sheet names
   */
  private parseSales(workbook: XLSX.WorkBook, rawSheets: { [key: string]: any[] }): SalesData[] {
    const salesSheetNames = ['tblSales', 'Sales', 'Transactions', 'Transaction', 'Orders'];
    
    for (const sheetName of salesSheetNames) {
      const lowerSheetName = sheetName.toLowerCase();
      const found = Object.keys(rawSheets).find(name => name.toLowerCase().includes(lowerSheetName));
      
      if (found && rawSheets[found].length > 0) {
        return rawSheets[found].map((row) => ({
          itemCode: row.ItemCode || row.itemCode || row.SKU || row.ItemId || '',
          itemName: row.ItemName || row.itemName || row.Name || '',
          quantitySold: this.parseNumber(row.Quantity || row.Qty || row.QuantitySold) || 0,
          totalSales: this.parseNumber(row.TotalSales || row.Total || row.Amount) || 0,
          saleDate: row.SaleDate || row.Date || row.TransactionDate,
          period: row.Period || row.Month || row.Week
        }));
      }
    }
    
    return [];
  }

  /**
   * Enrich items with department and vendor names
   */
  private enrichItems(
    items: MerchantItem[], 
    departments: MerchantDepartment[], 
    vendors: MerchantVendor[],
    rawSheets: { [key: string]: any[] }
  ): void {
    // Create lookup maps
    const deptMap = new Map<number, string>();
    departments.forEach(d => {
      if (d.departmentId) deptMap.set(d.departmentId, d.name);
    });
    
    const vendorMap = new Map<number, string>();
    vendors.forEach(v => {
      if (v.vendorId) vendorMap.set(v.vendorId, v.name);
    });

    // Try to get supplier codes from tblItemSupplier if available
    const supplierMap = new Map<string, string>();
    const supplierSheet = rawSheets['tblItemSupplier'] || rawSheets['ItemSupplier'] || rawSheets['SupplierMapping'];
    if (supplierSheet) {
      supplierSheet.forEach((row: any) => {
        const itemId = row.POSItemId || row.ItemId || row.ItemBarCode;
        const supplierCode = row.SupplierItemId || row.SupplierItemCode || row.SupplierCode;
        if (itemId && supplierCode) {
          supplierMap.set(String(itemId), String(supplierCode));
        }
      });
    }

    // Enrich each item
    items.forEach(item => {
      // Add department name if not already present
      if (!item.department && item['DepartmentId'] !== undefined) {
        const deptId = parseInt(item['DepartmentId']);
        item.department = deptMap.get(deptId) || '';
      }
      
      // Add vendor name if not already present
      if (!item.vendor && item['VendorId'] !== undefined) {
        const vendorId = parseInt(item['VendorId']);
        item.vendor = vendorMap.get(vendorId) || '';
      }
      
      // Add supplier code if available
      if (!item.supplierCode) {
        item.supplierCode = supplierMap.get(String(item.itemCode)) || 
                           supplierMap.get(String(item.barcode)) || '';
      }
    });
  }

  /**
   * Extract merchant name from filename
   */
  private extractMerchantName(filename: string): string {
    // Remove extension and common suffixes
    let name = filename.replace(/\.[^/.]+$/, '');
    name = name.replace(/[_-]?(items?|products?|inventory|data|excel|export).*$/i, '');
    name = name.replace(/[_-]?\d{4}[-_]\d{2}[-_]\d{2}.*$/i, ''); // Remove dates
    return name.trim() || 'Unknown Merchant';
  }

  setCurrentMerchant(merchantData: MerchantData) {
    this.currentMerchantSubject.next(merchantData);
    localStorage.setItem('currentMerchant', JSON.stringify(merchantData));
  }

  getCurrentMerchant(): MerchantData | null {
    const stored = localStorage.getItem('currentMerchant');
    if (stored) {
      const merchant = JSON.parse(stored);
      this.currentMerchantSubject.next(merchant);
      return merchant;
    }
    return this.currentMerchantSubject.value;
  }

  addUploadedFile(file: UploadedFile) {
    const current = this.uploadedFilesSubject.value;
    const existingIndex = current.findIndex(f => f.type === file.type);
    
    if (existingIndex >= 0) {
      current[existingIndex] = file;
    } else {
      current.push(file);
    }
    
    this.uploadedFilesSubject.next([...current]);
  }

  clearUploadedFiles() {
    this.uploadedFilesSubject.next([]);
  }

  uploadMerchantData(merchantData: MerchantData): Observable<MerchantUploadResponse> {
    return this.http.post<MerchantUploadResponse>(
      `${this.apiUrl}/merchants/upload`,
      merchantData,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getMerchants(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/merchants`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    console.error('Merchant Service Error:', error);
    return throwError(() => new Error(error.message || 'Server error'));
  }
}
