export interface MerchantItem {
  id?: number;
  itemCode: string;
  itemName: string;
  category?: string;
  subCategory?: string;
  brand?: string;
  size?: string;
  unit?: string;
  price?: number;
  cost?: number;
  margin?: number;
  barcode?: string;
  vendor?: string;
  department?: string;
  supplierCode?: string;
  inStock?: number;
  taxPercent?: number;
  // Allow additional dynamic fields
  [key: string]: any;
}

export interface SalesData {
  id?: number;
  itemCode: string;
  itemName: string;
  quantitySold: number;
  totalSales: number;
  saleDate?: string;
  period?: string;
  [key: string]: any;
}

export interface MerchantStore {
  storeId?: string | number;
  storeName: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
}

export interface MerchantDepartment {
  departmentId?: number;
  name: string;
  description?: string;
}

export interface MerchantVendor {
  vendorId?: number;
  name: string;
  type?: string;
}

export interface MerchantData {
  merchantName: string;
  store?: MerchantStore;
  items: MerchantItem[];
  sales: SalesData[];
  departments?: MerchantDepartment[];
  vendors?: MerchantVendor[];
  uploadedAt?: Date;
  // Raw data for reference
  rawSheets?: { [sheetName: string]: any[] };
}

export interface UploadedFile {
  name: string;
  type: 'items' | 'sales' | 'store' | 'departments' | 'vendors' | 'auto';
  data: any[];
  headers: string[];
  rowCount: number;
  sheetName?: string;
}

export interface MerchantUploadResponse {
  success: boolean;
  message: string;
  merchantId?: number;
  itemsCount?: number;
  salesCount?: number;
}

// Excel column mapping for common field names
export const FIELD_MAPPINGS = {
  itemCode: ['ItemId', 'Item Code', 'itemCode', 'item_code', 'SKU', 'sku', 'ItemID', 'ITEMID', 'PLU', 'UPC', 'Barcode', 'BarCodeID'],
  itemName: ['ItemNameLine1', 'Item Name', 'itemName', 'item_name', 'Name', 'Description', 'Product', 'ProductName', 'ItemName'],
  category: ['DepartmentName', 'Category', 'category', 'DeptName', 'Department', 'Type', 'Class'],
  price: ['Price', 'price', 'Unit Price', 'unit_price', 'RetailPrice', 'SalePrice'],
  cost: ['Cost', 'cost', 'Unit Cost', 'unit_cost', 'WholesalePrice', 'BaseCost'],
  barcode: ['BarCodeID', 'Barcode', 'barcode', 'UPC', 'EAN', 'GTIN', 'AltBarCodeID'],
  vendor: ['VendorName', 'Vendor', 'vendor', 'Supplier', 'SupplierName', 'Brand'],
  department: ['DepartmentName', 'Department', 'DeptName', 'Category'],
  supplierCode: ['SupplierItemCode', 'Supplier Code', 'supplier_code', 'VendorSKU'],
  inStock: ['InStockQty', 'In Stock', 'in_stock', 'Quantity', 'Qty'],
  margin: ['marginpercent', 'Margin', 'margin', 'MarginPct']
};
