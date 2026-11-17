/** UI strings: one row per key, [English, Traditional Chinese] (the order of LANGS). */
import type { Language } from "@learnkit/web";

export type L = readonly [string, string];

export const LANGS: Language[] = [
  { code: "en", name: "English" },
  { code: "zh-Hant", name: "繁體中文" },
];

export const STRINGS = {
  tagline: ["Predict, imagine, plan and render a world: in your browser", "預測、想像、規劃與渲染一個世界：就在你的瀏覽器裡"],
  "page.concept": ["Concepts", "概念"],
  "page.skills": ["Coding Skills", "程式技巧"],
  "page.reading": ["Further reading", "延伸閱讀"],
  "tab.foundations": ["What is a world model?", "什麼是世界模型？"],
  "tab.representation": ["Latent spaces", "潛在空間"],
  "tab.planning": ["Planning and imagination", "規劃與想像"],
  "tab.generative": ["Generative worlds", "生成的世界"],
  "tab.scenes": ["3D scene models", "三維場景模型"],
  "tab.limits": ["Scope and open questions", "範圍與未解問題"],
  "tab.history": ["History", "歷史"],
  "skills.models": ["States, models and rollouts", "狀態、模型與推演"],
  "skills.planning": ["Planning in code", "以程式碼規劃"],
  "skills.checking": ["Checking a world model", "檢驗世界模型"],
  "skills.rendering": ["Rays and splats", "光線與潑濺"],
  "reading.papers": ["Papers & code", "論文與程式碼"],
  "history.title": ["History of world models", "世界模型的歷史"],
  "history.intro": [
    "How a 1943 idea, that a mind carries a small-scale model of the world, became agents that learn by imagining and machines that generate worlds you can walk through. Two strands run side by side, learning to predict and rendering a scene from data, and meet in 2024. Every card cites its sources.",
    "一個 1943 年的想法：心智裡裝著一個小尺度的世界模型；它如何演變成靠想像學習的智能體，以及能生成可漫遊世界的機器。兩條線並行：學會預測，以及從資料渲染場景，並在 2024 年交會。每張卡片都附上資料來源。",
  ],
  timeline: ["Timeline", "時間軸"],
  "timeline.open": ["All events", "全部事件"],
  sources: ["Sources", "資料來源"],
  coffee: ["Buy me a coffee", "請我喝杯咖啡"],
  "footer.licence": ["Apache-2.0", "Apache-2.0"],
  "crash.title": ["Something went wrong on this page", "這一頁出了問題"],
  "crash.body": ["The rest of the site still works. Reload, or go to another page.", "網站其他部分仍可使用。請重新載入，或前往其他頁面。"],
  "crash.reload": ["Reload", "重新載入"],
} satisfies Record<string, L>;
