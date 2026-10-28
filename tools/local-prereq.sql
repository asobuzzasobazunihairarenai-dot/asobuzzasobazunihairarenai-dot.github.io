-- ============================================================================
-- ローカルのSupabaseでオンライン自動テストを回すための「足りない分」だけを足すSQL。
-- 続き632（2026-10-28）。
--
-- 🔴 **これは自分のPCのSupabase専用**。本番では実行する必要が無い（本番の表には
--    下の列が既に全部在る）。ただし全部 `if not exists` なので、万一流しても壊れない。
--
-- 【なぜ要るか】`players` / `matches` / `match_feedback_replies` は**戦績管理システム側の
--   テーブル**で、デジタル版は読み書きだけする（CLAUDE.md 参照）。その定義は
--   `G:\マイドライブ\Cloud Code　作業フォルダ\supabase_setup.sql` に在るのだが、
--   🔴 **そのファイルが本番に追いついていない**——本番の players には `user_id` が在って
--   デジタル版が20か所以上で使っているのに、**設定SQLにはその列が1行も書かれていない**
--   （2026-10-28 に実測。ローカルで `column players.user_id does not exist` が出て判明）。
--   相手のファイルはこちらから直さない（別リポジトリ）ので、**ローカルで足す分をここに置く**。
--
-- ⚠ ここに書いた列は**アプリのコードから実際に使われているものだけ**（推測で足さない）。
--   出どころ: src/online.js / src/stats-profile.js の from("players") / from("matches")。
-- ============================================================================

-- players ------------------------------------------------------------------
-- user_id            … デジタル版のSupabaseアカウントとの紐づけ（これが無いと起動直後に落ちる）
-- title_key          … 称号（マイページで読み書き）
-- is_staff           … 身内かどうか（戦績の集計から外す用）
-- seed_matches_count … アナログ時代の戦績の持ち込み
-- seed_wins_count    … 同上
alter table players add column if not exists user_id uuid;
alter table players add column if not exists title_key text;
alter table players add column if not exists is_staff boolean not null default false;
alter table players add column if not exists seed_matches_count int not null default 0;
alter table players add column if not exists seed_wins_count int not null default 0;
create index if not exists players_user_id_idx on players (user_id);

-- matches ------------------------------------------------------------------
-- duration_minutes … 対局の長さ
-- source           … どこから登録されたか（デジタル版は "digital"）
-- feedback         … 感想欄
-- guest_names      … 勝者が未登録の人だった時に名前を出すため
alter table matches add column if not exists duration_minutes int;
alter table matches add column if not exists source text;
alter table matches add column if not exists feedback text;
alter table matches add column if not exists guest_names jsonb;

-- 確認用（読むだけ）:
--   select column_name from information_schema.columns
--    where table_name = 'players' order by ordinal_position;
