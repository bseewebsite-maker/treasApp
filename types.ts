export enum Screen {
  Collection = 'Collection',
  Remitted = 'Remitted',
  Funds = 'Funds',
  Students = 'Students',
  Menu = 'Menu',
}

export interface Student {
  id: string;
  studentName: string;
  studentNo: string;
  notes?: string;
}

export interface CustomFieldOption {
  id: string;
  value: string;
  amount?: number;
}

export interface ValueSet {
  id: string;
  name: string;
  options: CustomFieldOption[];
}

export interface CustomField {
  id:string;
  name: string;
  type: 'text' | 'option' | 'checkbox';
  options?: CustomFieldOption[];
  subFields?: { [parentOptionId: string]: CustomField[] };
  valueSetId?: string;
}

export interface Payment {
  studentId: string;
  amount: number;
  timestamp?: string;
  customFieldValues?: { [fieldId: string]: string };
}

export type CollectionType = 'ulikdanay' | 'regular';

export interface Collection {
  id: string;
  name: string;
  type: CollectionType;
  targetAmount?: number;
  deadline?: string;
  payments: Payment[];
  createdAt: string;
  includedStudentIds?: string[];
  customFields?: CustomField[];
  notes?: string;
}

export interface Remittance {
  paidBy: string;
  receivedBy: string;
  remittedAt: string;
}

export interface RemittedCollection extends Collection {
  remittance: Remittance;
}

export interface ArchivedCollection extends RemittedCollection {
  archivedAt: string;
}

export interface TreasurerProfile {
  studentId: string;
  name: string;
  avatar: string; // Base64 encoded image
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  type: 'payment_add' | 'payment_update' | 'payment_remove';
  studentId: string;
  studentName: string;
  collectionId: string;
  collectionName: string;
  amount?: number;
  previousAmount?: number;
}