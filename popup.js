document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['summary'], (result) => {
      document.getElementById('summary').innerText = result.summary || 'No summary available';
    });
  });
  