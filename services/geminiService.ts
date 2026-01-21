
import { GoogleGenAI } from "@google/genai";
import { SubsidyRecord } from "../types";

/**
 * 取得財務洞察分析
 * 優化點：
 * 1. 數據聚合：將原始紀錄按項目與來源加總，減少傳輸量，避免數據過大導致超時。
 * 2. 速度優化：設定 thinkingBudget: 0 以獲得最快回應。
 * 3. 穩定性：加強錯誤偵測與友善提示。
 */
export const getFinancialInsights = async (records: SubsidyRecord[]): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return "系統未偵測到有效的 API 金鑰，請聯繫管理員。";
  }

  const ai = new GoogleGenAI({ apiKey });

  // 1. 數據聚合：按「補助項目」與「經費來源」進行分類加總，避免傳送過多重複明細
  const aggregated = records.reduce((acc, r) => {
    const key = `${r.item}|${r.source}`;
    if (!acc[key]) {
      acc[key] = { 
        item: r.item, 
        source: r.source, 
        totalAmount: 0, 
        count: 0,
        sampleClients: new Set<string>() 
      };
    }
    acc[key].totalAmount += r.amount;
    acc[key].count += 1;
    acc[key].sampleClients.add(r.clientName);
    return acc;
  }, {} as Record<string, { item: string, source: string, totalAmount: number, count: number, sampleClients: Set<string> }>);

  // 轉換為精簡的摘要格式供 AI 閱讀
  const summaryData = Object.values(aggregated).map(group => ({
    item: group.item,
    source: group.source,
    totalAmount: group.totalAmount,
    recordsCount: group.count,
    clientsInvolved: Array.from(group.sampleClients).slice(0, 5) // 僅提供部分姓名參考範疇
  }));

  const totalSum = records.reduce((s, r) => s + r.amount, 0);

  const prompt = `你是一個專業的 NGO 財務分析助手。請針對以下補助數據提供一份精簡、客觀的分析報告。
  
  ⚠️ 最高優先級指令 (人名保護)：
  - 報告中提到的任何「人名」必須與原始數據完全一致（例如：涂芯瑜）。
  - 絕對禁止進行自動校正、簡繁體轉換或任何形式的字體修改。
  
  分析要求：
  1. 概括目前的核銷進度與總金額 ($${totalSum.toLocaleString()})。
  2. 識別佔比最高的補助項目與經費來源。
  3. 指出是否有異常的大額支出或集中現象。
  4. 提供一個具體的財務管理建議。
  
  語言：繁體中文（台灣習慣）。
  長度：約 150-200 字。
  
  數據摘要：${JSON.stringify(summaryData)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        thinkingConfig: { thinkingBudget: 0 }, // 禁用思考以換取最快的回應速度
        temperature: 0.2, // 降低隨機性，確保分析結果穩定
      },
    });

    return response.text || "AI 回傳了空的結果，請稍後再試。";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // 針對常見錯誤提供友善提示
    const msg = error.message || "";
    if (msg.includes("API_KEY_INVALID")) return "錯誤：API 金鑰無效，請檢查設定。";
    if (msg.includes("quota")) return "錯誤：已達今日 API 使用量上限。";
    if (msg.includes("Safety")) return "分析內容被安全過濾器攔截（可能包含過多個資）。";
    
    return `分析引擎暫時無法運作 (${msg.slice(0, 30)}...)。請檢查網路或稍後再試。`;
  }
};
