chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

function injectContentScript(tabId) {
  chrome.scripting.executeScript({
    target: {tabId: tabId},
    files: ['content.js']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error injecting script:', chrome.runtime.lastError);
    } else {
      console.log('Content script injected successfully into tab:', tabId);
    }
  });
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('Tab activated:', activeInfo.tabId);
  injectContentScript(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('Tab updated:', tabId);
    injectContentScript(tabId);
  }
});