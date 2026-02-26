# MichiQuest 設計書

## 1. プロジェクトの概要
「MichiQuest」は、位置情報（Leaflet）とAIチャット（Google GenAI）を活用したReactベースのWebアプリケーションです。
道・ルートにまつわるクエストやチャットベースのインタラクションを提供する構成となっています。

## 2. 技術スタック
* **フレームワーク/ライブラリ**: React (v19)
* **ビルドツール**: Vite
* **スタイリング**: Tailwind CSS (v4)
* **地図機能**: Leaflet, React Leaflet
* **AI連携**: Google GenAI API
* **アイコン**: Lucide React
* **画像処理**: exif-js, exifr

## 3. ディレクトリ構成
```text
src/
├── components/    # 共通UIコンポーネント
│   ├── Button.jsx          # ボタン
│   ├── ChatBubble.jsx      # チャットの吹き出しUI
│   ├── Header.jsx          # アプリケーションヘッダー
│   ├── MapInteractive.jsx  # Leafletを用いたインタラクティブマップ
│   └── Sidebar.jsx         # サイドバーやナビゲーション
├── pages/         # 画面・機能ビュー単位のコンポーネント
│   ├── ChatThread.jsx      # AIチャットとのやり取り画面
│   └── Settings.jsx        # APIキーなどの設定画面
├── utils/         # ユーティリティ関数・カスタムフック
│   ├── api.js              # 外部API（Google GenAIなど）との通信
│   ├── exifUtils.js        # 画像のEXIF情報取得
│   ├── imageUtils.js       # 画像の圧縮・処理
│   └── useLocalStorage.js  # ローカルストレージ操作用カスタムフック
├── App.jsx        # アプリケーションのルートコンポーネント・全体的な状態管理
├── main.jsx       # エントリーポイント
└── index.css      # 全体スタイリング（Tailwindディレクティブ等）
```

## 4. アーキテクチャと状態管理
現在のフェーズでは、外部のグローバル状態管理ライブラリ（ReduxやZustandなど）は用いず、主に `App.jsx` と `useLocalStorage` を中心とした状態管理を行っています。

* **全体状態 (App.jsx)**
  * セッション情報、チャット履歴(`chatHistory`)、現在のミッション(`currentMission`) など、アプリ全体で共有されるデータや状態をルートコンポーネントで管理し、各子コンポーネントへPropsとして渡す設計です。
  * `handleUpdateChatHistory` や `handleUpdateCurrentMission` などのラッパー関数を通じて、状態の更新と他コンポーネント間の同期を取っています。
* **永続化 (useLocalStorage.js)**
  * AIのAPIキーなどの設定情報や、アプリを再読み込みしても維持すべき状態は `localStorage` に保存され、復元されます。

## 5. 設計規約・保守方針
今後の改修において、バグの発生を抑えるために以下の設計方針を順守してください。

1. **コンポーネントの責務分離**
   * UIの描画のみを行うプレゼンテーションコンポーネント（`components/`）と、ビジネスロジックや状態管理を持つコンテナレベルのコンポーネント（`pages/`、`App.jsx`）の役割を明確に分けること。
2. **状態管理の複雑化回避**
   * `App.jsx` に状態が集中しすぎている場合は、コンテクスト（`React.Context`）の導入や、各画面ローカルで完結できる状態に落とし込めないか検討すること。
3. **ユーティリティの活用と肥大化防止**
   * 外部APIの呼び出しや複雑なデータ整形処理は、コンポーネント内に直接書かず `utils/` 以下の各種ファイルに分割すること。
4. **スタイリング**
   * Tailwind CSSを活用し、インラインスタイルは極力避ける。再利用性の高いスタイルパターンはコンポーネント化するか、Vite+Tailwindの作法に乗っ取り定義すること。

---
*本書は初期調査を元に作成したものであり、仕様変更の際は随時更新するものとします。*
