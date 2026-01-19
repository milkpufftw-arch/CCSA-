
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

  const prompt = `Analyze this list of NGO subsidy disbursements and provide a concise summary (under 200 words) in Traditional Chinese. 
  Highlight:
  1. Total amount.
  2. The most common subsidy item.
  3. Any notable funding source contribution.
  4. A brief recommendation for budget tracking.
  
  Data: ${JSON.stringify(summaryData)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Unable to generate insights at this time.";
  } catch (error) {
    console.error("AI Insights Error:", error);
    return "AI insight engine is currently unavailable.";
  }
};
