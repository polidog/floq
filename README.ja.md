# Floq

[English](./README.md)

MS-DOSスタイルのテーマを備えたターミナルベースのGTD（Getting Things Done）タスクマネージャー。

## 特徴

- **TUIインターフェース**: Ink（CLI用React）で構築されたインタラクティブなターミナルUI
- **GTDワークフロー**: Inbox、Next Actions、Waiting For、Someday/Maybe、Done
- **カンバンモード**: 3カラムのカンバンボード表示（TODO、Doing、Done）
- **プロジェクト**: タスクをプロジェクトに整理（進捗バー表示付き）
- **タスク検索**: `/` キーで全タスクを素早く検索
- **コメント**: タスクにメモやコメントを追加
- **クラウド同期**: [Turso](https://turso.tech/)のembedded replicasによるオプションの同期機能
- **テーマ**: MS-DOSノスタルジックスタイルを含む複数テーマ
- **多言語対応**: 英語・日本語サポート
- **Vimスタイルナビゲーション**: hjklまたは矢印キーで操作
- **セットアップウィザード**: 初回起動時の簡単設定

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

### キーボードショートカット（GTDモード）

| キー | アクション |
|------|-----------|
| `1-6` | タブ切り替え（Inbox/Next/Waiting/Someday/Projects/Done） |
| `h/l` または `←/→` | 前/次のタブ |
| `j/k` または `↑/↓` | タスク選択 |
| `a` | タスク追加 |
| `d` | 完了にする |
| `n` | Next Actionsに移動 |
| `s` | Someday/Maybeに移動 |
| `i` | Inboxに移動 |
| `w` | Waiting Forに移動（担当者入力） |
| `p` | プロジェクトに変換 |
| `P` | プロジェクトに紐付け |
| `Enter` | タスク詳細を開く / プロジェクトを開く |
| `Esc/b` | 戻る |
| `/` | タスク検索 |
| `r` | 更新 |
| `?` | ヘルプ |
| `q` | 終了 |

#### タスク詳細画面

| キー | アクション |
|------|-----------|
| `i` | コメント追加 |
| `d` | 選択中のコメントを削除 |
| `j/k` | コメント選択 |
| `Esc/b` | 一覧に戻る |

### キーボードショートカット（カンバンモード）

| キー | アクション |
|------|-----------|
| `1-3` | カラム切り替え（TODO/Doing/Done） |
| `h/l` または `←/→` | 前/次のカラム |
| `j/k` または `↑/↓` | タスク選択 |
| `a` | タスク追加 |
| `d` | 完了にする |
| `m` | タスクを右に移動（→） |
| `Backspace` | タスクを左に移動（←） |
| `Enter` | タスク詳細を開く |
| `/` | タスク検索 |
| `r` | 更新 |
| `?` | ヘルプ |
| `q` | 終了 |

#### タスク詳細画面（カンバン）

| キー | アクション |
|------|-----------|
| `i` | コメント追加 |
| `d` | 選択中のコメントを削除 |
| `j/k` | コメント選択 |
| `Esc/b` | ボードに戻る |

### セットアップウィザード

初回起動時、Floqはインタラクティブなセットアップウィザードを起動します:
- 言語（英語/日本語）
- テーマ選択
- 表示モード（GTD/カンバン）

手動でウィザードを起動することもできます:

```bash
floq setup
```

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

# コメント
floq comment <id> "コメント内容"  # コメント追加
floq comment <id>                  # コメント一覧
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

# 表示モード設定（インタラクティブセレクター）
floq config mode

# または直接指定
floq config mode gtd               # GTDワークフロー（デフォルト）
floq config mode kanban            # カンバンボード

# データベースパス設定
floq config db /path/to/custom.db
floq config db                     # デフォルトに戻す

# データベースリセット（全データ削除）
floq db reset                      # 確認あり
floq db reset --force              # 確認なし
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
- **データベース分離**: Tursoモードは`floq-turso.db`を使用し、ローカルDBと競合しない

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

- 設定: `~/.config/floq/config.json`
- データベース: `~/.local/share/floq/floq.db`（Turso有効時は`floq-turso.db`）

## ライセンス

MIT
