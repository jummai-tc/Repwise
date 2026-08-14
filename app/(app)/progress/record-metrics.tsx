"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { recordBodyMetrics } from "./actions";

const FIELDS = [
  ["weight_kg", "Weight (kg)"],
  ["body_fat_pct", "Body fat (%)"],
  ["chest_cm", "Chest (cm)"],
  ["waist_cm", "Waist (cm)"],
  ["arm_cm", "Arm (cm)"],
  ["thigh_cm", "Thigh (cm)"],
] as const;

type Field = (typeof FIELDS)[number][0];

/** Today's weigh-in. Saving again the same day updates it rather than adding a
 *  second point, so the chart never shows two dots for one morning. */
export function RecordMetrics({ currentWeightKg }: { currentWeightKg: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Partial<Record<Field, string>>>({
    weight_kg: currentWeightKg ? String(currentWeightKg) : "",
  });

  const submit = () => {
    setError(null);
    const payload = Object.fromEntries(
      FIELDS.map(([key]) => [key, values[key] ? Number(values[key]) : null]).filter(
        ([, v]) => v !== null && Number.isFinite(v as number),
      ),
    );

    startTransition(async () => {
      const result = await recordBodyMetrics(payload);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <>
      <Button size="lg" variant="secondary" onClick={() => setOpen(true)}>
        <Scale /> Record Weight
      </Button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Record today's numbers"
        description="Fill in whatever you measured. Anything left blank is skipped."
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(([key, label]) => (
              <div key={key}>
                <Label htmlFor={`metric-${key}`}>{label}</Label>
                <Input
                  id={`metric-${key}`}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={values[key] ?? ""}
                  onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                  placeholder="—"
                />
              </div>
            ))}
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-[0.8125rem] text-danger">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </p>
          )}

          <Button size="lg" block onClick={submit} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Check /> Save
              </>
            )}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
