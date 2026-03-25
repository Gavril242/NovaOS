export type FriendStatus = 'pending' | 'accepted' | 'blocked';
export type NotificationType = 'message' | 'friend_request' | 'system';

export interface ProfileLite {
  id: string;
  username: string;
  avatar_url?: string | null;
  email?: string | null;
  high_score?: number | null;
  bio?: string | null;
  status_text?: string | null;
  last_active_at?: string | null;
  theme?: 'light' | 'dark' | null;
}

export interface FriendshipRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendStatus;
  created_at: string;
  requester?: ProfileLite | null;
  recipient?: ProfileLite | null;
}

export interface SocialContact {
  id: string;
  relationId: string;
  status: FriendStatus;
  initiatedByMe: boolean;
  created_at: string;
  profile: ProfileLite;
}

export interface MessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  attachment_url?: string | null;
  attachment_type?: 'photo' | 'song' | null;
  status?: 'sent' | 'delivered' | 'read';
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  action_id?: string | null;
  created_at: string;
}

export interface StorageFileRow {
  id: string;
  user_id?: string;
  filename: string;
  file_type: 'txt' | 'photo' | 'song';
  file_url: string;
  size: number;
  created_at: string;
  preview_url?: string;
}

export interface RecycleBinRow {
  id: string;
  user_id: string;
  source_table: 'desktop_files' | 'storage_files';
  item_name: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface SocialPostRow {
  id: string;
  user_id: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  author?: ProfileLite | null;
}

export interface SocialCommentRow {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id?: string | null;
  content: string;
  created_at: string;
  author?: ProfileLite | null;
}
