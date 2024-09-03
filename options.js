// Saves options to chrome.storage
function save_options() {
  var apiKey = document.getElementById('apiKey').value;
  var apiBaseURL = document.getElementById('apiBaseURL').value;
  var modelName = document.getElementById('modelName').value;
  
  chrome.storage.sync.set({
    groqApiKey: apiKey,
    groqApiBaseURL: apiBaseURL,
    groqModelName: modelName
  }, function() {
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get({
    groqApiKey: '',
    groqApiBaseURL: 'https://api.groq.com/openai/v1',
    groqModelName: ''
  }, function(items) {
    document.getElementById('apiKey').value = items.groqApiKey;
    document.getElementById('apiBaseURL').value = items.groqApiBaseURL;
    fetchAndPopulateModels(items.groqApiKey, items.groqApiBaseURL, items.groqModelName);
  });
}

// Fetch available models from the OpenAI API and populate the dropdown
function fetchAndPopulateModels(apiKey, apiBaseURL, selectedModel) {
  const modelSelect = document.getElementById('modelName');
  
  if (!apiKey) {
    modelSelect.innerHTML = '<option value="">Please set your API key</option>';
    return;
  }
  
  fetch(`${apiBaseURL}/models`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    modelSelect.innerHTML = '';
    const models = data.data || [];
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.id;
      if (model.id === selectedModel) {
        option.selected = true;
      }
      modelSelect.appendChild(option);
    });
  })
  .catch(error => {
    console.error('Error fetching models:', error);
    modelSelect.innerHTML = '<option value="">Failed to load models</option>';
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);