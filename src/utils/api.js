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

/**
 * OpenStreetMap Nominatim API を用いて、地名が実在するか確認する
 * @param {string} query - 検索する地名や施設名
 * @returns {Promise<boolean>} 実在する場合は true、見つからない場合は false
 */
export const verifyLocationExists = async (query) => {
  if (!query) return false;
  try {
    // Nominatimの利用規約（1秒間に1回以下のリクエストなど）に配慮
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MichiQuestApp/1.0' // API規約としてUser-Agentが推奨される
      }
    });
    
    if (!response.ok) {
        console.warn(`Nominatim API returned status: ${response.status}`);
        return true; // API制限やエラー時は、ユーザー体験を損なわないよう一旦trueとして通す方針
    }
    
    const data = await response.json();
    console.log("Nominatim API result for", query, ":", data);
    return data && data.length > 0;
  } catch (error) {
    console.warn("Geocoding verification failed, passing through.", error);
    return true; // ネットワークエラー等でも進行不能を防ぐため一旦通す設計
  }
};
