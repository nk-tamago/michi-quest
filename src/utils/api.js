import { GoogleGenAI } from '@google/genai';

// API呼び出し用のラッパーモジュール
export const generateMission = async (apiKey, modelName = 'gemini-2.5-flash', systemInstruction, chatHistory = [], newText = "今日のミッションをお願いします。") => {
  if (!apiKey) throw new Error("APIキーが設定されていません");
  
  const ai = new GoogleGenAI({ apiKey: apiKey });
  
  try {
    // 過去の履歴を Gemini の contents 形式に変換
    const formattedHistory = chatHistory.map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [
        { text: msg.type === 'image' ? '[写真が送信されました]' : msg.text }
      ]
    }));

    // 今回の新しいリクエストを追加
    const contents = [
      ...formattedHistory,
      { role: 'user', parts: [{ text: newText }] }
    ];

    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
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

export const evaluateReport = async (apiKey, modelName = 'gemini-2.5-flash', systemInstruction, missionText, imageBase64, chatHistory = [], newText = "写真を見て！") => {
  if (!apiKey) throw new Error("APIキーが設定されていません");
  
  const ai = new GoogleGenAI({ apiKey: apiKey });
  
  try {
    // Base64からヘッダ部分(data:image/jpeg;base64,)を削除
    const base64Data = imageBase64.split(',')[1];
    const mimeType = imageBase64.split(';')[0].split(':')[1];
    
    // 過去の会話履歴をフォーマット
    const formattedHistory = chatHistory.map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [
        { text: msg.type === 'image' ? '[写真が送信されました]' : msg.text }
      ]
    }));

    // Multi-modalリクエストの内容を構成
    const userContent = {
      role: 'user',
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        { text: `ミッション内容：「${missionText}」\n\n${newText}\n\nこの写真がミッションを満たしているか判定してください。` }
      ]
    };

    const contents = [...formattedHistory, userContent];

    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
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
