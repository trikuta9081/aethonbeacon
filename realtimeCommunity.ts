import { createClient, RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

export type RealtimeCommunityRole = "user" | "verified" | "moderator";
export type RealtimeCommunityKind = "feed" | "chat";
export type RealtimeCommunityChatPersona = "moderator" | "mentor" | "support";

export type RealtimeCommunityFeedMessage = {
  id: string;
  createdAt: string;
  author: string;
  role: RealtimeCommunityRole;
  tag: string;
  text: string;
  topic: string;
  clientId?: string;
};

export type RealtimeCommunityChatMessage = {
  id: string;
  createdAt: string;
  author: string;
  role: RealtimeCommunityRole;
  text: string;
  persona: RealtimeCommunityChatPersona;
  clientId?: string;
};

type CommunityRow = {
  id: string;
  kind: RealtimeCommunityKind;
  created_at: string;
  author: string;
  role: RealtimeCommunityRole;
  tag: string | null;
  text: string;
  topic: string | null;
  persona: RealtimeCommunityChatPersona | null;
  is_hidden: boolean | null;
  client_id: string | null;
};

const SUPABASE_URL = (
  typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_SUPABASE_URL : ""
) ?? "";

const SUPABASE_ANON_KEY = (
  typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY : ""
) ?? "";

export const communityRealtimeConfigured =
  SUPABASE_URL.trim().length > 0 && SUPABASE_ANON_KEY.trim().length > 0;

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (!communityRealtimeConfigured) return null;
  if (!client) {
    client = createClient(SUPABASE_URL.trim(), SUPABASE_ANON_KEY.trim(), {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 8 } },
      global: {
        headers: { "x-client": `aethon-beacon-community/${Platform.OS}` }
      }
    });
  }
  return client;
}

function cleanText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function normalizeRole(value: unknown): RealtimeCommunityRole {
  return value === "verified" || value === "moderator" ? value : "user";
}

function normalizePersona(value: unknown): RealtimeCommunityChatPersona {
  return value === "moderator" || value === "support" ? value : "mentor";
}

function rowToFeedMessage(row: CommunityRow): RealtimeCommunityFeedMessage | null {
  if (row.kind !== "feed" || row.is_hidden) return null;
  const text = cleanText(row.text);
  if (!text) return null;
  const role = normalizeRole(row.role);
  return {
    id: cleanText(row.id, `feed-${Date.now()}`),
    createdAt: cleanText(row.created_at, new Date().toISOString()),
    author: cleanText(row.author, role === "user" ? "Community member" : "Aethon Guide"),
    role,
    tag: cleanText(row.tag, role === "user" ? "Community" : "Verified"),
    text,
    topic: cleanText(row.topic, "general"),
    clientId: cleanText(row.client_id)
  };
}

function rowToChatMessage(row: CommunityRow): RealtimeCommunityChatMessage | null {
  if (row.kind !== "chat" || row.is_hidden) return null;
  const text = cleanText(row.text);
  if (!text) return null;
  const role = normalizeRole(row.role);
  return {
    id: cleanText(row.id, `chat-${Date.now()}`),
    createdAt: cleanText(row.created_at, new Date().toISOString()),
    author: cleanText(row.author, role === "user" ? "Community member" : "Verified Mentor"),
    role,
    text,
    persona: normalizePersona(row.persona),
    clientId: cleanText(row.client_id)
  };
}

function feedMessageToRow(message: RealtimeCommunityFeedMessage): CommunityRow {
  return {
    id: message.id,
    kind: "feed",
    created_at: message.createdAt,
    author: message.author,
    role: message.role,
    tag: message.tag,
    text: message.text,
    topic: message.topic,
    persona: null,
    is_hidden: false,
    client_id: message.clientId ?? null
  };
}

function chatMessageToRow(message: RealtimeCommunityChatMessage): CommunityRow {
  return {
    id: message.id,
    kind: "chat",
    created_at: message.createdAt,
    author: message.author,
    role: message.role,
    tag: null,
    text: message.text,
    topic: null,
    persona: message.persona,
    is_hidden: false,
    client_id: message.clientId ?? null
  };
}

export async function fetchRealtimeCommunityMessages(): Promise<{
  ok: boolean;
  feed: RealtimeCommunityFeedMessage[];
  chat: RealtimeCommunityChatMessage[];
  error?: string;
}> {
  const supabase = getClient();
  if (!supabase) return { ok: false, feed: [], chat: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("aethon_community_messages")
    .select("id, kind, created_at, author, role, tag, text, topic, persona, is_hidden, client_id")
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(140);

  if (error) return { ok: false, feed: [], chat: [], error: error.message };

  const rows = (data ?? []) as CommunityRow[];
  return {
    ok: true,
    feed: rows.map(rowToFeedMessage).filter((item): item is RealtimeCommunityFeedMessage => item !== null),
    chat: rows.map(rowToChatMessage).filter((item): item is RealtimeCommunityChatMessage => item !== null)
  };
}

export async function sendRealtimeCommunityFeedMessage(
  message: RealtimeCommunityFeedMessage
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const { error } = await supabase.from("aethon_community_messages").insert(feedMessageToRow(message));
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function sendRealtimeCommunityChatMessage(
  message: RealtimeCommunityChatMessage
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const { error } = await supabase.from("aethon_community_messages").insert(chatMessageToRow(message));
  return error ? { ok: false, error: error.message } : { ok: true };
}

// Reports used to only ever live in the reporting device's own AsyncStorage
// (App.tsx's communityReports state) -- meaning if a regular member reported
// something, that report never reached the person actually operating the
// app; it only ever showed up in an "admin" session running on that exact
// same device. Now that Community is backed by a real project, reports get
// written to a separate table too, so they land somewhere the operator can
// actually see them (via the Supabase dashboard's Table Editor -- this
// table is intentionally insert-only for the anon key, see
// supabase_community_reports_schema.sql, so random members can't browse
// each other's reports, only submit their own).
export async function submitRealtimeCommunityReport(report: {
  id: string;
  target: "feed" | "chat";
  targetId: string;
  reason: string;
  snippet: string;
  reporterClientId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const { error } = await supabase.from("aethon_community_reports").insert({
    id: report.id,
    created_at: new Date().toISOString(),
    target: report.target,
    target_id: report.targetId,
    reason: report.reason,
    snippet: report.snippet.slice(0, 200),
    reporter_client_id: report.reporterClientId ?? null
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ── Reactions ────────────────────────────────────────────────────────────────
// Backed by a real table (aethon_community_reactions) since, unlike typing,
// reactions need to persist and show accurate counts to members who join or
// refresh later. See supabase_community_reactions_schema.sql for the table,
// RLS policies, and an explicit note on why DELETE is left open to anyone
// (no real per-user auth in this app -- same trust model as the rest of
// Community, moderated out-of-band, nothing sensitive stored here).
export const REALTIME_COMMUNITY_REACTION_EMOJIS = ["❤️", "🙏", "💪", "😢", "👏", "🤝"] as const;
export type RealtimeCommunityReactionEmoji = (typeof REALTIME_COMMUNITY_REACTION_EMOJIS)[number];

export type RealtimeCommunityReaction = {
  id: string;
  messageId: string;
  emoji: RealtimeCommunityReactionEmoji;
  reactorClientId: string;
  createdAt: string;
};

type ReactionRow = {
  id: string;
  message_id: string;
  emoji: string;
  reactor_client_id: string;
  created_at: string;
};

function isReactionEmoji(value: unknown): value is RealtimeCommunityReactionEmoji {
  return (
    typeof value === "string" &&
    (REALTIME_COMMUNITY_REACTION_EMOJIS as readonly string[]).includes(value)
  );
}

function rowToReaction(row: Partial<ReactionRow> | null | undefined): RealtimeCommunityReaction | null {
  if (!row) return null;
  if (
    typeof row.id !== "string" ||
    typeof row.message_id !== "string" ||
    typeof row.reactor_client_id !== "string" ||
    !isReactionEmoji(row.emoji)
  ) {
    return null;
  }
  return {
    id: row.id,
    messageId: row.message_id,
    emoji: row.emoji,
    reactorClientId: row.reactor_client_id,
    createdAt: cleanText(row.created_at, new Date().toISOString())
  };
}

export async function fetchRealtimeCommunityReactions(): Promise<{
  ok: boolean;
  reactions: RealtimeCommunityReaction[];
  error?: string;
}> {
  const supabase = getClient();
  if (!supabase) return { ok: false, reactions: [], error: "Supabase not configured" };
  const { data, error } = await supabase
    .from("aethon_community_reactions")
    .select("id, message_id, emoji, reactor_client_id, created_at")
    .limit(4000);
  if (error) return { ok: false, reactions: [], error: error.message };
  const rows = (data ?? []) as ReactionRow[];
  return {
    ok: true,
    reactions: rows.map(rowToReaction).filter((item): item is RealtimeCommunityReaction => item !== null)
  };
}

export async function addRealtimeCommunityReaction(reaction: {
  messageId: string;
  emoji: RealtimeCommunityReactionEmoji;
  reactorClientId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const { error } = await supabase.from("aethon_community_reactions").insert({
    id: `reaction-${reaction.messageId}-${reaction.emoji}-${reaction.reactorClientId}`,
    message_id: reaction.messageId,
    emoji: reaction.emoji,
    reactor_client_id: reaction.reactorClientId
  });
  // A duplicate tap (same message/emoji/device) hits the table's unique
  // constraint -- from the UI's point of view that's not really an error,
  // the reaction already exists and is already showing, so treat it as ok.
  if (error && !/duplicate key/i.test(error.message)) return { ok: false, error: error.message };
  return { ok: true };
}

export async function removeRealtimeCommunityReaction(reaction: {
  messageId: string;
  emoji: RealtimeCommunityReactionEmoji;
  reactorClientId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const { error } = await supabase
    .from("aethon_community_reactions")
    .delete()
    .eq("message_id", reaction.messageId)
    .eq("emoji", reaction.emoji)
    .eq("reactor_client_id", reaction.reactorClientId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export function subscribeRealtimeCommunityReactions({
  onInsert,
  onDelete
}: {
  onInsert: (reaction: RealtimeCommunityReaction) => void;
  onDelete: (reaction: { messageId: string; emoji: RealtimeCommunityReactionEmoji; reactorClientId: string }) => void;
}): { unsubscribe: () => void } {
  const supabase = getClient();
  if (!supabase) return { unsubscribe: () => undefined };

  let channel: RealtimeChannel | null = supabase
    .channel("aethon-community-reactions")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "aethon_community_reactions" },
      (payload) => {
        const reaction = rowToReaction(payload.new as Partial<ReactionRow>);
        if (reaction) onInsert(reaction);
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "aethon_community_reactions" },
      (payload) => {
        // Requires REPLICA IDENTITY FULL on the table (set in
        // supabase_community_reactions_schema.sql) -- otherwise payload.old
        // only carries the primary key and this would never match.
        const reaction = rowToReaction(payload.old as Partial<ReactionRow>);
        if (reaction) {
          onDelete({ messageId: reaction.messageId, emoji: reaction.emoji, reactorClientId: reaction.reactorClientId });
        }
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      if (channel) {
        supabase.removeChannel(channel).catch(() => undefined);
        channel = null;
      }
    }
  };
}

// ── Typing indicators ────────────────────────────────────────────────────────
// Deliberately NOT backed by a table -- typing state is high-frequency and
// throwaway, so it uses a Supabase Realtime *broadcast* channel instead of
// postgres_changes. Broadcasts never touch the database (no RLS, no rows, no
// aethon_community_messages growth from every keystroke), and there is
// nothing here to moderate since it's never persisted anywhere.
export type RealtimeCommunityTypingKind = "feed" | "chat";

export type RealtimeCommunityTypingEvent = {
  clientId: string;
  displayName: string;
  kind: RealtimeCommunityTypingKind;
};

let typingChannel: RealtimeChannel | null = null;
const typingListeners = new Set<(event: RealtimeCommunityTypingEvent) => void>();

function ensureTypingChannel(supabase: SupabaseClient): RealtimeChannel {
  if (!typingChannel) {
    // The broadcast listener must be registered with .on() before .subscribe()
    // is called, per the Realtime client's contract -- doing both together
    // here (once, lazily, module-scoped) means it never matters which of
    // subscribeRealtimeCommunityTyping / sendRealtimeCommunityTyping runs first.
    typingChannel = supabase
      .channel("aethon-community-typing", { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, (payload) => {
        const data = (payload.payload ?? {}) as Partial<RealtimeCommunityTypingEvent>;
        if (
          typeof data.clientId === "string" &&
          typeof data.displayName === "string" &&
          (data.kind === "feed" || data.kind === "chat")
        ) {
          const event: RealtimeCommunityTypingEvent = {
            clientId: data.clientId,
            displayName: data.displayName,
            kind: data.kind
          };
          typingListeners.forEach((listener) => listener(event));
        }
      });
    typingChannel.subscribe();
  }
  return typingChannel;
}

export function subscribeRealtimeCommunityTyping(
  onTyping: (event: RealtimeCommunityTypingEvent) => void
): { unsubscribe: () => void } {
  const supabase = getClient();
  if (!supabase) return { unsubscribe: () => undefined };
  ensureTypingChannel(supabase);
  typingListeners.add(onTyping);
  return {
    unsubscribe: () => {
      typingListeners.delete(onTyping);
    }
  };
}

export function sendRealtimeCommunityTyping(event: RealtimeCommunityTypingEvent): void {
  const supabase = getClient();
  if (!supabase) return;
  const channel = ensureTypingChannel(supabase);
  channel.send({ type: "broadcast", event: "typing", payload: event }).catch(() => undefined);
}

export function subscribeRealtimeCommunityMessages({
  onFeedMessage,
  onChatMessage,
  onStatus,
  onError
}: {
  onFeedMessage: (message: RealtimeCommunityFeedMessage) => void;
  onChatMessage: (message: RealtimeCommunityChatMessage) => void;
  onStatus?: (status: string) => void;
  onError?: (message: string) => void;
}): { unsubscribe: () => void } {
  const supabase = getClient();
  if (!supabase) {
    onStatus?.("local");
    return { unsubscribe: () => undefined };
  }

  let channel: RealtimeChannel | null = supabase
    .channel("aethon-community-messages")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "aethon_community_messages" },
      (payload) => {
        const row = payload.new as CommunityRow;
        const feedMessage = rowToFeedMessage(row);
        if (feedMessage) {
          onFeedMessage(feedMessage);
          return;
        }
        const chatMessage = rowToChatMessage(row);
        if (chatMessage) onChatMessage(chatMessage);
      }
    )
    .subscribe((status, error) => {
      onStatus?.(status);
      if (error) onError?.(error.message);
    });

  return {
    unsubscribe: () => {
      if (channel) {
        supabase.removeChannel(channel).catch(() => undefined);
        channel = null;
      }
    }
  };
}
