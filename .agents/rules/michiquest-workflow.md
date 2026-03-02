---
trigger: always_on
---

---
name: michiquest-workflow
description: MichiQuestの開発の進め方。ドキュメント先行、段階的確認、デザインやReact実装での他スキルの遵守を定義します。常にこのプロジェクトの開発で遵守すべきルールです。
---
# MichiQuest 開発ワークフロー・ルール

このプロジェクト（MichiQuest）における開発・実装タスクを進める際は、以下のルールを**例外なく遵守**してください。

## 1. ドキュメント先行更新 (Doc-Driven Development)
実装コードを書き始める前に、必ず `michi-quest\doc` ディレクトリ以下の関連する設計ドキュメントを更新してください。
更新するファイル例：
- `design.md` (インデックス)
- `01_overview.md`
- `02_architecture.md`
- `03_functional_requirements.md`
- `04_functional_design.md`

## 2. 段階的アプローチとユーザー確認
タスクを一気に（複数工程を跨いで）実装してはいけません。
以下の工程（フェーズ）ごとに区切りをつけ、`notify_user` を利用するか、回答の末尾でユーザーに確認・承認を求めてから次のステップへ進んでください。
1. 要件確認と設計ドキュメントの更新
2. UIコンポーネント／基盤となるモジュールの実装
3. ロジックの組み込みおよび動作確認

## 3. ガイドライン・スキルの遵守
コードを記述する際（特にWebデザインやReactの実装）は、以下の既存スキルルールを必ず読み込み、その内容に従ってください。

- **Webデザイン全般**:
  `michi-quest\.agents\skills\web-design-guidelines\SKILL.md` を厳守すること。
- **Reactの実装・ベストプラクティス**:
  `michi-quest\.agents\skills\vercel-react-best-practices\SKILL.md` （およびその配下のrules）を厳守すること。