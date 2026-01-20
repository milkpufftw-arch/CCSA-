
import { SubsidyRecord } from "../types";

/**
 * 同步至 Google Sheets
 * 欄位順序：時間(A), 區域(B), 社工(C), 姓名(D), 月份(E), 項目(F), 金額(G), 來源(H), 備註(I)
 */
export const syncToGoogleSheets = async (url: string, records: SubsidyRecord[]): Promise<boolean> => {
  if (!url) return false;

  try {
    const payload = records.map(r => ({
      timestamp: r.submitTime,
      region: r.region,
      worker: r.worker,
      clientName: r.clientName,
      month: r.month,
      item: r.item,
      amount: r.amount,
      source: r.source,
      remarks: r.remarks
    }));

    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync_all', data: payload })
    });

    return true;
  } catch (error) {
    console.error("Sync Error:", error);
    return false;
  }
};
