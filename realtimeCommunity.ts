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
