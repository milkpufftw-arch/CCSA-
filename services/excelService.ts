
import * as XLSX from 'xlsx';
import { SubsidyRecord } from '../types';

export const parseExcelFile = async (
  file: File, 
  config: { region: string; worker: string; month: string }
): Promise<SubsidyRecord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames.find(n => n.includes('Summary') || n.includes('總表') || n.includes('彙總')) || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 3) throw new Error("檔案格式不符合規範。");

        const headers = jsonData[2].map(h => String(h || '').trim());
        const rows = jsonData.slice(3);

        const nameIdx = headers.indexOf('姓名');
        const itemIdx = headers.indexOf('項目');
        const subtotalIdx = headers.indexOf('小計');

        if (nameIdx === -1 || itemIdx === -1) throw new Error("找不到必要欄位「姓名」或「項目」。");

        const records: SubsidyRecord[] = [];
        let currentName = '';
        const timestamp = new Date().toLocaleString();

        const sourceStartIndex = itemIdx + 2; 
        const sourceEndIndex = subtotalIdx !== -1 ? subtotalIdx : headers.length;
        const fundingSources = headers.slice(sourceStartIndex, sourceEndIndex).filter(s => s && !s.includes('Unnamed'));

        rows.forEach((row) => {
          const rawName = row[nameIdx];
          if (rawName) currentName = String(rawName).trim();
          
          const itemName = row[itemIdx];
          if (!itemName || String(itemName).includes('Total') || String(itemName).includes('合計')) return;

          fundingSources.forEach((source, sIdx) => {
            const amount = row[sourceStartIndex + sIdx];
            const parsedAmount = typeof amount === 'number' ? amount : parseFloat(String(amount || '0').replace(/,/g, ''));
            
            if (parsedAmount > 0) {
              records.push({
                id: Math.random().toString(36).substr(2, 9),
                submitTime: timestamp,
                region: config.region,
                worker: config.worker,
                clientName: currentName,
                month: config.month,
                item: String(itemName),
                amount: parsedAmount,
                source: source,
                remarks: '批次匯入'
              });
            }
          });
        });

        resolve(records);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};
