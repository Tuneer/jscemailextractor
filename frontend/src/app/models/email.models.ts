export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    email: string;
  };
}

export interface OTPRequest {
  email: string;
}

export interface OTPVerification {
  email: string;
  otp: string;
}

export interface Email {
  id: number;
  uid: number;
  subject: string;
  from: string;
  date: string;
  hasAttachments: boolean;
  attachmentCount: number;
  selected?: boolean;
}

export interface EmailSearchRequest {
  query?: string;
  senderEmail?: string;
  maxResults?: number;
}

export interface EmailSearchResponse {
  success: boolean;
  emails: Email[];
  count: number;
  message?: string;
}

export interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  data: any[];
  headers: string[];
  columnCount: number;
  rowCount: number;
}

export interface ProcessedEmail {
  id: number;
  uid: number;
  subject: string;
  from: string;
  date: string;
  attachments: Attachment[];
}

export interface ProcessEmailResponse {
  success: boolean;
  processed: ProcessedEmail[];
  count: number;
  total: number;
  failed: number;
  message?: string;
}
