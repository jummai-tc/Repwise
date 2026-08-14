import { PageIntro } from "@/components/shell/page-intro";
import { getCoachThread } from "@/lib/data/coach";
import { requireUser } from "@/lib/data/user";
import { CoachClient } from "./coach-client";

export const dynamic = "force-dynamic";
// The coach's reply is a model call — a few seconds normally, longer when
// Gemini is under load and the client retries.
export const maxDuration = 60;
export const metadata = { title: "Your AI Coach" };

export default async function CoachPage() {
  await requireUser("/coach");
  const { messages } = await getCoachThread();

  return (
    <>
      <PageIntro
        title="Your AI Coach"
        description="Ask anything about your training, your food or your progress — it answers from your own logs."
      />
      <CoachClient initialMessages={messages} />
    </>
  );
}
