# 02. システムアーキテクチャ (Architecture)

## 1. 採用技術スタック
MichiQuest はモダンなフロントエンド技術のみで完結するサーバーレス・アーキテクチャ（BaaS / API依存型）で構築されています。

*   **フロントエンド・フレームワーク**: React 18
*   **ビルドツール**: Vite
*   **スタイリング**: Tailwind CSS (ユーティリティファーストCSS)
*   **アイコン**: Lucide React
*   **地図レンダリング**: Google Maps JavaScript API (`@vis.gl/react-google-maps`)
*   **画像・Exif処理**: `exifr` (GPS座標抽出)、HTML5 Canvas (クライアントサイドでの自動リサイズ)
*   **外部API**: 
    *   **Google Gemini API**: `gemini-2.5-flash`等のマルチモーダルモデル。チャット対話、ミッション生成、画像解析に使用。
    *   **Google Maps Platform (Places API / Text Search)**: AIが生成した目的地名のジオコーディング（実在座標の取得とバリデーション）に使用。無料枠適用のため FieldMask を利用。

## 2. アプリケーション構成
バックエンド・データベースを持たず、ユーザーのブラウザ・ストレージ（LocalStorage）にデータを保存する完全クライアントサイド型（PWAを想定）で動作します。

```text
[ User (ブラウザ / PWA) ]
   |
   +-- (React Components: Chat, Map, Sidebar, Settings)
   |
   |-- [ LocalStorage ] (状態の永続化: 履歴、設定、APIキー)
   |
   |-- (HTTP Requests) --> [ Google Gemini API ] (LLM対話、画像解析)
   |
   +-- (HTTP Requests) --> [ Google Maps Platform ] (地理情報の検証)
```

## 3. インデックス・ファイル構成
*   `src/App.jsx`: アプリケーションのルート。状態管理（セッション、設定）を統括。
*   `src/components/`: 再利用可能なUI部品（Header, Sidebar, ChatBubble, Button, MapInteractive 等）。
*   `src/pages/`: 大きな機能領域（ChatThread, Settings）。
*   `src/utils/`: ユーティリティ関数。
    *   `api.js`: Gemini API や Nominatim API との通信ロジック。
    *   `exifUtils.js`: ExifからのGPS抽出。
    *   `imageUtils.js`: Canvasを用いた画像リサイズ（通信量削減）。
    *   `useLocalStorage.js`: StateとLocalStorageを同期するカスタムフック。

## 4. 状態管理戦略 (State Management)
*   Reactの標準機能である `useState` と `useEffect` を中心に状態を管理し、`useLocalStorage` カスタムフックによって永続化しています。
*   **グローバルな状態**: `App.jsx` が保持。`chatSessions` (全履歴)、`michi-trust-score` (信頼度/ニコちゃんマーク)、`michi-field-notes` (知見コレクション)、各種設定(APIキー、プロンプト、アバター)。
*   **ローカルな状態**: `ChatThread.jsx` (入力テキスト、画像プレビュー、リプレイステート)、`MapInteractive.jsx` (地図の現在地表示)。

## 5. デプロイメント層 (Deployment)
*   **ホスティング環境**: GitHub Pages にデプロイしてパブリックに公開します。
*   **自動デプロイメント (CI/CD)**: GitHub Actions を用いて、`main` ブランチへのプッシュをトリガーとして静的ファイルのビルド（`vite build`）と GitHub Pages へのデプロイを自動化しています。
