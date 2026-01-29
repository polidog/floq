# Floq

[English](./README.md)

MS-DOSスタイルのテーマを備えたターミナルベースのGTD（Getting Things Done）タスクマネージャー。

## 特徴

- **TUIインターフェース**: Ink（CLI用React）で構築されたインタラクティブなターミナルUI
- **GTDワークフロー**: Inbox、Next Actions、Waiting For、Someday/Maybe
- **プロジェクト**: タスクをプロジェクトに整理
- **テーマ**: MS-DOSノスタルジックスタイルを含む複数テーマ
- **多言語対応**: 英語・日本語サポート
- **Vimスタイルナビゲーション**: hjklまたは矢印キーで操作

## インストール

```bash
npm install
npm run build
npm link
```

## 使い方

### TUIモード

```bash
floq
```

### キーボードショートカット

| キー | アクション |
|------|-----------|
| `1-5` | タブ切り替え |
| `h/l` または `←/→` | 前/次のタブ |
| `j/k` または `↑/↓` | タスク選択 |
| `a` | タスク追加 |
| `d` | 完了にする |
| `n` | Next Actionsに移動 |
| `s` | Someday/Maybeに移動 |
| `i` | Inboxに移動 |
| `p` | プロジェクトに変換 |
| `P` | プロジェクトに紐付け |
| `Enter` | プロジェクトを開く（Projectsタブ） |
| `Esc/b` | プロジェクトから戻る |
| `r` | 更新 |
| `?` | ヘルプ |
| `q` | 終了 |

### CLIコマンド

```bash
# タスク追加
floq add "タスクのタイトル"
floq add "タスクのタイトル" -p "プロジェクト名"

# タスク一覧
floq list              # 未完了タスク全て
floq list inbox        # Inboxのみ
floq list next         # Next actions
floq list waiting      # Waiting for
floq list someday      # Someday/maybe
floq list projects     # プロジェクト

# タスク移動
floq move <id> next
floq move <id> waiting "担当者名"
floq move <id> someday

# タスク完了
floq done <id>

# プロジェクト
floq project add "プロジェクト名"
floq project list
floq project show <id>
floq project complete <id>
```

## 設定

```bash
# 設定表示
floq config show

# 言語設定
floq config lang en    # 英語
floq config lang ja    # 日本語

# テーマ設定
floq config theme modern           # デフォルト
floq config theme norton-commander # MS-DOSスタイル
floq config theme dos-prompt       # 緑テキスト
floq config theme turbo-pascal     # IDEスタイル

# データベースパス設定
floq config db /path/to/custom.db
floq config db                     # デフォルトに戻す
```

## テーマ

### modern（デフォルト）
シンプルでクリーンなスタイル。シングルボーダー。

### norton-commander
- ダブルラインボーダー（╔═╗║╚═╝）
- 大文字ヘッダー
- 画面下部にファンクションキーバー
- シアン/黄色のカラースキーム

### dos-prompt
- シングルラインボーダー
- 緑テキスト（CRTモニター風）
- シンプルな `>` 選択インジケータ

### turbo-pascal
- ダブルラインボーダー
- 黄色のアクセント
- IDE風の外観

> **注意**: 背景色はターミナルの設定に依存します。完全なDOS体験のためには、ターミナルの背景色を青（#0000AA）に設定してください。

## データ保存場所

- 設定: `~/.config/gtd-cli/config.json`
- データベース: `~/.local/share/gtd-cli/gtd.db`

## ライセンス

MIT
