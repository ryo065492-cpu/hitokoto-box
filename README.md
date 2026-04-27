# ひとこと箱

## release.ps1 の実行方法

PowerShell の ExecutionPolicy で止まる場合は、次のように Bypass を付けて実行できます。

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\release.ps1 "v0.10 弾薬庫追加"
```

通常は次でも動きます。

```powershell
.\scripts\release.ps1 "v0.10 弾薬庫追加"
```

`release.ps1` の表示文は PowerShell 5.1 でも壊れにくいように英語中心にしています。commit message には日本語を渡して構いません。

## v0.10 弾薬庫 / 運用司令室

`/arsenal` は管理者向けの「弾薬庫」です。直近50件のひとことから、次に使えそうな改善の弾を最大5件に絞って表示します。ホーム画面は家族が入れるだけのままで、弾薬庫への大きな導線は出しません。

弾薬庫では、アプリ改善、生活改善、家事・買い物、書類・予定、家族運用、調査したいこと、Codex改修候補、ChatGPT相談候補を見ます。各カードから、ChatGPTに相談する文面、Codexに投げる指示、家族に確認する一言をコピーできます。毎回一から説明せず、集まったひとことを改善に使うための管理画面です。

弾カードの状態は、v0.10では端末ごとの `localStorage` に軽く保存します。将来はSupabase側に移して、複数端末で状態も揃えられるようにします。

更新作業をまとめるために `scripts/release.ps1` も追加しています。

```powershell
.\scripts\release.ps1 "v0.10 弾薬庫追加"
```

このスクリプトは `.env.local` が git 管理対象に入っていないか確認し、`npm run lint`、`npm run build`、`npm run test`、`git status`、`git add .`、`git commit`、必要なら `git push` を順に実行します。途中で失敗した場合は停止します。

## v0.9 改善材料パック

`/developer` に、直近50件のひとことから「改善材料パック」を作る機能を追加しています。通常のホーム画面には何も出さず、管理用の奥の画面だけで使います。

- ChatGPT用まとめ: プロダクト思想、直近の原文、アプリ改善っぽい声、生活改善っぽい声、新しい話題、相談したいことをまとめます。
- Codex用改善指示: 実際の入力から見えた課題、守るべき思想、変更してよい画面、変更してはいけないこと、受け入れ条件、テスト項目をまとめます。
- 家族内βレビュー: 入力件数、最近の入力例、よく出たテーマ、使いにくさに関する声、生活改善につながりそうな声、次に試す候補トップ3をまとめます。

この機能は admin の合い言葉が必要です。家族に分類や整理を求めず、あとから裏側で相談・改善に使うための材料にします。

## v0.8 の入力と確認

v0.8 では無料運用を優先し、アプリ内の「声で入れる」ボタンは通常画面から外しました。声で残したい場合は、入力欄をタップして iPhone / iPad の標準キーボードのマイクを使ってください。

通常UIから OpenAI API の音声文字起こしは呼びません。`/api/transcribe` は将来検証用に残していますが、家族用の普段使いでは使わない前提です。

保存内容は Supabase の画面ではなく、アプリ内の `/entries` で確認できます。`/entries` は管理用の合い言葉が必要です。

iPhoneで英語キーボードが出る場合は、地球儀ボタンで日本語キーボードに切り替えてください。よく使う場合は、iPhone設定側で日本語キーボードを優先すると使いやすくなります。アプリ側では日本語入力しやすい属性を入力欄に設定しています。

iOSショートカットから声で残す場合は `docs/IOS_SHORTCUTS.md` を見てください。

## v0.4 の保存構成

- local mode: ブラウザ内の IndexedDB に保存します。
- cloud mode: ブラウザは Next.js API だけを呼び、Next.js API がサーバー側で Supabase に保存します。
- v0.4 からは、ブラウザから Supabase へ直接保存しません。
- `SUPABASE_SERVICE_ROLE_KEY` はサーバー専用です。絶対に `NEXT_PUBLIC_` を付けないでください。

cloud mode の Vercel 環境変数:

```bash
NEXT_PUBLIC_STORAGE_MODE=cloud
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSCODE=
QUICK_CAPTURE_TOKEN=
```

iPhone / iPad では Safari で公開URLを開き、共有ボタンから「ホーム画面に追加」を選びます。iOSショートカットから保存する手順は `docs/IOS_SHORTCUTS.md` を見てください。

v0.5 では通常入力画面に合い言葉はありません。URLを知っている人は投稿できます。閲覧、管理、削除は `ADMIN_PASSCODE` で保護します。家族内βなのでURLを広く公開しないでください。

`FAMILY_PASSCODE` は v0.5 で廃止しました。

家族内βで入れてよいもの: 日常の困りごと、買い物・家事のぼやき、UI違和感、機密でないメモ。

まだ避けるもの: 医療、お金、住所、子どもの詳細、職場機密、公的書類写真、他人が写る写真。

## 公開前の必須設定

Vercel などの公開環境では、必ず `ADMIN_PASSCODE` を設定してください。未設定の公開環境では、振り返りや管理画面は安全のため開かないようにしています。通常入力画面は合い言葉なしで開きます。

Supabase を使う場合は、`NEXT_PUBLIC_STORAGE_MODE=cloud`、`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY` も設定してください。未設定の場合は IndexedDB のローカル保存に戻ります。

Supabase 側では `docs/SUPABASE_SCHEMA.sql` を SQL Editor で実行してテーブルを作成してください。v0.5 は通常投稿を開き、閲覧と管理を admin 合い言葉で守る段階です。本格的な Supabase Auth / RLS は未導入です。公開範囲が家族以外に広がる前に、RLS と権限設計を追加してください。

ひとこと箱は、家族の日常の「ひとこと」「写真」「ぼやき」「違和感」を静かに受け止め、あとから改善の種として見返せるローカル MVP です。

## このアプリは何か

これはタスク管理アプリでも共有アプリでもありません。使う人がその場で整理しなくても、あとから AI 活用、生活改善、自動化、プロダクト改善につながる種を貯めておくための静かな受け皿です。

## 通常画面を静かにしている理由

- 入力する時点でカテゴリ分けや整理を求めないため
- スコア、分析、カードの洪水で疲れさせないため
- 「ちゃんと書かなきゃ」と感じずに使えるようにするため
- quiet は切替モードではなく、このアプリの前提だから

## どう使うか

- ホーム画面でひとことを入れる
- ひとことを書く、写真を添える、必要ならキーボードのマイクで入力する
- 保存したら閉じてよい
- 必要なときだけ「あとで見る」や「週のまとめ」を開く
- v0 では誰が書いたか、共有するか、分類するかを表側で選びません

## v0 でできること

- ひとことを保存
- 写真添付
- iPhone / iPad 標準キーボードの音声入力への誘導
- IndexedDB へのローカル保存
- Supabase 環境変数がある場合の共有保存
- 奥の画面用の合い言葉
- iPhone / iPad でホーム画面に追加しやすい PWA 設定
- 最近のひとこと表示
- 週のまとめの簡易表示
- app feedback 由来の開発者向けノート生成
- JSON エクスポート / インポート
- 全データ削除

## v0 でできないこと

- OpenAI API を使った高度な分析
- 共有機能
- メンバー管理
- 家族間のリアルタイム同期
- 認証
- Push 通知
- 録音ファイル自体の保存

## ローカル保存について

保存先はブラウザの IndexedDB です。localStorage は使っていません。別ブラウザや別端末には自動で同期されません。

Supabase の環境変数がある場合は、Entry.text を Supabase に保存します。環境変数がない場合は IndexedDB にフォールバックします。

v0 はメンバー管理がありません。表側は「入れるだけ」に寄せ、分析やまとめは後から見る画面に置いています。

## 画像保存の制限

- 画像はクライアント側で最大幅 1600px を目安に圧縮してから保存します
- v0 では画像解析は行いません
- JSON エクスポートでは画像 Blob も Base64 化して含めます
- テキストがある場合は、ひとことを先に保存してから画像を保存します
- 画像保存に失敗した場合、壊れた添付情報は残さず、ひとことだけを保存します
- cloud mode では v0.4 時点で画像 Blob の Storage 保存は未実装です
- Supabase モードでは添付メタデータだけを保存できる設計にしています

## OpenAI API の利用範囲

v0.8 の通常UIでは OpenAI API を使いません。`/api/transcribe` は将来検証用に残していますが、ホーム画面からは呼びません。週次まとめや分類の分析も引き続きルールベースです。

## 将来 OpenAI API を使う方針

- `Analyzer` interface を維持したまま `OpenAiAnalyzer` を追加する
- まずは週次まとめ品質の改善と構造化 JSON 生成から段階的に足す

## 将来 Supabase で家族同期する方針

- `Repository` interface を維持したまま `ApiRepository` と server-side repository を使う
- ドメイン型は IndexedDB 依存にしない
- 共有 / 非公開の扱いは `visibility` を拡張していく
- v0 の表側 UI には共有やメンバー管理を出さず、同期を入れる段階で改めて体験を設計する

## Vercel と Supabase で公開する

1. Supabase プロジェクトを作る
2. `docs/SUPABASE_SCHEMA.sql` を Supabase SQL Editor で実行する
3. Vercel にこのリポジトリを接続する
4. Vercel の Environment Variables に以下を設定する
5. デプロイ後、iPhone / iPad の Safari で開く
6. 共有ボタンから「ホーム画面に追加」を選ぶ

必要な環境変数:

```bash
NEXT_PUBLIC_STORAGE_MODE=cloud
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSCODE=
QUICK_CAPTURE_TOKEN=
```

- `NEXT_PUBLIC_STORAGE_MODE=cloud` でない場合は IndexedDB で動きます
- `SUPABASE_SERVICE_ROLE_KEY` はサーバー専用です。クライアントに出してはいけません
- `FAMILY_PASSCODE` は v0.5 で廃止しました
- `ADMIN_PASSCODE` がない場合、ローカル開発では管理画面がそのまま開きます。公開環境では開きません
- `OPENAI_API_KEY` は通常利用では不要です。`/api/transcribe` を検証する場合だけサーバー側に設定します
- 管理画面は `/review` の奥のデータ管理から辿れます

## 起動方法

```bash
npm install
npm run dev
```

`http://localhost:3000` を開いて使います。

## 開発コマンド

```bash
npm run dev
npm run lint
npm run build
npm run test
```

## テスト方法

分析ロジックの簡易テストを Vitest で入れています。

```bash
npm run test
```

## データのエクスポート / インポート方法

- `/review` の奥にある `データ管理` から `/settings` を開き、`JSON をエクスポート` を押す
- 復元したいときは `JSON をインポート` から保存済み JSON を選ぶ
- `全データ削除` はブラウザ内の保存内容を消す操作です

## スマホ実機で確認すること

- テキストだけ保存できる
- 写真付きで保存できる
- 写真保存に失敗してもテキストは残る
- ホーム画面にアプリ内の音声ボタンが出ない
- iPhone / iPad のキーボードのマイクで音声入力できる
- `/entries` で保存されたひとことを確認できる
- 保存後に余計な提案が出ない
- `/review` で今週のまとめが最大 3 件に収まる
- `/developer` で開発者向け情報が見られる
- JSON エクスポートできる
- 全削除できる

## 構成

- `app/`: 画面
- `components/`: UI 部品
- `domain/`: ドメイン型
- `lib/storage/`: Repository 抽象と IndexedDB 実装
- `lib/analyzer/`: Analyzer 抽象とルールベース分析
- `lib/media/`: 画像圧縮
- `lib/export/`: JSON 入出力
- `lib/dates/`: 週次表示補助
- `docs/`: 思想・判断・ロードマップ
- `tests/`: analyzer テスト
