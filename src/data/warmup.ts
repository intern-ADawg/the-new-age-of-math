export type WarmupItem = {
  id: string;
  skill: string;
  prompt: string;
  choices: string[];
  /** Index of correct choice — graded in code, never by the model (R12). */
  answer: number;
  explain: string;
};

export const WARMUPS: Record<string, WarmupItem[]> = {
  "driving-age": [
    {
      id: "da-1",
      skill: "Scatter plots",
      prompt:
        "On a scatter plot of age (x) vs. crash rate (y), what does each point represent?",
      choices: [
        "A single age group and its crash rate",
        "The average of all crash rates",
        "The slope of the trend line",
        "A prediction for age 18",
      ],
      answer: 0,
      explain: "Each point is one observed pair — an age and that age's crash rate.",
    },
    {
      id: "da-2",
      skill: "Line of best fit",
      prompt: "A line of best fit is drawn through crash-rate points. What is it mainly for?",
      choices: [
        "To force every point onto the line",
        "To summarize the overall trend so you can compare or predict",
        "To prove one option is always cheaper",
        "To replace the raw data table",
      ],
      answer: 1,
      explain: "It summarizes the trend — useful for comparing ages or making a careful prediction.",
    },
    {
      id: "da-3",
      skill: "Slope",
      prompt:
        "If crash rate falls as age rises, the slope of the line of best fit is…",
      choices: [
        "Positive (uphill left → right)",
        "Negative (downhill left → right)",
        "Always zero",
        "Undefined",
      ],
      answer: 1,
      explain: "As x goes up and y goes down, slope is negative.",
    },
    {
      id: "da-4",
      skill: "Correlation vs. causation",
      prompt:
        "A strong downward trend in crash rate with age means…",
      choices: [
        "Raising the driving age must cause fewer crashes",
        "Age and crash rate move together in the data — causation still needs argument",
        "The data is wrong",
        "Insurance prices are irrelevant",
      ],
      answer: 1,
      explain: "Trend is association. A policy argument still has to defend cause and cost.",
    },
    {
      id: "da-5",
      skill: "Reading a prediction",
      prompt:
        "Your line predicts crash rate at age 15.5 and at 18. What should you compare next for the dilemma?",
      choices: [
        "Only the prettier graph",
        "How those rates (and family costs) trade off under Option A vs B",
        "Whether the points are circles or squares",
        "The title font on the chart",
      ],
      answer: 1,
      explain: "The case asks for a defensible choice — predictions feed the cost tradeoff, not aesthetics.",
    },
  ],
};

export type SkillLevel = "Not Yet" | "Practiced" | "Proficient";

export function scoreWarmup(
  items: WarmupItem[],
  answers: Record<string, number>,
): { skill: string; level: SkillLevel; correct: boolean }[] {
  const bySkill = new Map<string, { ok: number; n: number }>();
  for (const item of items) {
    const cur = bySkill.get(item.skill) || { ok: 0, n: 0 };
    cur.n += 1;
    if (answers[item.id] === item.answer) cur.ok += 1;
    bySkill.set(item.skill, cur);
  }
  return [...bySkill.entries()].map(([skill, { ok, n }]) => {
    const ratio = ok / n;
    const level: SkillLevel =
      ratio === 1 ? "Proficient" : ratio >= 0.5 ? "Practiced" : "Not Yet";
    return { skill, level, correct: ratio === 1 };
  });
}
