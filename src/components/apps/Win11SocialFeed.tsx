import React, { useEffect, useMemo, useState } from 'react';
import { Heart, MessageCircle, Reply, Send, Trash2 } from 'lucide-react';

import { FRIENDSHIP_SELECT, buildAvatarUrl, dedupeContacts, getPresenceLabel, resolveRenderableUrl, toSocialContact } from '@/lib/novaos';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import type {
  FriendshipRow,
  SocialCommentRow,
  SocialContact,
  SocialPostRow,
  StorageFileRow,
} from '@/types/novaos';

interface CommentDrafts {
  [key: string]: string;
}

export const Win11SocialFeed: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [posts, setPosts] = useState<SocialPostRow[]>([]);
  const [likes, setLikes] = useState<Record<string, string[]>>({});
  const [comments, setComments] = useState<Record<string, SocialCommentRow[]>>({});
  const [photos, setPhotos] = useState<StorageFileRow[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const [postDraft, setPostDraft] = useState('');
  const [commentDrafts, setCommentDrafts] = useState<CommentDrafts>({});
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      return;
    }

    loadSocial();

    const channel = supabase
      .channel(`social-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, () => loadSocial())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => loadSocial())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, () => loadSocial())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const visiblePosts = useMemo(
    () => posts.filter((post) => post.user_id === user?.id || friendIds.includes(post.user_id)),
    [friendIds, posts, user?.id]
  );

  const loadSocial = async () => {
    if (!user) {
      return;
    }

    const [friendsRes, postsRes, likesRes, commentsRes, photosRes] = await Promise.all([
      supabase
        .from('friends')
        .select(FRIENDSHIP_SELECT)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted'),
      supabase
        .from('social_posts')
        .select('id, user_id, content, image_url, created_at, author:profiles!user_id(id, username, avatar_url, bio, status_text, last_active_at)')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('post_likes').select('post_id, user_id'),
      supabase
        .from('post_comments')
        .select('id, post_id, user_id, parent_comment_id, content, created_at, author:profiles!user_id(id, username, avatar_url)')
        .order('created_at', { ascending: true }),
      supabase
        .from('storage_files')
        .select('*')
        .eq('user_id', user.id)
        .eq('file_type', 'photo')
        .order('created_at', { ascending: false }),
    ]);

    if (friendsRes.error || postsRes.error || likesRes.error || commentsRes.error || photosRes.error) {
      setError(
        friendsRes.error?.message ||
          postsRes.error?.message ||
          likesRes.error?.message ||
          commentsRes.error?.message ||
          photosRes.error?.message ||
          'Failed to load social feed.'
      );
      return;
    }

    const contacts = dedupeContacts(
      ((friendsRes.data || []) as FriendshipRow[])
        .map((row) => toSocialContact(row, user.id))
        .filter(Boolean) as SocialContact[]
    );

    setFriendIds(contacts.map((contact) => contact.id));

    const hydratedPosts = await Promise.all(
      ((postsRes.data || []) as SocialPostRow[]).map(async (post) => ({
        ...post,
        image_url: await resolveRenderableUrl(post.image_url),
        author: post.author
          ? {
              ...post.author,
              avatar_url: await resolveRenderableUrl(post.author.avatar_url),
            }
          : post.author,
      }))
    );

    const hydratedPhotos = await Promise.all(
      ((photosRes.data || []) as StorageFileRow[]).map(async (photo) => ({
        ...photo,
        preview_url: await resolveRenderableUrl(photo.file_url),
      }))
    );

    setPosts(hydratedPosts);
    setPhotos(hydratedPhotos);

    const nextLikes: Record<string, string[]> = {};
    for (const like of likesRes.data || []) {
      if (!nextLikes[like.post_id]) {
        nextLikes[like.post_id] = [];
      }
      nextLikes[like.post_id].push(like.user_id);
    }
    setLikes(nextLikes);

    const nextComments: Record<string, SocialCommentRow[]> = {};
    for (const comment of (commentsRes.data || []) as SocialCommentRow[]) {
      if (!nextComments[comment.post_id]) {
        nextComments[comment.post_id] = [];
      }
      nextComments[comment.post_id].push(comment);
    }
    setComments(nextComments);
  };

  const submitPost = async () => {
    if (!user || (!postDraft.trim() && !selectedPhoto)) {
      return;
    }

    const { error: requestError } = await supabase.from('social_posts').insert([
      {
        user_id: user.id,
        content: postDraft.trim(),
        image_url: selectedPhoto || null,
      },
    ]);

    if (requestError) {
      setError(requestError.message);
      return;
    }

    setPostDraft('');
    setSelectedPhoto('');
    loadSocial();
  };

  const toggleLike = async (postId: string) => {
    if (!user) {
      return;
    }

    const alreadyLiked = likes[postId]?.includes(user.id);
    if (alreadyLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('post_likes').insert([{ post_id: postId, user_id: user.id }]);
    }

    loadSocial();
  };

  const submitComment = async (postId: string, parentCommentId?: string | null) => {
    if (!user) {
      return;
    }

    const key = parentCommentId || postId;
    const content = commentDrafts[key]?.trim();
    if (!content) {
      return;
    }

    const { error: requestError } = await supabase.from('post_comments').insert([
      {
        post_id: postId,
        user_id: user.id,
        parent_comment_id: parentCommentId || null,
        content,
      },
    ]);

    if (requestError) {
      setError(requestError.message);
      return;
    }

    setCommentDrafts((current) => ({ ...current, [key]: '' }));
    loadSocial();
  };

  const deletePost = async (postId: string) => {
    const { error: requestError } = await supabase.from('social_posts').delete().eq('id', postId);

    if (requestError) {
      setError(requestError.message);
      return;
    }

    loadSocial();
  };

  if (!isSupabaseConfigured) {
    return <div className="flex h-full items-center justify-center bg-white text-gray-500">Nova Feed requires Supabase</div>;
  }

  return (
    <>
      <div className="flex h-full flex-col bg-[#f5f7fb]">
      <div className="border-b border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-800">Nova Feed</h2>
        <p className="text-[11px] text-gray-400">Post to your friends timeline, like, comment, and reply.</p>
      </div>

      {error && <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">{error}</div>}

      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <textarea
              value={postDraft}
              onChange={(event) => setPostDraft(event.target.value)}
              placeholder="Share something with your Nova friends..."
              className="min-h-24 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none focus:border-blue-400"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={selectedPhoto}
                onChange={(event) => setSelectedPhoto(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700"
              >
                <option value="">No photo</option>
                {photos.map((photo) => (
                    <option key={photo.id} value={photo.preview_url || photo.file_url}>
                    {photo.filename}
                  </option>
                ))}
              </select>
              <button onClick={submitPost} className="rounded-xl bg-blue-500 px-4 py-2 text-xs font-medium text-white hover:bg-blue-600">
                Post
              </button>
            </div>
          </div>

          {visiblePosts.map((post) => {
            const postComments = comments[post.id] || [];
            const rootComments = postComments.filter((comment) => !comment.parent_comment_id);
            const myLike = likes[post.id]?.includes(user?.id || '');

            return (
              <div key={post.id} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <button onClick={() => post.author?.avatar_url && setPreviewImage(post.author.avatar_url)} className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-blue-500 text-sm font-bold text-white">
                    {post.author?.avatar_url ? (
                      <img
                        src={post.author.avatar_url}
                        alt={post.author.username}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = buildAvatarUrl(post.author?.username || 'User');
                        }}
                      />
                    ) : (
                      post.author?.username?.charAt(0).toUpperCase() || '?'
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-800">{post.author?.username || 'Unknown'}</div>
                    <div className="text-[11px] text-gray-400">
                      {post.author?.status_text || getPresenceLabel(post.author?.last_active_at)} · {new Date(post.created_at).toLocaleString()}
                    </div>
                  </div>
                  {post.user_id === user?.id && (
                    <button
                      onClick={() => deletePost(post.id)}
                      className="rounded-full bg-red-50 p-2 text-red-500 hover:bg-red-100"
                      title="Delete post"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {post.content && <p className="mt-3 text-sm text-gray-700">{post.content}</p>}
                {post.image_url && (
                  <div className="mt-3 flex max-h-96 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                    <img src={post.image_url} alt="Post" className="max-h-96 w-full cursor-zoom-in object-contain" onClick={() => setPreviewImage(post.image_url || null)} />
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2 text-xs">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1 rounded-full px-3 py-2 ${
                      myLike ? 'bg-pink-50 text-pink-600' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Heart size={14} />
                    {likes[post.id]?.length || 0}
                  </button>
                  <div className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-2 text-gray-600">
                    <MessageCircle size={14} />
                    {postComments.length}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {rootComments.map((comment) => {
                    const replies = postComments.filter((entry) => entry.parent_comment_id === comment.id);
                    return (
                      <div key={comment.id} className="rounded-2xl bg-gray-50 p-3">
                        <div className="text-xs font-semibold text-gray-700">{comment.author?.username || 'User'}</div>
                        <div className="mt-1 text-sm text-gray-700">{comment.content}</div>

                        <div className="mt-2 space-y-2 pl-4">
                          {replies.map((reply) => (
                            <div key={reply.id} className="rounded-xl bg-white p-2">
                              <div className="text-[11px] font-semibold text-gray-700">{reply.author?.username || 'User'}</div>
                              <div className="text-xs text-gray-600">{reply.content}</div>
                            </div>
                          ))}

                          <div className="flex gap-2">
                            <input
                              value={commentDrafts[comment.id] || ''}
                              onChange={(event) =>
                                setCommentDrafts((current) => ({ ...current, [comment.id]: event.target.value }))
                              }
                              placeholder="Reply..."
                              className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none"
                            />
                            <button
                              onClick={() => submitComment(post.id, comment.id)}
                              className="rounded-xl bg-gray-900 px-3 py-2 text-xs font-medium text-white"
                            >
                              <Reply size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex gap-2">
                    <input
                      value={commentDrafts[post.id] || ''}
                      onChange={(event) =>
                        setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))
                      }
                      placeholder="Write a comment..."
                      className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none"
                    />
                    <button onClick={() => submitComment(post.id)} className="rounded-2xl bg-blue-500 px-4 py-2 text-white">
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
      {previewImage && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-6" onClick={() => setPreviewImage(null)}>
          <div className="max-h-full max-w-3xl overflow-hidden rounded-3xl bg-white p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <img src={previewImage} alt="Preview" className="max-h-[80vh] w-full rounded-2xl object-contain" />
          </div>
        </div>
      )}
    </>
  );
};
