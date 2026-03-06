# MichiQuest プロジェクト設計書

本ドキュメントは、生成AIを活用したミッションアプリ「MichiQuest（ミチ・クエスト）」のトップレベル設計書です。
フェーズ1からフェーズ4までの開発完了に伴い、システム全体の設計ドキュメントを詳細化し、以下の4つのファイルに分割・整理しました。
今後の開発や別エージェントへの引き継ぎの際は、以下のドキュメントを参照してください。

## 詳細設計ドキュメント一覧

1. **[01_overview.md](./01_overview.md)** (全体概要)
   * プロジェクトの背景と目的、ターゲットユーザー
   * アプリケーションのコアバリュー
   * 各開発フェーズ（Phase 1〜4）の変遷と実装内容

2. **[02_architecture.md](./02_architecture.md)** (アーキテクチャ)
   * 採用技術スタック (React, Vite, Tailwind CSS, Leaflet 等)
   * PWA・完全クライアントサイド型（LocalStorageベース）のシステム構成図
   * インデックスと主要ファイル構成、状態管理（State Management）戦略

3. **[03_functional_requirements.md](./03_functional_requirements.md)** (機能要件)
   * アプリケーションの基本動作（タブ切替、データ永続化）
   * AIナビゲータとのチャット・ハルシネーション（架空の目的地）対策
   * 画像アップロード・Exif抽出・リサイズ処理・AI判定要件
   * 地図機能、ゲーミフィケーション（称号コレクション）、リプレイモード要件

4. **[04_functional_design.md](./04_functional_design.md)** (機能設計)
   * チャット対話とミッション生成の裏側（プロンプト構築と `[AREA]` / `[TITLE]` タグのパース）
   * Nominatim APIを用いた実在判定・自動リトライのフロー
   * リプレイモード（UIの動的切り替えとコントローラー操作）のロジック

5. **[05_game_experience_redesign.md](./05_game_experience_redesign.md)** (ゲーム体験リデザイン計画)
   * フィールドノート蓄積型への体験移行計画
   * 新ゲームメカニクス: ★データ品質判定、知見コレクション、信頼度システム、ミッション変更対応
   * 現行システムからの移行マッピングと段階的実装フェーズ

6. **[06_google_maps_migration_status.md](./06_google_maps_migration_status.md)** (Google Maps API 移行ステータス)
   * OpenStreetMap・Nominatim APIからGoogle Maps APIへの移行作業の進捗と引継ぎ事項

---

## 開発フェーズの進捗 (History)
* [x] **フェーズ1**: コア基盤（チャットUI、マップ、Gemini API連携、LocalStorage永続化）
* [x] **フェーズ2**: 没入感強化（Exif座標抽出、画像リサイズ、キャラ設定・アバタープロンプトカスタマイズ）
* [x] **フェーズ3**: ゲーム要素（ハルシネーション対策、動的「称号」コレクション、キャラによる通知）
* [x] **フェーズ4**: 動画制作支援（チャット履歴リプレイ機能、リプレイコントローラーUI自動切替）
* [x] **フェーズ5**: データ管理（エクスポート・インポート機能）
* [x] **フェーズ6**: ゲーム体験リデザイン（★品質判定・知見コレクション・信頼度システム導入）→ [05_game_experience_redesign.md](./05_game_experience_redesign.md)
* [x] **フェーズ7**: 地図機能および実在判定エンジン等のGoogle Maps移行（※デバッグ・引継ぎ中）→ [06_google_maps_migration_status.md](./06_google_maps_migration_status.md)

プロジェクトの基本機能群はフェーズ5をもって完成しています。フェーズ6では体験の大幅な刷新を行います。詳細は上記リデザイン計画を参照してください。
