// Saves options to chrome.storage
function save_options() {
  var apiKey = document.getElementById('apiKey').value;
  var apiBaseURL = document.getElementById('apiBaseURL').value;
  
  chrome.storage.sync.set({
    groqApiKey: apiKey,
    groqApiBaseURL: apiBaseURL
  }, function() {
    // Update status to let user know options were saved.
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
    groqApiBaseURL: 'https://api.groq.com/openai/v1'
  }, function(items) {
    document.getElementById('apiKey').value = items.groqApiKey;
    document.getElementById('apiBaseURL').value = items.groqApiBaseURL;
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);