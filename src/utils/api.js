import { GoogleGenAI } from '@google/genai';

// APIがハングアップすることを防ぐためのタイムアウト設定（45秒）
const TIMEOUT_MS = 45000;

const withTimeout = (promise, ms) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`APIリクエストがタイムアウトしました（${ms / 1000}秒）。サーバの混雑、またはAIが画像の解析に失敗・制限ブロックしている可能性があります。`)), ms)
    )
  ]);
};

// 会話履歴をGeminiが受け付ける形式にフォーマットする（system除外、連続する同ロールの結合）
const formatHistory = (chatHistory) => {
  const formatted = [];
  for (const msg of chatHistory) {
    if (msg.role === 'system') continue;

    const role = msg.role === 'ai' ? 'model' : 'user';
    const textStr = msg.type === 'image' ? `[写真付きメッセージ: ${msg.text}]` : (msg.text || '');

    if (formatted.length > 0 && formatted[formatted.length - 1].role === role) {
      formatted[formatted.length - 1].parts[0].text += '\n\n' + textStr;
    } else {
      formatted.push({
        role: role,
        parts: [{ text: textStr }]
      });
    }
  }
  return formatted;
};

// API呼び出し用のラッパーモジュール
export const generateMission = async (apiKey, modelName = 'gemini-2.5-flash', systemInstruction, chatHistory = [], newText = "今日の調査対象をお願いします。") => {
  if (!apiKey) throw new Error("APIキーが設定されていません");

  const ai = new GoogleGenAI({ apiKey: apiKey });

  try {
    const formattedHistory = formatHistory(chatHistory);

    const contents = [...formattedHistory];
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += '\n\n' + newText;
    } else {
      contents.push({ role: 'user', parts: [{ text: newText }] });
    }

    const response = await withTimeout(ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.9,
      }
    }), TIMEOUT_MS);
    return response.text;
  } catch (error) {
    console.error("Mission Generation Error:", error);
    throw new Error(error.message || "調査依頼の生成に失敗しました");
  }
};

export const chatWithOperator = async (apiKey, modelName = 'gemini-2.5-flash', systemInstruction, chatHistory = [], newText = "進捗どう？", imageBase64 = null) => {
  if (!apiKey) throw new Error("APIキーが設定されていません");

  const ai = new GoogleGenAI({ apiKey: apiKey });

  try {
    const formattedHistory = formatHistory(chatHistory);

    const userParts = [{ text: newText }];
    if (imageBase64) {
      const base64Data = imageBase64.split(',')[1];
      const mimeType = imageBase64.split(';')[0].split(':')[1];
      userParts.unshift({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    }

    const contents = [...formattedHistory];
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts.push(...userParts);
    } else {
      contents.push({ role: 'user', parts: userParts });
    }

    const response = await withTimeout(ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.9,
      }
    }), TIMEOUT_MS);
    return response.text;
  } catch (error) {
    console.error("Operator Chat Error:", error);
    throw new Error(error.message || "チャット応答に失敗しました");
  }
};

export const evaluateReport = async (apiKey, modelName = 'gemini-2.5-flash', systemInstruction, missionText, imageBase64, chatHistory = [], newText = "写真を見て！") => {
  if (!apiKey) throw new Error("APIキーが設定されていません");

  const ai = new GoogleGenAI({ apiKey: apiKey });

  try {
    // Base64からヘッダ部分(data:image/jpeg;base64,)を削除
    const base64Data = imageBase64.split(',')[1];
    const mimeType = imageBase64.split(';')[0].split(':')[1];

    const formattedHistory = formatHistory(chatHistory);

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
        { text: `調査対象：「${missionText}」\n\n${newText}\n\nこの写真が調査対象を満たしているか判定してください。` }
      ]
    };

    const contents = [...formattedHistory];
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts.push(...userContent.parts);
    } else {
      contents.push(userContent);
    }

    const response = await withTimeout(ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.4,
      }
    }), TIMEOUT_MS);

    if (!response || !response.text) {
      throw new Error("AIが画像の解析に失敗したか、有効なテキストを返却しませんでした。");
    }

    return response.text;
  } catch (error) {
    console.error("Evaluation Error:", error);
    throw new Error(error.message || "写真の判定に失敗しました");
  }
};

/**
 * Google Maps Places API (Text Search) を用いて、地名が実在するか確認する
 * FieldMaskを指定して Essentials (Places API Text Search Essentials) の無料枠（月1万回）に収める
 * @param {string} query - 検索する地名や施設名
 * @param {string} apiKey - Google Maps API Key
 * @returns {Promise<boolean|object>} 実在する場合は座標オブジェクト{lat, lng}、見つからない場合は false
 */
export const verifyLocationExists = async (query, apiKey) => {
  if (!query || !apiKey) return false;
  
  try {
    const url = 'https://places.googleapis.com/v1/places:searchText';
    const requestBody = {
      textQuery: query,
      languageCode: 'ja'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // Essentials枠に収めるため、名前と座標情報のみを要求する
        'X-Goog-FieldMask': 'places.displayName,places.location'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.warn(`Places API returned status: ${response.status}`);
      // API制限やエラー時は、ユーザー体験を損なわないよう一旦true相当のダミーを返す設計も考慮可能だが、
      // 移行フェーズのためまずは厳密にfalse判定か、エラーを投げる
      return false; 
    }

    const data = await response.json();
    console.log("Places API result for", query, ":", data);
    
    // places配列に1件でもデータがあれば実在すると判定し、最初の候補の座標を返す
    if (data.places && data.places.length > 0 && data.places[0].location) {
      return {
        lat: data.places[0].location.latitude,
        lng: data.places[0].location.longitude
      };
    }
    
    return false;
  } catch (error) {
    console.warn("Places API Geocoding verification failed, passing through.", error);
    // ネットワークエラー等でも進行不能を防ぐため一旦通す設計（呼び出し側でフォールバックさせる）
    return true; 
  }
};
