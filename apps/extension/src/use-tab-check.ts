import { useEffect, useState } from "react";
import { Schema } from "effect";
import { Submission, SubmissionReceipt } from "@council/contracts";
import type { StoredCheck } from "./messages";
import { draftKey, receiptKey, tabCheckKey, tabErrorKey } from "./messages";

export function useTabCheck() {
  const [state, setState] = useState<{
    tab?: chrome.tabs.Tab;
    check?: StoredCheck;
    error?: string;
    loading: boolean;
  }>({ loading: true });

  useEffect(() => {
    let active = true;
    let revision = 0;
    async function refresh() {
      const request = ++revision;
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id === undefined) {
          if (active && request === revision) setState({ loading: false });
          return;
        }
        const stored = await chrome.storage.local.get([tabCheckKey(tab.id), tabErrorKey(tab.id)]);
        const key = stored[tabCheckKey(tab.id)] as string | null | undefined;
        let check: StoredCheck | undefined;
        if (key) {
          const values = await chrome.storage.local.get([draftKey(key), receiptKey(key)]);
          const submission = Schema.decodeUnknownSync(Submission)(values[draftKey(key)]);
          const receipt =
            values[receiptKey(key)] === undefined
              ? undefined
              : Schema.decodeUnknownSync(SubmissionReceipt)(values[receiptKey(key)]);
          check = { submission, receipt };
        }
        if (active && request === revision) {
          setState({
            tab,
            check,
            error:
              typeof stored[tabErrorKey(tab.id)] === "string"
                ? (stored[tabErrorKey(tab.id)] as string)
                : undefined,
            loading: false,
          });
        }
      } catch {
        if (active && request === revision)
          setState({
            loading: false,
            error: "Could not restore this tab’s check. Reopen the panel to retry.",
          });
      }
    }
    const onChange = () => {
      void refresh();
    };
    chrome.storage.onChanged.addListener(onChange);
    chrome.tabs.onActivated.addListener(onChange);
    void refresh();
    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(onChange);
      chrome.tabs.onActivated.removeListener(onChange);
    };
  }, []);
  return state;
}
