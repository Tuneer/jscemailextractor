export interface Attachment {
  id: number;
  filename: string;
  content_type: string;
  size: number;
  file_path?: string;
  excel_data?: any;
  is_coupon_file: boolean;
  email_id?: number;
  data?: any[];
  headers?: string[];
  rowCount?: number;
}

export interface Email {
  id: number;
  email_uid: string;
  subject: string;
  from_address: string;
  date_received: string;
  attachment_count: number;
  attachments?: Attachment[];
  body_preview?: string;
}

export interface EmailWithAttachments extends Email {
  attachments: Attachment[];
}

export interface EmailApiResponse {
  success: boolean;
  emails: EmailWithAttachments[];
  count: number;
  message?: string;
}

export interface ExcelDataResponse {
  success: boolean;
  data: any[];
  rowCount: number;
  headers?: string[];
}
