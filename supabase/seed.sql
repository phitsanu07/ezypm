-- GridWork seed data
-- Mirrors the shape from project-management/project/src/data.js
--
-- IMPORTANT: Run this seed AFTER creating the following sample users in
-- Supabase Dashboard → Authentication → Users with the listed emails + passwords:
--
--   email: anan@gridwork.dev      password: Seed1234!
--   email: ploy@gridwork.dev      password: Seed1234!
--   email: kong@gridwork.dev      password: Seed1234!
--   email: mint@gridwork.dev      password: Seed1234!
--   email: fern@gridwork.dev      password: Seed1234!
--   email: boss@gridwork.dev      password: Seed1234!
--
-- Then paste the UUIDs Supabase assigned to each user into the variables below
-- before running this script.
--
-- Apply via: Supabase Dashboard → SQL Editor → paste & run
-- Order: 1) migrations/0001__init_schema.sql  2) this file

BEGIN;

-- ─── Fixed UUIDs ─────────────────────────────────────────────────────────────
-- Replace these placeholder values with the actual UUIDs from auth.users
-- after you create the users in the Dashboard.

DO $$
DECLARE
  -- User UUIDs (paste from Dashboard → Authentication → Users)
  uid_anan  uuid := '87fcb6b3-e571-43a2-adf0-03873baf51b6';
  uid_ploy  uuid := '156420cb-d7b3-4f50-a2c3-e9ce1fd0c7ed';
  uid_kong  uuid := '373d7052-d7d4-45ab-a9cb-6533b65386fa';
  uid_mint  uuid := '26dc2705-d09a-4928-968f-e4f4cb55757d';
  uid_fern  uuid := 'abb3f670-4b12-43de-b918-f03d5fa4ce8e';
  uid_boss  uuid := '6b6eb202-9de1-4051-a411-d64f18910c42';

  -- Board UUIDs
  bid_main  uuid := '00000002-0000-0000-0000-000000000001';

  -- Project UUIDs
  pid_retail   uuid := '00000003-0000-0000-0000-000000000001';
  pid_internal uuid := '00000003-0000-0000-0000-000000000002';
  pid_infra    uuid := '00000003-0000-0000-0000-000000000003';

  -- Sub-project UUIDs
  spid_checkout uuid := '00000004-0000-0000-0000-000000000001';
  spid_pos      uuid := '00000004-0000-0000-0000-000000000002';
  spid_inv      uuid := '00000004-0000-0000-0000-000000000003';
  spid_mobile   uuid := '00000004-0000-0000-0000-000000000004';
  spid_hr       uuid := '00000004-0000-0000-0000-000000000005';
  spid_finance  uuid := '00000004-0000-0000-0000-000000000006';
  spid_pg       uuid := '00000004-0000-0000-0000-000000000007';
  spid_k8s      uuid := '00000004-0000-0000-0000-000000000008';
  spid_sec      uuid := '00000004-0000-0000-0000-000000000009';

  -- Activity UUIDs
  acid_1 uuid := '00000005-0000-0000-0000-000000000001';
  acid_2 uuid := '00000005-0000-0000-0000-000000000002';
  acid_3 uuid := '00000005-0000-0000-0000-000000000003';
  acid_4 uuid := '00000005-0000-0000-0000-000000000004';
  acid_5 uuid := '00000005-0000-0000-0000-000000000005';

BEGIN

  -- ── Profiles ──────────────────────────────────────────────────────────────
  INSERT INTO profiles (id, email, name, name_th, role, status, color, initials)
  VALUES
    (uid_anan, 'anan@gridwork.dev',  'Anan Saetang',   'อนันต์ แซ่ตั้ง', 'admin',  'active', '#7C5CFF', 'AS'),
    (uid_ploy, 'ploy@gridwork.dev',  'Ploy Wattana',   'พลอย วัฒนา',      'editor', 'active', '#FF6B6B', 'PW'),
    (uid_kong, 'kong@gridwork.dev',  'Kong Phromma',   'ก้อง พรหมมา',     'editor', 'active', '#3DBE8B', 'KP'),
    (uid_mint, 'mint@gridwork.dev',  'Mint Chai',      'มินท์ ใจดี',      'editor', 'active', '#FFA94D', 'MC'),
    (uid_fern, 'fern@gridwork.dev',  'Fern Suksai',    'เฟิร์น สุขใส',    'editor', 'active', '#3A86FF', 'FS'),
    (uid_boss, 'boss@gridwork.dev',  'Boss Niran',     'บอส นิรันดร์',    'editor', 'active', '#E76F51', 'BN')
  ON CONFLICT DO NOTHING;

  -- ── Board ─────────────────────────────────────────────────────────────────
  INSERT INTO boards (id, name, name_th, icon, color, owner_id)
  VALUES
    (bid_main, 'GridWork Portfolio', 'พอร์ตโฟลิโอ', '▦', '#7C5CFF', uid_anan)
  ON CONFLICT DO NOTHING;

  -- ── Board members (all six users) ─────────────────────────────────────────
  INSERT INTO board_members (board_id, user_id)
  VALUES
    (bid_main, uid_anan),
    (bid_main, uid_ploy),
    (bid_main, uid_kong),
    (bid_main, uid_mint),
    (bid_main, uid_fern),
    (bid_main, uid_boss)
  ON CONFLICT DO NOTHING;

  -- ── Projects ──────────────────────────────────────────────────────────────
  INSERT INTO projects (id, board_id, name, name_th, icon, color, type, position)
  VALUES
    (pid_retail,   bid_main, 'Retail Platform',      'แพลตฟอร์มค้าปลีก', '▦', '#7C5CFF', 'year_plan', 100),
    (pid_internal, bid_main, 'Internal Tools',       'เครื่องมือภายใน',   '⌘', '#3DBE8B', 'year_plan', 200),
    (pid_infra,    bid_main, 'Infrastructure & SRE', 'Infra & SRE',       '◈', '#FF7849', 'ad_hoc',    300)
  ON CONFLICT DO NOTHING;

  -- ── Sub-projects: Retail Platform ─────────────────────────────────────────
  INSERT INTO sub_projects (id, project_id, name, name_th, icon, lead_id, status, priority, due, progress, progress_prev, progress_updated_at, quarter, tags, position)
  VALUES
    (spid_checkout, pid_retail, 'Web Checkout v2',     'เช็คเอาท์เว็บ v2', '◐', uid_kong, 'dev',  'p1', '2026-06-20', 55, 40, '2026-05-07T00:00:00.000Z', 'Q2-26', ARRAY['frontend','payment'], 100),
    (spid_pos,      pid_retail, 'POS Sync',            'ระบบหน้าร้าน POS',  '◑', uid_kong, 'dev',  'p1', '2026-05-30', 70, 60, '2026-05-09T00:00:00.000Z', 'Q2-26', ARRAY['backend','api'],     200),
    (spid_inv,      pid_retail, 'Inventory API',       'Inventory API',     '◒', uid_ploy, 'uat',  'p2', '2026-05-25', 85, 70, '2026-05-11T00:00:00.000Z', 'Q2-26', ARRAY['backend','api'],     300),
    (spid_mobile,   pid_retail, 'Customer Mobile App', 'แอปลูกค้า',          '◓', uid_fern, 'spec', 'p2', '2026-07-15', 35, 35, '2026-05-05T00:00:00.000Z', 'Q3-26', ARRAY['mobile','frontend'], 400)
  ON CONFLICT DO NOTHING;

  -- ── Sub-projects: Internal Tools ──────────────────────────────────────────
  INSERT INTO sub_projects (id, project_id, name, name_th, icon, lead_id, status, priority, due, progress, progress_prev, progress_updated_at, quarter, tags, position)
  VALUES
    (spid_hr,      pid_internal, 'HR Portal',         'พอร์ทัล HR',     '◐', uid_fern, 'dev',         'p2', '2026-06-30', 60, 45, '2026-05-10T00:00:00.000Z', 'Q2-26', ARRAY['hr','frontend'],      100),
    (spid_finance, pid_internal, 'Finance Dashboard', 'แดชบอร์ดการเงิน', '◑', uid_kong, 'requirement', 'p3', '2026-08-10', 15, 10, '2026-05-08T00:00:00.000Z', 'Q3-26', ARRAY['finance','frontend'],  200)
  ON CONFLICT DO NOTHING;

  -- ── Sub-projects: Infrastructure & SRE ───────────────────────────────────
  INSERT INTO sub_projects (id, project_id, name, name_th, icon, lead_id, status, priority, due, progress, progress_prev, progress_updated_at, quarter, tags, position)
  VALUES
    (spid_pg,  pid_infra, 'Postgres 16 upgrade', 'อัปเกรด Postgres 16',  '◐', uid_boss, 'uat',         'p1', '2026-05-22', 80, 70, '2026-05-12T00:00:00.000Z', 'Q2-26', ARRAY['infra','db'],       100),
    (spid_k8s, pid_infra, 'K8s migration',       'ย้ายไป Kubernetes',   '◑', uid_boss, 'uat',         'p1', '2026-07-05', 40, 50, '2026-05-06T00:00:00.000Z', 'Q3-26', ARRAY['infra','devops'],   200),
    (spid_sec, pid_infra, 'Security hardening',  'เพิ่มความปลอดภัยระบบ', '◒', uid_anan, 'requirement', 'p2', '2026-09-01', 10, 0,  '2026-05-02T00:00:00.000Z', 'Q3-26', ARRAY['security','infra'], 300)
  ON CONFLICT DO NOTHING;

  -- ── Sub-project members (team columns from data.js) ───────────────────────
  -- checkout: kong, fern, mint
  INSERT INTO sub_project_members (sub_project_id, user_id)
  VALUES
    (spid_checkout, uid_kong),
    (spid_checkout, uid_fern),
    (spid_checkout, uid_mint)
  ON CONFLICT DO NOTHING;

  -- pos: kong, ploy, boss
  INSERT INTO sub_project_members (sub_project_id, user_id)
  VALUES
    (spid_pos, uid_kong),
    (spid_pos, uid_ploy),
    (spid_pos, uid_boss)
  ON CONFLICT DO NOTHING;

  -- inv: ploy, kong, anan
  INSERT INTO sub_project_members (sub_project_id, user_id)
  VALUES
    (spid_inv, uid_ploy),
    (spid_inv, uid_kong),
    (spid_inv, uid_anan)
  ON CONFLICT DO NOTHING;

  -- mobile: fern, mint, anan
  INSERT INTO sub_project_members (sub_project_id, user_id)
  VALUES
    (spid_mobile, uid_fern),
    (spid_mobile, uid_mint),
    (spid_mobile, uid_anan)
  ON CONFLICT DO NOTHING;

  -- hr: fern, ploy, kong
  INSERT INTO sub_project_members (sub_project_id, user_id)
  VALUES
    (spid_hr, uid_fern),
    (spid_hr, uid_ploy),
    (spid_hr, uid_kong)
  ON CONFLICT DO NOTHING;

  -- finance: kong, fern
  INSERT INTO sub_project_members (sub_project_id, user_id)
  VALUES
    (spid_finance, uid_kong),
    (spid_finance, uid_fern)
  ON CONFLICT DO NOTHING;

  -- pg: boss, anan
  INSERT INTO sub_project_members (sub_project_id, user_id)
  VALUES
    (spid_pg, uid_boss),
    (spid_pg, uid_anan)
  ON CONFLICT DO NOTHING;

  -- k8s: boss, anan, ploy
  INSERT INTO sub_project_members (sub_project_id, user_id)
  VALUES
    (spid_k8s, uid_boss),
    (spid_k8s, uid_anan),
    (spid_k8s, uid_ploy)
  ON CONFLICT DO NOTHING;

  -- sec: anan, boss
  INSERT INTO sub_project_members (sub_project_id, user_id)
  VALUES
    (spid_sec, uid_anan),
    (spid_sec, uid_boss)
  ON CONFLICT DO NOTHING;

  -- ── Activities (sample — 5 across different types) ────────────────────────
  INSERT INTO activities (id, sub_project_id, author_id, type, title, body, occurs_at)
  VALUES
    (acid_1, spid_checkout, uid_kong,
     'milestone', 'Payment gateway integration complete',
     'Stripe webhook endpoint deployed and tested in staging.',
     '2026-05-10T10:00:00.000Z'),

    (acid_2, spid_checkout, uid_fern,
     'progress', 'Sprint 3 progress update',
     'Checkout flow redesigned per Figma handoff. 55% overall.',
     '2026-05-12T09:00:00.000Z'),

    (acid_3, spid_pos, uid_kong,
     'meeting', 'POS sync design review',
     'Aligned on offline-first sync strategy. Next: implement conflict resolution.',
     '2026-05-09T14:00:00.000Z'),

    (acid_4, spid_pg, uid_boss,
     'note', 'Upgrade runbook drafted',
     'Rolling upgrade plan documented in Notion. Dry-run on staging scheduled for May 20.',
     '2026-05-12T11:00:00.000Z'),

    (acid_5, spid_k8s, uid_boss,
     'block', 'Blocked: DNS TTL propagation delay',
     'External DNS update taking longer than expected. Blocking final cutover.',
     '2026-05-06T16:00:00.000Z')
  ON CONFLICT DO NOTHING;

END $$;

COMMIT;
