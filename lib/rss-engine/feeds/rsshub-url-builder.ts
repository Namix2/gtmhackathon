import { rssEngineConfig } from "../config";

export function buildRsshubUrl(route: string): string {
  const base = rssEngineConfig().rsshubBaseUrl;
  const normalized = route.replace(/^\//, "");
  return `${base}/${normalized}`;
}

export function buildSubstackRsshubUrl(publication: string): string {
  return buildRsshubUrl(`substack/${publication}`);
}

export function buildRedditSubredditRsshubUrl(subreddit: string): string {
  return buildRsshubUrl(`reddit/subreddit/${subreddit}`);
}

export function buildRedditSearchRsshubUrl(query: string): string {
  return buildRsshubUrl(`reddit/search/${encodeURIComponent(query)}`);
}

export function buildYoutubeChannelRsshubUrl(channelId: string): string {
  return buildRsshubUrl(`youtube/channel/${channelId}`);
}

export function buildYoutubeUserRsshubUrl(username: string): string {
  const handle = username.replace(/^@/, "");
  return buildRsshubUrl(`youtube/user/${handle}`);
}

export function buildYoutubePlaylistRsshubUrl(playlistId: string): string {
  return buildRsshubUrl(`youtube/playlist/${playlistId}`);
}

export function youtubeChannelFeedUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

export function substackNativeFeedUrl(publication: string): string {
  return `https://${publication}.substack.com/feed`;
}

export function redditSubredditFeedUrl(subreddit: string): string {
  return `https://www.reddit.com/r/${subreddit}/.rss`;
}

export function redditSearchFeedUrl(query: string): string {
  const q = encodeURIComponent(query);
  return `https://www.reddit.com/search.rss?q=${q}&sort=new`;
}
