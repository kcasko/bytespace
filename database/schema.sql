CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(40) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(80),
  headline VARCHAR(255),
  mood VARCHAR(120),
  about_me TEXT,
  who_id_like_to_meet TEXT,
  general_interests TEXT,
  music TEXT,
  movies TEXT,
  games TEXT,
  profile_image_url TEXT,
  background_image_url TEXT,
  theme_background_color VARCHAR(32),
  theme_text_color VARCHAR(32),
  theme_box_color VARCHAR(32),
  theme_border_color VARCHAR(32),
  theme_header_color VARCHAR(32),
  theme_font_family VARCHAR(120),
  theme_background_repeat VARCHAR(20) NOT NULL DEFAULT 'repeat',
  theme_background_size VARCHAR(20) NOT NULL DEFAULT 'auto',
  theme_background_position VARCHAR(20) NOT NULL DEFAULT 'center',
  profile_song_title VARCHAR(120),
  profile_song_artist VARCHAR(120),
  profile_song_url VARCHAR(500),
  profile_visibility VARCHAR(20) NOT NULL DEFAULT 'public',
  comment_permission VARCHAR(20) NOT NULL DEFAULT 'everyone',
  bulletin_visibility VARCHAR(20) NOT NULL DEFAULT 'public',
  friend_request_permission VARCHAR(30) NOT NULL DEFAULT 'everyone',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profiles_profile_visibility_check CHECK (profile_visibility IN ('public', 'friends', 'private')),
  CONSTRAINT profiles_comment_permission_check CHECK (comment_permission IN ('everyone', 'friends', 'none')),
  CONSTRAINT profiles_bulletin_visibility_check CHECK (bulletin_visibility IN ('public', 'friends', 'private')),
  CONSTRAINT profiles_friend_request_permission_check CHECK (friend_request_permission IN ('everyone', 'friends_of_friends', 'none'))
);

CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT friendships_no_self_friend CHECK (requester_id <> receiver_id),
  CONSTRAINT friendships_status_check CHECK (status IN ('pending', 'accepted', 'blocked')),
  CONSTRAINT friendships_unique_pair UNIQUE (requester_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS top_friends (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT top_friends_position_check CHECK (position BETWEEN 1 AND 8),
  CONSTRAINT top_friends_no_self CHECK (user_id <> friend_id),
  CONSTRAINT top_friends_unique_position UNIQUE (user_id, position),
  CONSTRAINT top_friends_unique_friend UNIQUE (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS blocked_users (
  id SERIAL PRIMARY KEY,
  blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT blocked_users_no_self CHECK (blocker_id <> blocked_id),
  CONSTRAINT blocked_users_unique_pair UNIQUE (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS profile_comments (
  id SERIAL PRIMARY KEY,
  profile_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bulletins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "session" (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);
CREATE INDEX IF NOT EXISTS friendships_requester_id_idx ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS friendships_receiver_id_idx ON friendships(receiver_id);
CREATE INDEX IF NOT EXISTS top_friends_user_id_idx ON top_friends(user_id);
CREATE INDEX IF NOT EXISTS blocked_users_blocker_id_idx ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS blocked_users_blocked_id_idx ON blocked_users(blocked_id);
CREATE INDEX IF NOT EXISTS profile_comments_profile_user_id_idx ON profile_comments(profile_user_id);
CREATE INDEX IF NOT EXISTS profile_comments_author_user_id_idx ON profile_comments(author_user_id);
CREATE INDEX IF NOT EXISTS bulletins_user_id_idx ON bulletins(user_id);
CREATE INDEX IF NOT EXISTS session_expire_idx ON "session"(expire);
