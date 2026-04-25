# DECISIONS

## v0.7 音声入力の判断

- アプリ内の「声で入れる」は Web Speech API 依存をやめ、MediaRecorder で録音して `/api/transcribe` に送る方式にした。
- `/api/transcribe` はサーバー側だけで `OPENAI_API_KEY` を使い、クライアントへ API key を出さない。
- 文字起こし結果は入力欄に追記するだけで、自動保存はしない。ユーザーが確認してから保存する。
- 録音音声は保存しない。文字起こし処理後にブラウザ側の Blob 参照を破棄する。
- 週次まとめや分類分析は引き続きルールベースで、OpenAI API は v0.7 時点では音声文字起こしにだけ使う。

## v0.5 通常入力を開く判断

- ホーム画面と `/api/entries` の投稿は合い言葉なしで開く。
- URLを知っている人は投稿できるため、公開URLは家族内βの範囲で扱う。
- `/review`、`/weekly`、`/developer`、`/settings` と閲覧・管理系 API は `ADMIN_PASSCODE` の HttpOnly Cookie で保護する。
- `FAMILY_PASSCODE` は廃止し、通常入力画面から合い言葉のハードルを外す。
- `/api/entries` は空文字を拒否し、最大 2000 文字に制限し、簡易 rate limit を入れる。
- iOSショートカット向け `/api/quick-capture` は URL 直叩きなので `QUICK_CAPTURE_TOKEN` を維持する。

## v0.4 公開前安全化の判断

- cloud mode ではブラウザから Supabase に直接 insert/select/delete しない。
- ブラウザ側は `ApiRepository` だけを使い、Next.js Route Handler が server-side repository 経由で Supabase に保存する。
- `SUPABASE_SERVICE_ROLE_KEY` はサーバー専用で、`NEXT_PUBLIC_` を付けない。
- passcode は HttpOnly Cookie に保存し、Cookie 値は合い言葉から作る署名値にする。
- v0.4 では Supabase Auth / 本格 RLS はまだ入れないが、RLS は有効化し、anon/public から直接触らない方針にする。
- iOSショートカット用の `/api/quick-capture` は `QUICK_CAPTURE_TOKEN` を必須にし、画像や添付は扱わず `Entry.text` の保存を優先する。

## v0.3 Supabase 対応の判断

- v0.3 では public Supabase env を使う案だったが、v0.4 で廃止した。cloud mode は `ApiRepository` 経由にする。
- 表側 UI には保存先、共有、クラウド、ログインの言葉を出さない。使う人には今まで通り「残す」だけに見せる。
- 家族用パスコードは複雑な認証ではなく、家族の箱を開くための合い言葉として扱う。
- 管理画面は `ADMIN_PASSCODE` の合い言葉を要求する。ただし v0.3 は本格認証や Supabase RLS ではないため、公開運用では Supabase 側の権限設計を次段階で強化する。
- Supabase Storage への画像 Blob 保存は v0.3 では未実装。本文共有を優先し、添付は失敗しても `Entry.text` を残す方針を維持する。

## 今回の技術判断

- フレームワークは Next.js App Router を採用
- 型安全性と将来拡張のため TypeScript を採用
- スタイルは Tailwind CSS を採用
- 保存先は IndexedDB を採用
- 分析ロジックは `Analyzer` interface の背後に置く
- 保存処理は `Repository` interface の背後に置く

## IndexedDB を使う理由

- localStorage では画像保存に向かない
- エントリ、画像、分析タグ、週次まとめ、開発メモを分けて保存しやすい
- 将来 Supabase に置き換えるときも、Repository 抽象を保てる

## 原文 Entry を最優先にする理由

- ひとこと箱で最も失ってはいけないデータは `Entry.text` である
- v0.2 では、テキストがある場合は Entry を先に保存し、その後で画像を保存する
- 画像保存に失敗しても、保存済み Entry は消さない
- 壊れた添付情報は残さず、成功した画像だけ `mediaIds` に紐づける
- 画像がすべて失敗した場合、UI では「ひとことは残しました。写真だけ保存できませんでした。」と短く知らせる

## v0 で OpenAI API を使わない理由

- MVP 段階では、まず日常の入力体験を壊さずに成立させることが先
- API 依存を入れずに、ローカルだけで試せる状態を優先した
- ルールベースでも「あとで見る」「週のまとめ」「開発者向け翻訳」の流れは検証できる

## UI を静かにする理由

- 一番大事なのは、家族が気軽に残せること
- 分析結果やスコアを前面に出すと、入力時の心理的負荷が上がる
- 価値の可視化は review / weekly / developer に段階的に逃がすほうが思想に合う
- `quietMode` は設定で切り替えるものではなく、v0.1 では常に true のプロダクト前提として扱う
- v0.1 ではメンバー切替や共有っぽい概念を表側から外し、誰が書いたかを表示しない

## 将来 Supabase / OpenAI API に移行する方針

- `IndexedDbRepository` に対して `ApiRepository` と server-side repository を追加する
- `RuleBasedAnalyzer` に対して `OpenAiAnalyzer` を追加する
- UI は interface に依存し、保存先や分析器を差し替えやすくする

## 実装時の仮定

- 週の開始は月曜日扱いにした
- `quietMode` は内部フィールドとして残すが、ユーザー向けの切替 UI は持たない
- サンプルデータ投入は既存データを消してから入れる
- 家族メンバー追加 UI は v0 では未実装で、ホームや設定にはメンバー管理を出さない
- 画像エクスポートは Base64 を採用した
