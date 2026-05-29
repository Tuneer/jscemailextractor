export interface LilaLiquorItem {
  ItemId: string | number;
  StoreId: number;
  ItemNameLine1: string;
  ItemNameLine2?: string;
  Cost: number;
  Price: number;
  DepartmentId: number;
  VendorId: number;
  BarCodeID: string | number;
  AltBarCodeID?: string | number;
  InStockQty?: number;
  TaxPerc1?: number;
  TaxPerc2?: number;
  TaxPerc3?: number;
  marginpercent?: number;
  CaseQty?: number;
  UnitQty?: number;
  SupplierItemCode?: string;
  DepartmentName?: string;
  VendorName?: string;
  [key: string]: any;
}

export interface LilaLiquorStore {
  StoreId: number;
  StoreName: string;
  StreetLine1: string;
  AddrCity: string;
  AddrState: string;
  AddrZip: string;
  AddrCountry: string;
  Phone1: string;
}

export interface LilaLiquorDepartment {
  DepartmentId: number;
  StoreId: number;
  DeptName: string;
  DeptDesc?: string;
}

export interface LilaLiquorVendor {
  VendorId: number;
  VendorName: string;
  VendorType?: string;
}

export interface LilaLiquorData {
  store: LilaLiquorStore;
  items: LilaLiquorItem[];
  departments: LilaLiquorDepartment[];
  vendors: LilaLiquorVendor[];
  itemCount: number;
  uploadedAt: Date;
}

export interface LilaLiquorUploadResponse {
  success: boolean;
  message: string;
  itemCount?: number;
  storeName?: string;
}
