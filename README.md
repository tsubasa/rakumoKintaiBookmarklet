# rakumoKintaiBookmarklet

![CI](https://github.com/tsubasa/rakumoKintaiBookmarklet/workflows/CI/badge.svg)

## これはなに？

弊社で利用しているrakumoキンタイの機能を拡張するブックマークレットです。

#### 出来ること

- タイムカードに打刻された時間から勤怠状況を計算して表示する

## 使い方

### 動作確認環境

* Google Chrome v80+
* Firefox v72+
* Microsoft Edge v80+

### ブックマークレットを使えるようにする

#### Google Chrome ユーザーはこちら

1. [Releasesページ](https://github.com/tsubasa/rakumoKintaiBookmarklet/releases)を開き最新のブックマークレット本体のJSコードをコピーする
2. Google Chromeを起動し、ブックマークマネージャー( `chrome://bookmarks/` )を開く
3. 開いたページ内で右クリックし、「新しいブックマークを追加」をクリック
4. タイトルを入力「rakumoキンタイブックマークレット」など
5. URLに先程コピーしたJSコードを貼り付ける
6. `[保存]`をクリックして完了

#### Firefox ユーザーはこちら

1. [Releasesページ](https://github.com/tsubasa/rakumoKintaiBookmarklet/releases)を開き最新のブックマークレット本体のJSコードをコピーする
2. Firefoxを起動し、ブックマーク管理を開く
3. 開いたウィンドウ内で右クリックし、「新しいブックマーク」をクリック
4. タイトルを入力「rakumoキンタイブックマークレット」など
5. URLに先程コピーしたJSコードを貼り付ける
6. `[追加]`をクリックして完了

* [ブックマークレットをインストールする方法 | Firefox ヘルプ](https://support.mozilla.org/ja/kb/bookmarklets-perform-common-web-page-tasks)

### 実際に利用してみる

1. [rakumoキンタイ](https://a-rakumo.appspot.com/attendance/reports)のページを表示する
2. 先程登録したブックマークをクリックして実行する
3. サマリーテーブルの最後に集計結果が表示されたらOK
