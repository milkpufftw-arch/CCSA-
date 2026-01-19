
import { NGOOptions } from './types';

export const NGO_CONFIG: NGOOptions = {
  regions: ["總會", "台北中心", "台中中心", "萬華家處"],
  workers: ["呂予瑄", "王郁潔", "賴玟綺", "楊佩穎"],
  clients: ["許澤豫", "廖晨旭", "徐意綸", "張晉彤"],
  items: ["高中學雜費", "大學學雜費", "個案生活費", "個案房租費", "個案交通費"],
  sources: ["基隆市自立案", "2025年勸募", "聚陽實業", "華安扶輪社", "華陽扶輪社", "萬華家處"]
};

export const MOCK_RECORDS = [
  {
    id: '1',
    submitTime: '2024-12-01 10:00:00',
    region: '台北中心',
    worker: '呂予瑄',
    clientName: '許澤豫',
    month: '2024-12',
    item: '個案生活費',
    amount: 3500,
    source: '基隆市自立案',
    remarks: '自動生成的示範資料'
  },
  {
    id: '2',
    submitTime: '2024-12-01 10:05:00',
    region: '萬華家處',
    worker: '楊佩穎',
    clientName: '廖晨旭',
    month: '2024-12',
    item: '個案房租費',
    amount: 5000,
    source: '萬華家處',
    remarks: '緊急個案補助'
  }
];
