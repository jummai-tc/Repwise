"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { coachReply } from "@/lib/coach/reply";
import type { CoachMessage } from "@/lib/data/coach";

export type SendResult =
  | { ok: true; threadId: string; messages: CoachMessage[] }
  | { ok: false; error: string };

const questionSchema = z.string().trim().min(1).max(2000);

/**
 * Persists the question, works out the answer, persists that too, and hands
 * back both rows so the client can render exactly what is stored.
 *
 * The reply comes from lib/coach/reply, which asks Gemini when a key is
 * configured and answers from the user's own rows when it is not. The
 * conversation is stored the same way either way.
 */
export async function sendCoachMessage(input: unknown): Promise<SendResult> {
  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please type a question first." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const { data: existing } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let threadId = existing?.id;
  let history: CoachMessage[] = [];

  if (threadId) {
    // Carried into the prompt so follow-ups like "what about the other one?"
    // resolve. Capped because a long thread is mostly cost by then, and the
    // current numbers are re-sent with every question anyway.
    const { data: prior } = await supabase
      .from("chat_messages")
      .select("id, role, content")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(10);

    history = (prior ?? []).reverse();
  }

  if (!threadId) {
    const { data: created, error } = await supabase
      .from("chat_threads")
      .insert({
        user_id: user.id,
        // The first question makes a better thread title than "New conversation".
        title: parsed.data.slice(0, 60),
      })
      .select("id")
      .single();

    if (error || !created) {
      return { ok: false, error: "We could not start that conversation." };
    }
    threadId = created.id;
  }

  const answer = await coachReply(parsed.data, history);

  const { data: rows, error } = await supabase
    .from("chat_messages")
    .insert([
      { thread_id: threadId, user_id: user.id, role: "user" as const, content: parsed.data },
      { thread_id: threadId, user_id: user.id, role: "assistant" as const, content: answer },
    ])
    .select("id, role, content");

  if (error || !rows) {
    return { ok: false, error: "We could not save that message." };
  }

  // Bumps updated_at so this stays the active thread.
  await supabase
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  revalidatePath("/coach");

  // Insert order is preserved, but sort defensively so the question always
  // renders above its answer.
  const messages = [...rows].sort((a) => (a.role === "user" ? -1 : 1));
  return { ok: true, threadId, messages };
}

export async function clearCoachThread(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false };

  await supabase.from("chat_threads").delete().eq("user_id", user.id);
  revalidatePath("/coach");
  return { ok: true };
}
