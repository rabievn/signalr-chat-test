import { useEffect } from "react";

/** Tells the server which chat is on screen (null when the tab is hidden or unfocused),
 *  so it can skip notifications for messages the user can already see. */
export default function useViewingReport(api, connected, chatId) {
  useEffect(() => {
    if (!api || !connected) return;
    const report = () => {
      const viewing = document.visibilityState === "visible" && document.hasFocus() ? chatId : null;
      api.setViewing(viewing).catch(() => {});
    };
    report();
    document.addEventListener("visibilitychange", report);
    window.addEventListener("focus", report);
    window.addEventListener("blur", report);
    return () => {
      document.removeEventListener("visibilitychange", report);
      window.removeEventListener("focus", report);
      window.removeEventListener("blur", report);
    };
  }, [api, connected, chatId]);
}
