<div align="center">

# MichiQuest（ミチ・クエスト）

**AIナビゲーターと探索するフィールドノート蓄積型アドベンチャー**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Built with React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Deploy: GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-222?logo=github&logoColor=white)](https://nk-tamago.github.io/michi-quest/)

[**▶ アプリを開く**](https://nk-tamago.github.io/michi-quest/)

</div>

---

## Overview

**MichiQuest** は、日常のツーリングに「ゲームのような目的と達成感」を与える AI ナビゲーション アプリ です。

Google Gemini API を活用し、現在地周辺の探索ミッションを動的に生成。ユーザーが実世界で指定された場所に赴き、写真を撮影して報告すると、AI キャラクター **「ミチ・ノマ」** が学術的（かつ少し不器用）な口調で評価してくれます。

### Features
- **AI ミッション生成** — 現在地に合わせた探索ミッションを毎回異なるテーマで提案
- **写真 & GPS 判定** — Exif データの GPS 座標と画像認識で到達を AI が自動判定
- **インタラクティブマップ** — Leaflet による目的地の表示とナビゲーション
- **個性的な AI キャラクター** — 塩対応＆ツンデレな探究者「ミチ・ノマ」との対話
- **フィールドノート蓄積** — 調査で得た「知見」をコレクションとして収集
- **信頼度システム** — ミッションを通じて上下するニコちゃんマーク（信頼度）
- **リプレイモード** — 過去のミッション履歴をチャット形式で再生（動画素材にも）
- **バックアップ & リストア** — 調査データのエクスポート / インポート機能

## Tech Stack

| カテゴリ       | 技術                                      |
| -------------- | ----------------------------------------- |
| フロントエンド | React 19, Vite 7                          |
| スタイリング   | Tailwind CSS 4                            |
| 地図           | Leaflet / react-leaflet                   |
| AI / LLM       | Google Gemini API (`gemini-2.5-flash`)    |
| 地理情報       | OpenStreetMap Nominatim API               |
| 画像処理       | exifr (GPS 抽出), HTML5 Canvas (リサイズ) |
| アイコン       | Lucide React                              |
| デプロイ       | GitHub Pages + GitHub Actions (CI/CD)     |
| PWA            | vite-plugin-pwa                           |

## Getting Started

### Prerequisites

- **Node.js** 18 以上
- **Google Gemini API キー** — [Google AI Studio](https://aistudio.google.com/apikey) で取得

### Setup

```bash
# リポジトリをクローン
git clone https://github.com/nk-tamago/michi-quest.git
cd michi-quest

# 依存パッケージをインストール
npm install

# 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:5173/michi-quest/` を開き、設定画面から **Gemini API キー** を入力すれば準備完了です。

### Other Commands

```bash
npm run build    # 本番ビルド
npm run preview  # ビルドのプレビュー
npm run lint     # ESLint による静的解析
```

## Project Structure

```
michi-quest/
├── doc/                    # 設計ドキュメント
│   ├── design.md           #   設計書インデックス
│   ├── 01_overview.md      #   全体概要
│   ├── 02_architecture.md  #   アーキテクチャ
│   ├── 03_functional_requirements.md
│   ├── 04_functional_design.md
│   └── 05_game_experience_redesign.md
├── src/
│   ├── App.jsx             # ルートコンポーネント（状態管理の中枢）
│   ├── components/         # 再利用可能な UI コンポーネント
│   │   ├── ChatBubble.jsx
│   │   ├── Header.jsx
│   │   ├── MapInteractive.jsx
│   │   ├── Sidebar.jsx
│   │   └── ...
│   ├── pages/              # ページレベルコンポーネント
│   ├── utils/              # ユーティリティ
│   │   ├── api.js          #   Gemini / Nominatim API 通信
│   │   ├── exifUtils.js    #   Exif GPS 抽出
│   │   ├── imageUtils.js   #   画像リサイズ
│   │   └── useLocalStorage.js  # LocalStorage 同期フック
│   └── config.js           # AI プロンプト・アプリ設定
├── image/                  # キャラクター画像アセット
├── public/                 # 静的ファイル
├── index.html
├── vite.config.js
└── package.json
```

## Design Documents

詳しい設計情報は [`doc/`](./doc/) ディレクトリを参照してください。

| ドキュメント                                                           | 内容                                         |
| ---------------------------------------------------------------------- | -------------------------------------------- |
| [design.md](./doc/design.md)                                           | 設計書インデックス・開発フェーズ進捗         |
| [01_overview.md](./doc/01_overview.md)                                 | 背景・目的・ターゲットユーザー・コアバリュー |
| [02_architecture.md](./doc/02_architecture.md)                         | 技術スタック・システム構成・状態管理         |
| [03_functional_requirements.md](./doc/03_functional_requirements.md)   | 機能要件                                     |
| [04_functional_design.md](./doc/04_functional_design.md)               | 機能設計（プロンプト構築・リプレイ等）       |
| [05_game_experience_redesign.md](./doc/05_game_experience_redesign.md) | ゲーム体験リデザイン計画                     |

## License

[MIT License](./LICENSE) © 2026 nk-tamago
