
export interface SubsidyRecord {
  id: string;
  submitTime: string;
  region: string;
  worker: string;
  clientName: string;
  month: string;
  item: string;
  amount: number;
  source: string;
  remarks: string;
}

export interface ParseResult {
  records: SubsidyRecord[];
  errors: string[];
}

export enum AppTab {
  DASHBOARD = 'dashboard',
  IMPORT = 'import',
  MANUAL = 'manual',
  RECORDS = 'records'
}

export interface NGOOptions {
  regions: string[];
  workers: string[];
  clients: string[];
  items: string[];
  sources: string[];
}
