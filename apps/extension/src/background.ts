import { MAX_TEXT_CHARACTERS } from "@council/contracts";
import { MENU_ID, storeSelection, tabCheckKey, tabErrorKey } from "./messages";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU_ID, title: "Check claims", contexts: ["selection"] });
  });
});
void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

export function handleSelection(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) {
  if (info.menuItemId !== MENU_ID || tab?.id === undefined || !info.selectionText?.trim()) return;
  // Call directly in the gesture handler before asynchronous storage work.
  void chrome.sidePanel.open({ tabId: tab.id }).catch(console.error);
  if (Array.from(info.selectionText).length > MAX_TEXT_CHARACTERS) {
    void chrome.storage.local.set({
      [tabCheckKey(tab.id)]: null,
      [tabErrorKey(tab.id)]: "Select a shorter passage. The limit is 200,000 characters.",
    });
    return;
  }
  const url = info.pageUrl && /^https?:\/\//i.test(info.pageUrl) ? info.pageUrl : undefined;
  void storeSelection(tab.id, {
    submissionKey: crypto.randomUUID(),
    text: info.selectionText,
    ...(url ? { source: { url, title: tab.title } } : {}),
  }).catch(console.error);
}

chrome.contextMenus.onClicked.addListener(handleSelection);
