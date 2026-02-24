import { GoogleGenAI } from '@google/genai';

// API呼び出し用のラッパーモジュール
export const generateMission = async (apiKey, modelName = 'gemini-2.5-flash', systemInstruction) => {
  if (!apiKey) throw new Error("APIキーが設定されていません");
  
  const ai = new GoogleGenAI({ apiKey: apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: "今日のミッションをお願いします。",
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.9,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Mission Generation Error:", error);
    throw new Error(error.message || "ミッションの生成に失敗しました");
  }
};

export const evaluateReport = async (apiKey, modelName = 'gemini-2.5-flash', systemInstruction, missionText, imageBase64) => {
  if (!apiKey) throw new Error("APIキーが設定されていません");
  
  const ai = new GoogleGenAI({ apiKey: apiKey });
  
  try {
    // Base64からヘッダ部分(data:image/jpeg;base64,)を削除
    const base64Data = imageBase64.split(',')[1];
    const mimeType = imageBase64.split(';')[0].split(':')[1];
    
    // Multi-modalリクエスト
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        `ミッション内容：「${missionText}」\n\nこの写真がミッションを満たしているか判定してください。`
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.4,
      }
    });
    
    return response.text;
  } catch (error) {
    console.error("Evaluation Error:", error);
    throw new Error(error.message || "写真の判定に失敗しました");
  }
};
