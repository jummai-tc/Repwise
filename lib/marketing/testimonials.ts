/**
 * PLACEHOLDER COPY — NOT REAL CUSTOMERS.
 *
 * Every name, number and quote below is invented to lay out and review the
 * testimonials section. None of it came from a real person, so none of it can
 * ship as social proof: publishing invented customer results is a false
 * advertising problem in most markets, not just a taste one.
 *
 * Before launch, either replace this array wholesale with quotes you have
 * written consent for, or delete the section and the <TestimonialMarquee />
 * that renders it. The `PROOF` block on the landing page is the deliberate
 * alternative — product facts rather than claimed outcomes.
 */

export type Testimonial = {
  id: string;
  /** Display name as it would appear under the quote. */
  name: string;
  /** Monogram shown in place of a photo — see the note in the component. */
  initials: string;
  /** Age · goal · where they train. Keeps the roster visibly varied. */
  meta: string;
  /** The headline outcome, short enough to read at marquee speed. */
  result: string;
  /** How long they had been using Repwisely when they said it. */
  duration: string;
  quote: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "t1",
    name: "Amara Okafor",
    initials: "AO",
    meta: "34 · Fat loss · Home gym",
    result: "−8.4 kg",
    duration: "5 months",
    quote:
      "I had two dumbbells and a spare room, and every other app kept handing me cable machines. Repwisely asked what I actually owned and built around it. Eight kilos down without ever setting foot in a gym.",
  },
  {
    id: "t2",
    name: "Daniel Mercer",
    initials: "DM",
    meta: "41 · Strength · Commercial gym",
    result: "Bench 70 → 92.5 kg",
    duration: "6 months",
    quote:
      "My bench had not moved in two years because I was guessing the weight every session. Having the last set sitting right there on screen fixed that faster than any programme change did.",
  },
  {
    id: "t3",
    name: "Priya Raghunathan",
    initials: "PR",
    meta: "29 · Muscle gain · Commercial gym",
    result: "+4.1 kg lean",
    duration: "7 months",
    quote:
      "The protein target was the part I ignored for a month and then finally took seriously. Turns out I had been eating about 60g short every single day.",
  },
  {
    id: "t4",
    name: "Tom Whitfield",
    initials: "TW",
    meta: "52 · Recomposition · Home gym",
    result: "−6 kg, +2 sizes on lifts",
    duration: "4 months",
    quote:
      "I expected to be told to do burpees. Instead I got something my knees could survive, and I have not missed a week since February.",
  },
  {
    id: "t5",
    name: "Sofia Bianchi",
    initials: "SB",
    meta: "26 · First gym plan · Commercial gym",
    result: "3 sessions a week, 22 weeks",
    duration: "5 months",
    quote:
      "I genuinely did not know what to do in a gym. The session player just told me the next exercise and how long to rest, so I stopped standing around looking lost.",
  },
  {
    id: "t6",
    name: "Marcus Hale",
    initials: "MH",
    meta: "37 · Fat loss · Hotel gyms",
    result: "−11 kg",
    duration: "8 months",
    quote:
      "I travel three weeks a month. Being able to say 'dumbbells only' and get a real session instead of a compromise is the only reason this stuck.",
  },
  {
    id: "t7",
    name: "Nneka Adeyemi",
    initials: "NA",
    meta: "31 · Postpartum return · Home gym",
    result: "Back to pre-pregnancy lifts",
    duration: "6 months",
    quote:
      "Starting again after my second was the hardest part. Being asked about my experience honestly, rather than being handed a beginner plan I had outgrown years ago, made it feel less like starting from zero.",
  },
  {
    id: "t8",
    name: "Jack Rennie",
    initials: "JR",
    meta: "23 · Muscle gain · University gym",
    result: "+6.8 kg bodyweight",
    duration: "9 months",
    quote:
      "I was eating what I thought was a lot and gaining nothing. The calorie number was about 700 higher than I had been guessing. That was the whole problem.",
  },
  {
    id: "t9",
    name: "Elena Vasquez",
    initials: "EV",
    meta: "45 · Consistency · Home gym",
    result: "38-week streak",
    duration: "9 months",
    quote:
      "The consistency grid is faintly ridiculous and it works on me completely. I have trained on days I absolutely did not want to purely to keep the squares filled in.",
  },
  {
    id: "t10",
    name: "Ollie Bennett",
    initials: "OB",
    meta: "33 · Return after injury · Commercial gym",
    result: "Pain-free squats again",
    duration: "5 months",
    quote:
      "I asked the coach for a knee-friendly swap and got three options with the reasoning attached, not just a substitute exercise. I actually understood why I was doing the new one.",
  },
  {
    id: "t11",
    name: "Grace Lindqvist",
    initials: "GL",
    meta: "38 · Fat loss · Home gym",
    result: "−5.2 kg",
    duration: "3 months",
    quote:
      "Two flat weeks and I was ready to quit. It showed me the four-week trend line instead of the daily number and told me to keep going. It was right.",
  },
  {
    id: "t12",
    name: "Ibrahim Chaudhry",
    initials: "IC",
    meta: "48 · Strength · Garage gym",
    result: "Deadlift 100 → 150 kg",
    duration: "10 months",
    quote:
      "Forty-eight and lifting more than I did at thirty. The weekly review kept nudging the numbers up by amounts small enough that I never noticed the jump.",
  },
  {
    id: "t13",
    name: "Hannah Yeo",
    initials: "HY",
    meta: "27 · Busy schedule · Commercial gym",
    result: "4 sessions a week on shift work",
    duration: "7 months",
    quote:
      "I work nights. Being able to say I only had thirty minutes and get told exactly which three lifts to keep is the feature I use most.",
  },
  {
    id: "t14",
    name: "Callum Doherty",
    initials: "CD",
    meta: "35 · Recomposition · Home gym",
    result: "Same weight, 4 belt notches",
    duration: "8 months",
    quote:
      "The scale barely moved all year and I nearly gave up twice. The volume chart was the thing that proved something was happening when the weight said otherwise.",
  },
];
