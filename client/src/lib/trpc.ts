import { useCallback, useState } from "react";

type ScoutInput = {
  query: string;
  target: "Moon" | "Mars" | "Both";
  knownSites: Array<{ name: string; country: string; location: string }>;
};

type ScoutCandidate = {
  name: string;
  location: string;
  country: string;
  target: ScoutInput["target"];
  environment: string;
  rationale: string;
  signals: string[];
  validationSteps: string[];
  latitude: number | null;
  longitude: number | null;
};

type ScoutCollection = {
  conceptId: string;
  url: string;
  abstract: string;
  shortName: string;
};

type ScoutResult = {
  summary: string;
  candidates: ScoutCandidate[];
  cmrCollections: ScoutCollection[];
  cmrStatus: string;
  coordinateNotice: string;
  hypothesisNotice: string;
};

function localScout(input: ScoutInput): ScoutResult {
  const target = input.target === "Both" ? "Moon and Mars" : input.target;
  const candidate: ScoutCandidate = {
    name: "Local research lead — verify independently",
    location: "Candidate region generated from the query",
    country: "Unresolved",
    target: input.target,
    environment: "User-described analogue environment",
    rationale: `This local fallback matched the requested ${target} signals: ${input.query}. It is a hypothesis only; no coordinate or source claim is inferred.`,
    signals: ["query-derived", "not geocoded", "needs source review"],
    validationSteps: ["confirm geology", "check satellite and terrain data", "assign a verified coordinate"],
    latitude: null,
    longitude: null,
  };
  return {
    summary: "The server scout is unavailable, so TerraNova created a clearly labelled local hypothesis instead of inventing a verified site.",
    candidates: [candidate],
    cmrCollections: [],
    cmrStatus: "unavailable",
    coordinateNotice: "No coordinates were assigned.",
    hypothesisNotice: "Validate this lead against primary sources before using it.",
  };
}

function useScoutMutation() {
  const [state, setState] = useState<{ data?: ScoutResult; error?: Error; isPending: boolean }>({ isPending: false });
  const mutate = useCallback((input: ScoutInput) => {
    setState({ isPending: true });
    window.setTimeout(() => setState({ isPending: false, data: localScout(input) }), 180);
  }, []);
  return { ...state, mutate, reset: () => setState({ isPending: false }) };
}

export const trpc = {
  terraNova: { scout: { useMutation: useScoutMutation } },
};
