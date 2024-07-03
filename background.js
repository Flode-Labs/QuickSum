chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log('Message received in background', request);
  if (request.action === "newChatMessages") {
      console.log('New chat messages received:', request.messages);
      const messages = request.messages;

      try {
          // Reenviar el mensaje al script de contenido para realizar la resumén AI
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            console.log('Tabs:', tabs);  
            if (tabs && tabs.length > 0) {
                  chrome.tabs.sendMessage(tabs[0].id, { action: "summarizeMessages", messages: messages });
              } else {
                  console.error('No active tabs found');
                  sendResponse({ success: false, error: 'No active tabs found' });
              }
          });

          return true;  // Keep the message channel open for async response
      } catch (error) {
          console.error('Error with AI summarization:', error);

          const errorMessage = {
              title: "Gemini Nano not ready or not supported.",
              steps: `**Error:** ${error.message}\n\nTo enable Chrome's built-in on-device model, follow these steps:\n\n
              1. Download the latest version of [**Chrome Dev**](https://google.com/chrome/dev/).\n\n
              2. Open: [chrome://flags/#optimization-guide-on-device-model](chrome://flags/#optimization-guide-on-device-model) and select **Enabled BypassPerfRequirement**.\n\n
              3. Open: [chrome://flags/#prompt-api-for-gemini-nano](chrome://flags/#prompt-api-for-gemini-nano) and select **Enabled**.\n\n
              4. Wait for the model to download. You can check the download status at [chrome://components/](chrome://components/) under **Optimization Guide On Device Model**.\n\n
              Once these steps are completed, you can use the on-device model in Chrome Dev.`
          };

        //   // Set the error message in local storage
        //   chrome.storage.local.set({ errorMessage: errorMessage });

          // Set the popup to show the instructions
          chrome.action.setPopup({ popup: 'popup.html' });

          sendResponse({ success: false, error: errorMessage });
      }
  }
});
