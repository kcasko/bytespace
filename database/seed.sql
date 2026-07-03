ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_onboarding_step VARCHAR(40);

UPDATE users
SET is_admin = COALESCE(is_admin, FALSE);

UPDATE users
SET onboarding_completed_at = COALESCE(onboarding_completed_at, created_at);


UPDATE users
SET username = 'lacutis',
    email = 'lacutis@example.local',
    updated_at = NOW()
WHERE username = CONCAT('pe', 'ggy')
  AND NOT EXISTS (
    SELECT 1
    FROM users existing
    WHERE existing.username = 'lacutis'
  );

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme_background_repeat VARCHAR(20) NOT NULL DEFAULT 'repeat',
  ADD COLUMN IF NOT EXISTS theme_background_size VARCHAR(20) NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS theme_background_position VARCHAR(20) NOT NULL DEFAULT 'center',
  ADD COLUMN IF NOT EXISTS status_message TEXT,
  ADD COLUMN IF NOT EXISTS layout_preset VARCHAR(40) NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS section_order JSONB,
  ADD COLUMN IF NOT EXISTS profile_song_title VARCHAR(120),
  ADD COLUMN IF NOT EXISTS profile_song_artist VARCHAR(120),
  ADD COLUMN IF NOT EXISTS profile_song_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS profile_visibility VARCHAR(20) NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS comment_permission VARCHAR(20) NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS bulletin_visibility VARCHAR(20) NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS friend_request_permission VARCHAR(30) NOT NULL DEFAULT 'everyone';

UPDATE profiles
SET theme_background_repeat = COALESCE(NULLIF(theme_background_repeat, ''), 'repeat'),
    theme_background_size = COALESCE(NULLIF(theme_background_size, ''), 'auto'),
    theme_background_position = COALESCE(NULLIF(theme_background_position, ''), 'center'),
    profile_visibility = COALESCE(NULLIF(profile_visibility, ''), 'public'),
    comment_permission = COALESCE(NULLIF(comment_permission, ''), 'everyone'),
    bulletin_visibility = COALESCE(NULLIF(bulletin_visibility, ''), 'public'),
    friend_request_permission = COALESCE(NULLIF(friend_request_permission, ''), 'everyone'),
    layout_preset = CASE
      WHEN layout_preset IN ('classic', 'compact', 'wide', 'sidebar_left', 'sidebar_right', 'spotlight') THEN layout_preset
      ELSE 'classic'
    END,
    section_order = COALESCE(section_order, '["about","interests","music","friends","bulletins","comments"]'::jsonb);

CREATE TABLE IF NOT EXISTS blocked_users (
  id SERIAL PRIMARY KEY,
  blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT blocked_users_no_self CHECK (blocker_id <> blocked_id),
  CONSTRAINT blocked_users_unique_pair UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS blocked_users_blocker_id_idx ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS blocked_users_blocked_id_idx ON blocked_users(blocked_id);



CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(160) NOT NULL,
  body TEXT,
  link_url TEXT,
  metadata_json JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_read_created_idx ON notifications(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_actor_user_id_idx ON notifications(actor_user_id);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id SERIAL PRIMARY KEY,
  admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  target_type VARCHAR(40) NOT NULL,
  target_id INTEGER,
  target_username VARCHAR(40),
  summary TEXT NOT NULL,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_user_id_idx ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_action_idx ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS admin_audit_logs_target_type_idx ON admin_audit_logs(target_type);

CREATE TABLE IF NOT EXISTS content_reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL,
  target_id INTEGER,
  target_username VARCHAR(40),
  reason VARCHAR(50) NOT NULL,
  details TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  admin_note TEXT,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_reports_target_type_check CHECK (target_type IN ('profile', 'comment', 'bulletin')),
  CONSTRAINT content_reports_status_check CHECK (status IN ('open', 'reviewed', 'dismissed', 'action_taken')),
  CONSTRAINT content_reports_target_required_check CHECK (
    (target_type = 'profile' AND target_username IS NOT NULL)
    OR (target_type IN ('comment', 'bulletin') AND target_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS content_reports_reporter_id_idx ON content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS content_reports_status_idx ON content_reports(status);
CREATE UNIQUE INDEX IF NOT EXISTS content_reports_open_unique_idx
  ON content_reports (reporter_id, target_type, COALESCE(target_id, -1), COALESCE(LOWER(target_username), ''))
  WHERE status = 'open';

INSERT INTO users (username, email, password_hash)
VALUES
  ('keith', 'keith@example.local', '$2b$12$Y1bOO2S8kZqujUNXLDeZmeT1LnZy.9cIXS2S/L6f5gYuURaUdZAMe'),
  ('tom', 'tom@example.local', 'not-a-real-hash-yet'),
  ('lacutis', 'lacutis@example.local', 'not-a-real-hash-yet'),
  ('bytegeist', 'bytegeist@example.local', 'not-a-real-hash-yet'),
  ('nullkid', 'nullkid@example.local', 'not-a-real-hash-yet'),
  ('glittergoblin', 'glittergoblin@example.local', 'not-a-real-hash-yet'),
  ('linuxgoblin', 'linuxgoblin@example.local', 'not-a-real-hash-yet'),
  ('crashoverride', 'crashoverride@example.local', 'not-a-real-hash-yet'),
  ('dialupdemon', 'dialupdemon@example.local', 'not-a-real-hash-yet')
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

INSERT INTO profiles (
  user_id,
  display_name,
  headline,
  mood,
  status_message,
  about_me,
  who_id_like_to_meet,
  general_interests,
  music,
  movies,
  games,
  profile_image_url,
  background_image_url,
  theme_background_color,
  theme_text_color,
  theme_box_color,
  theme_border_color,
  theme_header_color,
  theme_font_family,
  theme_background_repeat,
  theme_background_size,
  theme_background_position,
  profile_song_title,
  profile_song_artist,
  profile_song_url
)
SELECT
  users.id,
  'Keith',
  'Building my way out of bakery hell one bug at a time.',
  'tired but dangerous',
  'Currently haunting the retro web.',
  'I like Linux, cybersecurity, PS5, 90s music, horror movies, and making the internet weird again.',
  'People who remember Winamp, weird profile pages, and when the internet had actual personality.',
  'Cybersecurity, Linux, tech, homelabs, video games, movies, retro internet nonsense',
  '2Pac, Biggie, Aaliyah, Nirvana, Soundgarden, Alice in Chains, 90s R&B, 90s alternative rock',
  'Horror, sci-fi, dumb action movies, VHS-era chaos',
  'PS5, RPGs, shooters, survival horror',
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=500&q=80',
  NULL,
  '#1a0f6d',
  '#111111',
  '#f5fbff',
  '#003d9c',
  '#004fbf',
  'Arial, Helvetica, sans-serif',
  'repeat',
  'auto',
  'center',
  'Would?',
  'Alice in Chains',
  'https://example.com/profile-song-placeholder'
FROM users
WHERE users.username = 'keith'
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  headline = EXCLUDED.headline,
  mood = EXCLUDED.mood,
  status_message = EXCLUDED.status_message,
  about_me = EXCLUDED.about_me,
  who_id_like_to_meet = EXCLUDED.who_id_like_to_meet,
  general_interests = EXCLUDED.general_interests,
  music = EXCLUDED.music,
  movies = EXCLUDED.movies,
  games = EXCLUDED.games,
  profile_image_url = EXCLUDED.profile_image_url,
  background_image_url = EXCLUDED.background_image_url,
  theme_background_color = EXCLUDED.theme_background_color,
  theme_text_color = EXCLUDED.theme_text_color,
  theme_box_color = EXCLUDED.theme_box_color,
  theme_border_color = EXCLUDED.theme_border_color,
  theme_header_color = EXCLUDED.theme_header_color,
  theme_font_family = EXCLUDED.theme_font_family,
  theme_background_repeat = EXCLUDED.theme_background_repeat,
  theme_background_size = EXCLUDED.theme_background_size,
  theme_background_position = EXCLUDED.theme_background_position,
  profile_song_title = EXCLUDED.profile_song_title,
  profile_song_artist = EXCLUDED.profile_song_artist,
  profile_song_url = EXCLUDED.profile_song_url,
  updated_at = NOW();

INSERT INTO profiles (user_id, display_name)
SELECT users.id, friend_profiles.display_name
FROM users
JOIN (
  VALUES
    ('tom', 'Tom'),
    ('lacutis', 'Lacutis'),
    ('bytegeist', 'ByteGeist'),
    ('nullkid', 'NullKid'),
    ('glittergoblin', 'GlitterGoblin'),
    ('linuxgoblin', 'LinuxGoblin'),
    ('crashoverride', 'CrashOverride'),
    ('dialupdemon', 'DialUpDemon')
) AS friend_profiles(username, display_name) ON friend_profiles.username = users.username
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

INSERT INTO friendships (requester_id, receiver_id, status)
SELECT keith.id, friend.id, 'accepted'
FROM users keith
CROSS JOIN users friend
WHERE keith.username = 'keith'
  AND friend.username IN (
    'tom',
    'lacutis',
    'bytegeist',
    'nullkid',
    'glittergoblin',
    'linuxgoblin',
    'crashoverride',
    'dialupdemon'
  )
ON CONFLICT (requester_id, receiver_id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = NOW();

DELETE FROM top_friends
USING users
WHERE top_friends.user_id = users.id
  AND users.username = 'keith';

INSERT INTO top_friends (user_id, friend_id, position)
SELECT keith.id, friend.id, friend_order.position
FROM users keith
JOIN (
  VALUES
    ('tom', 1),
    ('lacutis', 2),
    ('bytegeist', 3),
    ('nullkid', 4),
    ('glittergoblin', 5),
    ('linuxgoblin', 6),
    ('crashoverride', 7),
    ('dialupdemon', 8)
) AS friend_order(username, position) ON TRUE
JOIN users friend ON friend.username = friend_order.username
WHERE keith.username = 'keith'
ON CONFLICT (user_id, position) DO UPDATE SET
  friend_id = EXCLUDED.friend_id;

INSERT INTO profile_comments (profile_user_id, author_user_id, body, created_at)
SELECT keith.id, author.id, comment_data.body, comment_data.created_at::timestamptz
FROM users keith
JOIN (
  VALUES
    ('tom', 'Thanks for the add.', '2006-06-28 20:00:00-04'),
    ('lacutis', 'Your profile background is a crime.', '2006-06-29 20:00:00-04'),
    ('glittergoblin', 'This page gave my browser anxiety.', '2006-06-29 21:00:00-04'),
    ('crashoverride', '10/10 would sign your guestbook again.', '2006-06-30 20:00:00-04')
) AS comment_data(username, body, created_at) ON TRUE
JOIN users author ON author.username = comment_data.username
WHERE keith.username = 'keith'
  AND NOT EXISTS (
    SELECT 1
    FROM profile_comments existing
    WHERE existing.profile_user_id = keith.id
      AND existing.author_user_id = author.id
      AND existing.body = comment_data.body
  );

INSERT INTO bulletins (user_id, title, body, created_at, updated_at)
SELECT users.id, bulletin_data.title, bulletin_data.body, bulletin_data.created_at::timestamptz, bulletin_data.created_at::timestamptz
FROM users
JOIN (
  VALUES
    ('ByteSpace is alive', 'If this page loads, the retro internet has escaped containment.', '2006-07-01 20:00:00-04'),
    ('Top 8 politics', 'Friendship rankings are back. Choose wisely.', '2006-07-01 19:30:00-04'),
    ('new playlist just dropped', 'Bring headphones and an unreasonable opinion.', '2006-06-30 19:00:00-04'),
    ('does anyone still use forums?', 'Serious question. I miss signatures and bad avatars.', '2006-06-29 19:00:00-04'),
    ('rate my terminal colors', 'The contrast is terrible and that is part of the art.', '2006-06-27 19:00:00-04')
) AS bulletin_data(title, body, created_at) ON TRUE
WHERE users.username = 'keith'
  AND NOT EXISTS (
    SELECT 1
    FROM bulletins existing
    WHERE existing.user_id = users.id
      AND existing.title = bulletin_data.title
  );

INSERT INTO bulletins (user_id, title, body, created_at, updated_at)
SELECT users.id, friend_bulletin_data.title, friend_bulletin_data.body, friend_bulletin_data.created_at::timestamptz, friend_bulletin_data.created_at::timestamptz
FROM users
JOIN (
  VALUES
    ('tom', 'Thanks for the add economy', 'I remain everyone''s first friend. This is infrastructure.', '2006-07-01 18:00:00-04'),
    ('lacutis', 'Profile review office hours', 'Post your worst layout and I will judge it with unreasonable confidence.', '2006-07-01 17:30:00-04'),
    ('bytegeist', 'ghost in the guestbook', 'If you see this bulletin twice, blame caching.', '2006-07-01 17:00:00-04')
) AS friend_bulletin_data(username, title, body, created_at) ON friend_bulletin_data.username = users.username
WHERE NOT EXISTS (
  SELECT 1
  FROM bulletins existing
  WHERE existing.user_id = users.id
    AND existing.title = friend_bulletin_data.title
);
