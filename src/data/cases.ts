export type CaseStatus = "not-started" | "in-progress" | "submitted";

export type CaseMeta = {
  id: string;
  title: string;
  tag: string;
  week: number;
  field: string;
  role: string;
  career: string;
  ask: string;
  goal: string;
  concepts: string[];
  interactiveHref: string;
  complexity?: number;
};

export const CASES: CaseMeta[] = [
  {
    id: "driving-age",
    title: "Driving Age",
    tag: "Statistics",
    week: 1,
    field: "State Legislature / Public Policy",
    role: "State Legislator",
    career:
      "Legislative analysts and public-policy researchers weigh crash statistics, insurance markets, and family cost — then defend a binary vote.",
    ask: "Congresswoman Edmunds has to vote on raising Arizona's minimum driving age from 15½ to 18. Real crash-rate data can be read two ways depending on which trend line you draw — and the two options cost Arizona families very different amounts of money.",
    goal: "Net two-year dollar cost to an Arizona family with one 16-to-17-year-old — Option A priced as added chauffeuring cost only, Option B priced as added insurance-premium cost only.",
    concepts: ["Scatter plots", "Line of best fit", "Slope & correlation"],
    interactiveHref: "/case/driving-age",
    complexity: 3,
  },
];

export function getCase(id: string): CaseMeta | undefined {
  return CASES.find((c) => c.id === id);
}
