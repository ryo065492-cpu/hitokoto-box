# ROADMAP

## v0.8

- ホーム画面からアプリ内の「声で入れる」ボタンを外し、入力欄近くの短い補足だけにする。
- 入力欄を日本語入力しやすい属性にする。
- `/entries` を追加し、保存されたひとことをアプリ内で日本語確認できるようにする。
- `/entries` は admin 合い言葉で保護し、最新50件表示、1件削除、テストデータ削除を提供する。

## v0.7.2

- 無料運用を優先し、ホームの「声で入れる」から OpenAI API 音声文字起こしを呼ばない。
- 「声で入れる」は入力欄にフォーカスし、iPhone / iPad 標準キーボードのマイク入力へ誘導する。
- `/api/transcribe` は将来検証用に残すが、通常UIとは切り離す。

## v0.7

- 「声で入れる」を Web Speech API 依存から録音 -> サーバー文字起こし方式へ変更する。
- `/api/transcribe` は `OPENAI_API_KEY` をサーバー専用で使い、録音音声は保存しない。
- 文字起こし結果は入力欄へ追記し、自動保存はしない。
- ホーム画面には OpenAI、API、token などの説明を出さず、静かな入力体験を維持する。

## v0.5

- 通常入力画面から合い言葉を外し、開いたらすぐ書ける状態にする
- 閲覧、管理、削除、export/import は admin 合い言葉で保護する
- `/api/entries` の投稿は空文字拒否、最大 2000 文字、簡易 rate limit を入れる
- iOSショートカット用の `QUICK_CAPTURE_TOKEN` は維持する
- `FAMILY_PASSCODE` は廃止する

## v0.4

- cloud mode は Client -> Next.js API -> Supabase の保存経路にする
- `SUPABASE_SERVICE_ROLE_KEY` はサーバー専用にし、ブラウザへ出さない
- iPhone / iPad のホーム画面追加を前提に PWA 設定を整える
- iOSショートカットから `/api/quick-capture` へ投稿できる入口を用意する
- 次段階で Supabase Auth / RLS の本格設計へ進められるよう、直接クライアントアクセスをやめる

## v0

- ローカル MVP
- Next.js + TypeScript + Tailwind CSS
- IndexedDB 保存
- テキスト / 写真 / 音声入力
- ルールベース分析
- 週のまとめ
- 開発者向けノート
- JSON エクスポート / インポート

## v1

- OpenAI API による本格分析
- 写真から内容の読み取り
- ひとことから構造化 JSON 生成
- 週次まとめ品質の改善

## v2

- Supabase での家族同期
- 家族ごとの非公開 / 共有設定
- PWA 化
- Push 通知
- 週 1 回のまとめ通知

## v3

- Codex 向け Issue 生成
- GitHub 連携
- Notion / Google Sheets 連携
- 買い物リスト生成
- 献立支援
- 書類写真から手続き整理
- 家事の見えない負担の可視化
