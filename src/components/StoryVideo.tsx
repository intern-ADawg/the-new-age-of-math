import { useEffect, useRef, useState } from "react";
import "./story-stage.css";

type StageApi = {
  el: HTMLElement;
  play: () => void;
  stop: () => void;
};

type MbGlobal = {
  scenesFromParagraphs: (paras: string[]) => unknown[];
  stage: (
    host: HTMLElement,
    scenes: unknown[],
    opts: {
      seed?: string;
      label?: string;
      playLabel?: string;
      textToggle?: () => boolean;
      onEnd?: () => void;
    },
  ) => StageApi;
};

declare global {
  interface Window {
    MB?: MbGlobal;
  }
}

let stageScriptPromise: Promise<void> | null = null;

function loadStageScript() {
  if (window.MB?.stage) return Promise.resolve();
  if (stageScriptPromise) return stageScriptPromise;
  stageScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-mb-stage="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("stage script failed")));
      if (window.MB?.stage) resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = "/vendor/case-stage.js";
    s.async = true;
    s.dataset.mbStage = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("stage script failed"));
    document.head.appendChild(s);
  });
  return stageScriptPromise;
}

type Props = {
  paragraphs: string[];
  seed: string;
  label?: string;
  playLabel?: string;
  onWatched?: () => void;
};

export function StoryVideo({
  paragraphs,
  seed,
  label = "The story, acted out by stick figures",
  playLabel = "Watch the story",
  onWatched,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const showTextRef = useRef(false);
  const [showText, setShowText] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    let player: StageApi | null = null;

    (async () => {
      try {
        await loadStageScript();
        if (cancelled || !hostRef.current || !window.MB) return;
        hostRef.current.innerHTML = "";
        const scenes = window.MB.scenesFromParagraphs(paragraphs);
        player = window.MB.stage(hostRef.current, scenes, {
          seed,
          label,
          playLabel,
          textToggle: () => {
            showTextRef.current = !showTextRef.current;
            setShowText(showTextRef.current);
            return showTextRef.current;
          },
          onEnd: () => onWatched?.(),
        });
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Could not load story video");
      }
    })();

    return () => {
      cancelled = true;
      try {
        player?.stop();
      } catch {
        /* ignore */
      }
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, paragraphs.join("\n")]);

  return (
    <div className="mb-story">
      <div ref={hostRef} />
      {err && (
        <p style={{ color: "var(--bad)", fontWeight: 700 }}>
          Story video unavailable — read the text below.
        </p>
      )}
      <div style={{ display: showText || err ? "block" : "none" }}>
        {paragraphs.map((p) => (
          <p key={p.slice(0, 48)} className="mb-story-text">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}
