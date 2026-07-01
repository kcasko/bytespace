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
  ADD COLUMN IF NOT EXISTS theme_background_position VARCHAR(20) NOT NULL DEFAULT 'center';

UPDATE profiles
SET theme_background_repeat = COALESCE(NULLIF(theme_background_repeat, ''), 'repeat'),
    theme_background_size = COALESCE(NULLIF(theme_background_size, ''), 'auto'),
    theme_background_position = COALESCE(NULLIF(theme_background_position, ''), 'center');

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
  theme_background_position
)
SELECT
  users.id,
  'Keith',
  'Building my way out of bakery hell one bug at a time.',
  'tired but dangerous',
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
  'center'
FROM users
WHERE users.username = 'keith'
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  headline = EXCLUDED.headline,
  mood = EXCLUDED.mood,
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
