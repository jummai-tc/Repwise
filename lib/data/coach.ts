import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "./user";
import type { ChatRole } from "@/lib/supabase/database.types";

export type CoachMessage = { id: string; role: ChatRole; content: string };

/**
 * The most recent conversation. One rolling thread per user for now — the
 * table already supports several, so a thread list is additive later.
 */
export async function getCoachThread(): Promise<{
  threadId: string | null;
  messages: CoachMessage[];
}> {
  const user = await getUser();
  if (!user) return { threadId: null, messages: [] };

  const supabase = await createClient();
  const { data: thread } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!thread) return { threadId: null, messages: [] };

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, role, content")
    .eq("thread_id", thread.id)
    .order("created_at");

  return { threadId: thread.id, messages: messages ?? [] };
}
