import { notFound } from "next/navigation";
import { findDay, getActivePlan } from "@/lib/data/training";
import { requireUser } from "@/lib/data/user";
import { WorkoutPlayer } from "./player";

export const dynamic = "force-dynamic";
export const metadata = { title: "Workout" };

export default async function SessionPage({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const { day } = await params;
  await requireUser(`/train/${day}/session`);

  const plan = await getActivePlan();
  const planDay = findDay(plan, Number(day));

  if (!planDay || planDay.is_rest_day) notFound();

  return <WorkoutPlayer day={planDay} />;
}
