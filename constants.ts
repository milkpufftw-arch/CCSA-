
import { NGOOptions } from './types';

export const NGO_CONFIG: NGOOptions = {
  regions: ["台北中心", "台中中心", "高雄中心", "萬華家處"],
  workers: ["呂予瑄", "王郁潔", "賴玟綺", "楊佩穎"],
  clients: ["許澤豫", "廖晨旭", "徐意綸", "張晉彤"],
  items: ["高中學雜費", "大學學雜費", "個案生活費", "個案房租費", "個案交通費"],
  sources: ["2025年勸募", "基隆市自立案", "聚陽實業", "華安扶輪社", "華陽扶輪社"],
  remarks: ["核銷完成", "急件處理", "待補收據", "批次匯入", "手動補登"],
  syncUrl: "https://script.google.com/macros/s/AKfycbzquoCUVF91rt4ni1Qf8OagEtARYFTNhG-RqLZBYS-LIx2KzvLaVcRaUyoRo4z_db6y/exec"
};

export const MOCK_RECORDS = [
  {
    id: '1',
    submitTime: '2025-01-01 10:00:00',
    region: '台北中心',
    worker: '呂予瑄',
    clientName: '許澤豫',
    month: '2025-01',
    item: '個案生活費',
    amount: 3500,
    source: '2025年勸募',
    remarks: '系統預設紀錄'
  }
];
