"use client";

import { useEffect, useState } from "react";
import { parseYMD, todayKST, type YMD } from "./date";

/**
 * The build date (KST), inlined at build time into BOTH the server HTML and the
 * client bundle, so the first client render matches the prerendered HTML.
 */
export const BUILD_DATE: YMD = parseYMD(process.env.NEXT_PUBLIC_BUILD_DATE) ?? { y: 2026, m: 10, d: 9 };

/**
 * Today's date in Korea, hydration-safe.
 * First render returns BUILD_DATE (same as the static HTML); after mount it switches
 * to the visitor's real "today". Use this instead of calling todayKST() in render.
 */
export function useToday(): { today: YMD; isLive: boolean } {
  const [today, setToday] = useState<YMD>(BUILD_DATE);
  const [isLive, setLive] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- switch from build date to the real date after hydration
    setToday(todayKST());
    setLive(true);
  }, []);
  return { today, isLive };
}
