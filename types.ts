
export interface SubsidyRecord {
  id: string;
  submitTime: string;
  region: string;         // 區域
  worker: string;         // 社工姓名
  clientName: string;     // 姓名
  month: string;          // 補助月份
  item: string;           // 補助項目
  amount: number;         // 金額
  source: string;         // 經費來源
  remarks: string;        // 備註
}

export enum AppTab {
  DASHBOARD = 'dashboard',
  IMPORT = 'import',
  MANUAL = 'manual',
  RECORDS = 'records',
  SETTINGS = 'settings'
}

export interface NGOOptions {
  regions: string[];      // 區域
  workers: string[];      // 社工姓名
  clients: string[];      // 姓名
  items: string[];        // 補助項目
  sources: string[];      // 經費來源
  remarks: string[];      // 備註常用選項
  syncUrl?: string;
}
