// 檢查 URL 是否允許注入腳本
function canInjectScript(url) {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
}

// 檢查 content script 是否已經注入的輔助函數
function isContentScriptInjected(tabId, callback) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.error('Error getting tab:', chrome.runtime.lastError.message);
      callback(false);
      return;
    }

    if (!canInjectScript(tab.url)) {
      console.log('Cannot inject script into this page:', tab.url);
      callback(false);
      return;
    }

    chrome.scripting.executeScript({
      target: {tabId: tabId},
      func: () => !!window.__contentScriptInjected
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error('Error checking content script:', chrome.runtime.lastError.message);
        callback(false);
      } else {
        callback(results && results[0] && results[0].result);
      }
    });
  });
}

// 注入 content script 的輔助函數
function injectContentScript(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.error('Error getting tab:', chrome.runtime.lastError.message);
      return;
    }

    if (!canInjectScript(tab.url)) {
      console.log('Cannot inject script into this page:', tab.url);
      return;
    }

    isContentScriptInjected(tabId, (isInjected) => {
      if (!isInjected) {
        chrome.scripting.executeScript({
          target: {tabId: tabId},
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error injecting script:', chrome.runtime.lastError.message);
          } else {
            console.log('Content script injected successfully into tab:', tabId);
          }
        });
      } else {
        console.log('Content script already injected into tab:', tabId);
      }
    });
  });
}

// 監聽標籤切換事件
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('Tab activated:', activeInfo.tabId);
  injectContentScript(activeInfo.tabId);
});

// 監聽標籤更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && canInjectScript(tab.url)) {
    console.log('Tab updated:', tabId);
    injectContentScript(tabId);
  }
});