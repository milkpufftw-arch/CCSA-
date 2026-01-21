
import { GoogleGenAI } from "@google/genai";
import { SubsidyRecord } from "../types";

export const getFinancialInsights = async (records: SubsidyRecord[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const summaryData = records.map(r => ({
    client: r.clientName,
    item: r.item,
    amount: r.amount,
    source: r.source
  }));

  const prompt = `你是一個專業的財務分析師。請針對以下 NGO 補助撥款清單提供簡潔的總結報告（繁體中文，200字以內）。
  
  ⚠️ 嚴格指令：
  1. 報告中出現的所有「人名」（例如：涂芯瑜）必須 100% 按照原始數據顯示。
  2. 絕對禁止進行任何自動字體轉換（例如：絕對不能把「涂」改為「塗」）。
  
  內容包含：
  1. 累計總金額。
  2. 最常出現的補助項目。
  3. 值得注意的經費來源貢獻。
  4. 一個關於預算追蹤的簡短建議。
  
  數據：${JSON.stringify(summaryData)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "目前無法生成分析洞察。";
  } catch (error) {
    console.error("AI Insights Error:", error);
    return "AI 分析引擎目前無法連線。";
  }
};
