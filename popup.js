let currentTabId;
let isProcessing = false;
let originalMarkdown = ''; // 用于存储原始的 Markdown 内容

function initPopup() {
  console.log('Initializing popup');
  const languageSelect = document.getElementById('languageSelect');
  const summarizeButton = document.getElementById('summarizeButton');
  const copyButton = document.getElementById('copyButton'); // 获取复制按钮

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error('Error querying tabs:', chrome.runtime.lastError);
      handleError('Failed to query current tab. Please try again.');
      return;
    }
    console.log('Current tab:', tabs[0]);
    currentTabId = tabs[0].id;
    loadSavedState();
    updateButtonText();
    enableSummarizeButton(); // 确保按钮被启用
  });

  // 事件监听器
  languageSelect.addEventListener('change', () => {
    console.log('Language changed to:', languageSelect.value);
    saveState(languageSelect.value, document.getElementById('summary').innerHTML);
    updateInitialMessage();
    updateButtonText();
  });

  summarizeButton.addEventListener('click', summarizeCurrentPage);

  // 绑定复制按钮的点击事件
  copyButton.addEventListener('click', copyToClipboard);
}

//複製功能 markdwon格式
function copyToClipboard() {
  // 获取当前页面的 URL
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const pageUrl = tabs[0].url; // 获取当前页面的 URL

    // 从 Chrome storage 中获取保存的 markdown 内容
    chrome.storage.local.get(['summary'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error loading summary for copy:', chrome.runtime.lastError);
        alert('Failed to copy text. Please try again.');
        return;
      }

      let markdownToCopy = result.summary || ''; // 获取保存的 markdown 内容

      // 在 Markdown 内容末尾附加当前页面的 URL
      markdownToCopy += `\n\n---\n[Original Source](${pageUrl})`;

      navigator.clipboard.writeText(markdownToCopy).then(() => {
        console.log('Markdown copied to clipboard');

        // 改用一种更隐蔽的方式通知用户复制成功，例如更改按钮文本
        const copyButton = document.getElementById('copyButton');
        copyButton.textContent = "Copied!";
        setTimeout(() => {
          copyButton.textContent = "Copy";
        }, 2000);
      }).catch(err => {
        console.error('Error copying markdown text: ', err);
        alert('Failed to copy text. Please try again.');
      });
    });
  });
}
// 复制功能 文字格式
// function copyToClipboard() {
//   const summaryDiv = document.getElementById('summary');
//   const textToCopy = summaryDiv.innerText;

//   navigator.clipboard.writeText(textToCopy).then(() => {
//     console.log('Text copied to clipboard');
//     // 改用一种更隐蔽的方式通知用户复制成功，例如更改按钮文本
//     copyButton.textContent = "Copied!";
//     setTimeout(() => {
//       copyButton.textContent = "Copy";
//     }, 2000);
//   }).catch(err => {
//     console.error('Error copying text: ', err);
//   });
// }

// 启用总结按钮
function enableSummarizeButton() {
  const summarizeButton = document.getElementById('summarizeButton');
  summarizeButton.disabled = false;
}

// 加载保存的状态
function loadSavedState() {
  console.log('Loading saved state');
  chrome.storage.local.get(['language', 'summary'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading saved state:', chrome.runtime.lastError);
      return;
    }
    console.log('Loaded state:', result);
    const languageSelect = document.getElementById('languageSelect');
    const summaryDiv = document.getElementById('summary');
    const summarizeButton = document.getElementById('summarizeButton');

    if (result.language) {
      languageSelect.value = result.language;
      updateButtonText();
    }
    if (result.summary) {
      // 將保存的 Markdown 重新渲染為 HTML
      summaryDiv.innerHTML = marked.parse(result.summary);
      summarizeButton.disabled = false;
    } else {
      updateInitialMessage();
    }
  });
}

// 总结当前页面
function summarizeCurrentPage() {
  console.log('Summarizing current page');
  if (isProcessing) {
    console.log('Already processing, skipping');
    return;
  }
  isProcessing = true;
  const summarizeButton = document.getElementById('summarizeButton');
  const summaryDiv = document.getElementById('summary');
  summarizeButton.disabled = true;
  summaryDiv.innerHTML = getPreparingMessage();

  // 检查 content script 是否已注入
  chrome.tabs.sendMessage(currentTabId, {action: "ping"}, response => {
    if (chrome.runtime.lastError) {
      // Content script 未注入，尝试注入
      injectContentScript();
    } else {
      // Content script 已注入，直接获取页面内容
      getPageContent();
    }
  });
}

// 注入 content script
function injectContentScript() {
  chrome.scripting.executeScript({
    target: {tabId: currentTabId},
    files: ['content.js']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error injecting content script:', chrome.runtime.lastError);
      handleError('Failed to inject content script. Please refresh the page and try again.');
      return;
    }
    // Content script 注入成功，获取页面内容
    getPageContent();
  });
}

// 获取页面内容
function getPageContent() {
  chrome.tabs.sendMessage(currentTabId, {action: "getPageContent"}, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error sending message:', chrome.runtime.lastError);
      handleError('Could not communicate with the page. Please refresh and try again.');
      return;
    }
    console.log('Received response from content script:', response);
    if (response && response.content) {
      generateSummary(response.content);
    } else {
      console.error('Invalid response from content script');
      handleError('Invalid response from the page. Please refresh and try again.');
    }
  });
}

// 处理错误
function handleError(message) {
  const summaryDiv = document.getElementById('summary');
  const summarizeButton = document.getElementById('summarizeButton');
  summaryDiv.innerHTML = `Error: ${message}`;
  isProcessing = false;
  summarizeButton.disabled = false;
}

// 更新初始消息
function updateInitialMessage() {
  const summaryDiv = document.getElementById('summary');
  const language = document.getElementById('languageSelect').value;
  const message = language === 'zh_TW' 
    ? '請點擊總結按鈕開始總結當前頁面內容。'
    : 'Please click the "Summarize page" button to start summarizing the current page content.';
  summaryDiv.innerHTML = message;
}

// 更新按钮文本
function updateButtonText() {
  const summarizeButton = document.getElementById('summarizeButton');
  const language = document.getElementById('languageSelect').value;
  summarizeButton.textContent = language === 'zh_CN' ? '总结' : 'Summarize';
}

// 加载保存的状态
function loadSavedState() {
  console.log('Loading saved state');
  chrome.storage.local.get(['language', 'summary'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading saved state:', chrome.runtime.lastError);
      return;
    }
    console.log('Loaded state:', result);
    const languageSelect = document.getElementById('languageSelect');
    const summaryDiv = document.getElementById('summary');
    const summarizeButton = document.getElementById('summarizeButton');

    if (result.language) {
      languageSelect.value = result.language;
      updateButtonText();
    }
    if (result.summary) {
      // 將保存的 Markdown 重新渲染為 HTML
      summaryDiv.innerHTML = marked.parse(result.summary);
      summarizeButton.disabled = false;
    } else {
      updateInitialMessage();
    }
  });
}

// 保存状态
function saveState(language, summary) {
  console.log('Saving state:', { language, summary });
  chrome.storage.local.set({ language, summary }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error saving state:', chrome.runtime.lastError);
    } else {
      console.log('State saved successfully');
    }
  });
}


// 更新初始消息
function updateInitialMessage() {
  const summaryDiv = document.getElementById('summary');
  const language = document.getElementById('languageSelect').value;
  const message = language === 'zh_CN' 
    ? '請點擊總結按鈕開始總結當前頁面內容。'
    : 'Please click the "Summarize" button to start summarizing the current page content.';
  summaryDiv.innerHTML = message;
}

// 获取当前语言的准备消息
function getPreparingMessage() {
  const language = document.getElementById('languageSelect').value;
  return language === 'zh_TW' ? '準備總結中...' : 'Preparing to summarize...';
}

// 总结当前页面
function summarizeCurrentPage() {
  console.log('Summarizing current page');
  if (isProcessing) {
    console.log('Already processing, skipping');
    return;
  }
  isProcessing = true;
  const summarizeButton = document.getElementById('summarizeButton');
  const summaryDiv = document.getElementById('summary');
  summarizeButton.disabled = true;
  summaryDiv.innerHTML = getPreparingMessage();

  console.log('Sending message to content script');
  
  // 尝试重新注入content script
  chrome.scripting.executeScript({
    target: {tabId: currentTabId},
    files: ['content.js']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error injecting content script:', chrome.runtime.lastError);
      handleError('Failed to inject content script. Please refresh and try again.');
      return;
    }
    
    // 等待一小段时间确保content script已加载
    setTimeout(() => {
      chrome.tabs.sendMessage(currentTabId, {action: "getPageContent"}, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message:', chrome.runtime.lastError);
          handleError('Could not communicate with the page. Please refresh and try again.');
          return;
        }
        console.log('Received response from content script:', response);
        if (response && response.content) {
          generateSummary(response.content);
        } else {
          console.error('Invalid response from content script');
          handleError('Invalid response from the page. Please refresh and try again.');
        }
      });
    }, 500);  // 等待500毫秒
  });
}

// 处理错误
function handleError(message) {
  const summaryDiv = document.getElementById('summary');
  const summarizeButton = document.getElementById('summarizeButton');
  summaryDiv.innerHTML = `Error: ${message}`;
  isProcessing = false;
  summarizeButton.disabled = false;
}

// 生成摘要
async function generateSummary(content) {
  const languageSelect = document.getElementById('languageSelect');
  const summaryDiv = document.getElementById('summary');
  const summarizeButton = document.getElementById('summarizeButton');
  const language = languageSelect.value;

  const targetLanguage = language === 'zh_TW' ? '繁體中文' : 'English';
  const bulletPointInstruction = language === 'zh_TW' ? '请使用项目符号列表。' : 'Please use bullet points.';

  // 准备要发送到 API 的提示词
  const prompt = `將以下内容總結為${targetLanguage}。无论原文是什么语言，请确保摘要使用${targetLanguage}。
  將以下原文總結為五個部分：1.總結 (Overall Summary)。2.觀點 (Viewpoints)。3.摘要 (Abstract)： 創建6到10個帶有適當表情符號的重點摘要。4.關鍵字 (Key Words)。 5.一個讓十二歲青少年可以看得動懂的段落。請確保每個部分只生成一次，且內容不重複。確保生成的文字都是${targetLanguage}為主。
  ${bulletPointInstruction}
  将输出格式化为 Markdown 。
  原文内容：\n\n${content}`;

  try {
    // 从 Chrome storage 获取 API 密钥和模型名称
    const result = await chrome.storage.sync.get(['groqApiKey', 'groqApiBaseURL', 'groqModelName']);
    const apiKey = result.groqApiKey;
    const apiBaseURL = result.groqApiBaseURL || 'https://api.groq.com/openai/v1';
    const modelName = result.groqModelName || 'llama-3.1-70b-versatile';

    if (!apiKey) {
      throw new Error(language === 'zh_TW' ? 'API 還沒設置。请在扩展选项中设置您的 Groq API 密钥。' : 'API key not set. Please set your Groq API key in the extension options.');
    }

    // 发送请求到 API
    const response = await fetch(`${apiBaseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,  // 使用参数化的模型名称
        messages: [{
          role: "system",
          content: `將以下原文總結為五個部分：1.總結 (Overall Summary)。2.觀點 (Viewpoints)。3.摘要 (Abstract)： 創建6到10個帶有適當表情符號的重點摘要。4.關鍵字 (Key Words)。 5.一個讓十二歲青少年可以看得動懂的段落。請確保每個部分只生成一次，且內容不重複。確保生成的文字都是${targetLanguage}為主 .`
        }, {
          role: "user",
          content: prompt
        }],
        stream: true // 使用流式响应
      })
    });

    if (!response.ok) {
      throw new Error(language === 'zh_TW' ? `HTTP 错误！状态：${response.status}` : `HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    // 读取流式响应的数据
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim();

          if (data === '[DONE]') {
            console.log('Stream ended');
            continue;
          }

          try {
            const parsedData = JSON.parse(data);
            if (parsedData.choices && parsedData.choices[0].delta && parsedData.choices[0].delta.content) {
              fullContent += parsedData.choices[0].delta.content;

              // 将生成的 Markdown 内容实时更新到页面上
              summaryDiv.innerHTML = marked.parse(fullContent);
            }
          } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
          }
        }
      }
    }

    // 保存最终的 Markdown 内容
    originalMarkdown = fullContent;
    saveState(language, originalMarkdown);

  } catch (error) {
    console.error('Error generating summary:', error);
    summaryDiv.innerHTML = language === 'zh_TW'
      ? `生成摘要时出错：${error.message}。請檢查設定中的密鑰並重試`
      : `Error generating summary: ${error.message}. Please check your API key in the extension options and try again.`;
  } finally {
    isProcessing = false;
    summarizeButton.disabled = false;
  }
}

// 当 DOM 加载完成时初始化 popup
document.addEventListener('DOMContentLoaded', initPopup);