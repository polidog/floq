# Floq

[English](./README.md)

MS-DOSスタイルのテーマを備えたターミナルベースのGTD（Getting Things Done）タスクマネージャー。

## 特徴

- **TUIインターフェース**: Ink（CLI用React）で構築されたインタラクティブなターミナルUI
- **GTDワークフロー**: Inbox、Next Actions、Waiting For、Someday/Maybe
- **プロジェクト**: タスクをプロジェクトに整理
- **クラウド同期**: [Turso](https://turso.tech/)のembedded replicasによるオプションの同期機能
- **テーマ**: MS-DOSノスタルジックスタイルを含む複数テーマ
- **多言語対応**: 英語・日本語サポート
- **Vimスタイルナビゲーション**: hjklまたは矢印キーで操作

## インストール

```bash
npm install -g floq
```

### ソースからインストール

```bash
git clone https://github.com/polidog/gtd-cli.git
cd gtd-cli
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

# テーマ設定（j/kで選択するインタラクティブセレクター）
floq config theme

# または直接指定
floq config theme modern           # デフォルト
floq config theme synthwave        # ネオン80sスタイル

# データベースパス設定
floq config db /path/to/custom.db
floq config db                     # デフォルトに戻す
```

## クラウド同期（Turso）

Floqは[Turso](https://turso.tech/)を使用したクラウド同期をサポートしています。Embedded replicasにより、データはクラウドに同期されつつ、オフラインでも利用可能です。

### セットアップ

1. [turso.tech](https://turso.tech/)でデータベースを作成
2. データベースURLと認証トークンを取得
3. Floqを設定:

```bash
# Turso同期を有効化
floq config turso --url libsql://your-db.turso.io --token your-auth-token

# 設定確認
floq config show

# 手動同期
floq sync

# Turso同期を無効化
floq config turso --disable
```

### 仕組み

- **Embedded Replicas**: ローカルSQLiteデータベースがTursoクラウドと同期
- **オフラインサポート**: オフラインでも動作し、接続時に同期
- **自動同期**: オンライン時は60秒ごとにバックグラウンド同期
- **データベース分離**: Tursoモードは`gtd-turso.db`を使用し、ローカルDBと競合しない

### ステータス表示

- TUIヘッダーに接続状態を表示（Tursoはクラウドアイコン、ローカルはローカルアイコン）
- CLIコマンド実行時、Turso有効時は`🔄 Turso sync: hostname`を表示

## テーマ

16種類のテーマが利用可能。`floq config theme` でインタラクティブに選択（j/kで移動）。

| テーマ | 説明 |
|--------|------|
| `modern` | シンプルでクリーン（デフォルト） |
| `norton-commander` | MS-DOSファイルマネージャー風 |
| `dos-prompt` | 緑のCRTモニター |
| `turbo-pascal` | Borland IDE風 |
| `classic-mac` | Macintosh System 7モノクロ |
| `apple-ii` | Apple ][ グリーンモニター |
| `commodore-64` | C64の青紫カラー |
| `amiga-workbench` | Amigaのオレンジ＆ブルー |
| `matrix` | デジタルレイン風グリーン |
| `amber-crt` | 琥珀色モニター |
| `phosphor` | CRT残光エフェクト |
| `solarized-dark` | Solarizedダーク |
| `solarized-light` | Solarizedライト |
| `synthwave` | ネオン80sスタイル |
| `paper` | 紙とインク風ライト |
| `coffee` | 暖かみのある茶系 |

> **注意**: 背景色はターミナルの設定に依存します。

## データ保存場所

- 設定: `~/.config/gtd-cli/config.json`
- データベース: `~/.local/share/gtd-cli/gtd.db`

## ライセンス

MIT
