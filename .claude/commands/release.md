# Release Skill

npmパッケージのリリースワークフローを自動化します。

## Triggers

- release
- リリース
- npm publish
- バージョンアップ
- version bump

## Instructions

ユーザーが `/release` を実行したら、以下のリリースワークフローを実行してください。

### 1. リリースタイプの確認

ユーザーに以下を確認してください（引数で指定されていない場合）：

- **patch** (0.0.x): バグ修正
- **minor** (0.x.0): 新機能追加（後方互換性あり）
- **major** (x.0.0): 破壊的変更

### 2. 事前チェック

リリース前に以下を確認：

```bash
# 作業ディレクトリがクリーンか確認
git status --porcelain

# 現在のブランチがmainか確認
git branch --show-current

# リモートとの同期状態を確認
git fetch origin && git status -uno
```

問題があれば警告してユーザーに確認を取ってください。

### 3. バージョン更新

`package.json` の version を更新します：

```bash
# 現在のバージョンを取得
npm pkg get version

# バージョンを更新（patch/minor/major）
npm version <type> --no-git-tag-version
```

### 4. CHANGELOG 生成

前回のタグから現在までのコミット履歴を取得し、CHANGELOG.md を更新：

```bash
# 最新のタグを取得
git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0"

# コミット履歴を取得
git log <前回タグ>..HEAD --pretty=format:"- %s" --no-merges
```

CHANGELOG.md の形式：

```markdown
# Changelog

## [x.x.x] - YYYY-MM-DD

### Added
- 新機能のコミット

### Changed
- 変更のコミット

### Fixed
- バグ修正のコミット
```

コミットメッセージのプレフィックスで分類：
- `feat:`, `add:` → Added
- `fix:` → Fixed
- `change:`, `update:`, `refactor:` → Changed
- その他 → Changed

### 5. コミットとタグ作成

```bash
# 変更をコミット
git add package.json CHANGELOG.md
git commit -m "chore: release v<新バージョン>"

# タグを作成
git tag -a v<新バージョン> -m "Release v<新バージョン>"
```

### 6. プッシュ

```bash
# コミットとタグをプッシュ
git push origin main
git push origin v<新バージョン>
```

### 7. GitHub Release 作成

```bash
# GitHub CLIでリリースを作成
gh release create v<新バージョン> \
  --title "v<新バージョン>" \
  --notes-file - <<EOF
## What's Changed

<CHANGELOGの該当バージョンの内容>

**Full Changelog**: https://github.com/polidog/gtd-cli/compare/<前回タグ>...v<新バージョン>
EOF
```

### 注意事項

- 各ステップの実行前にユーザーに確認を取ってください
- エラーが発生した場合は、ロールバック方法を提示してください
- `--dry-run` オプションが指定された場合は、実際の操作を行わず、実行される内容を表示するだけにしてください
- npm publish は GitHub Actions で自動実行されます（GitHub Release 作成時にトリガー）
