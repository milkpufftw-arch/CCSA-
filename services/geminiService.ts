
import { GoogleGenAI } from "@google/genai";
import { SubsidyRecord } from "../types";

/**
 * 取得財務洞察分析
 */
export const getFinancialInsights = async (records: SubsidyRecord[]): Promise<string> => {
  // 每次呼叫時才抓取最新 API_KEY，確保能讀取到用戶剛在對話框選定的金鑰
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    return "NOT_CONFIGURED"; // 特殊標記，讓 UI 顯示設定按鈕
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // 數據聚合：減少傳輸量
    const aggregated = records.reduce((acc, r) => {
      const key = `${r.item}|${r.source}`;
      if (!acc[key]) {
        acc[key] = { 
          item: r.item, 
          source: r.source, 
          totalAmount: 0, 
          count: 0 
        };
      }
      acc[key].totalAmount += r.amount;
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, { item: string, source: string, totalAmount: number, count: number }>);

    const summaryData = Object.values(aggregated).map(group => ({
      item: group.item,
      source: group.source,
      totalAmount: group.totalAmount,
      recordsCount: group.count
    }));

    const totalSum = records.reduce((s, r) => s + r.amount, 0);

    const prompt = `你是一個專業的 NGO 財務分析助手。請針對以下補助數據提供一份精簡、客觀的分析報告。
    ⚠️ 人名保護指令：報告中絕對禁止修改任何個案姓名（例如：涂芯瑜 嚴禁改為 塗芯瑜）。
    
    數據：
    - 累計總額：$${totalSum.toLocaleString()}
    - 項目明細：${JSON.stringify(summaryData)}
    
    分析要求：
    1. 概括補助趨勢。
    2. 指出資金是否過度集中於特定項目。
    3. 提供一個專業建議。
    使用繁體中文，150字內。`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 0.1,
      },
    });

    return response.text || "分析結果為空。";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("not found")) return "KEY_EXPIRED";
    return `分析暫時無法運作：${error.message || "未知錯誤"}`;
  }
};
