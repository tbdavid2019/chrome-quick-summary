console.log('Content script loaded at:', new Date().toISOString());

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in content script:', request);
  if (request.action === "getPageContent") {
    console.log('Getting page content');
    const content = document.body.innerText;
    console.log('Sending response with page content');
    sendResponse({content: content});
  }
  return true;  // 保持消息通道开放，以支持异步响应
});