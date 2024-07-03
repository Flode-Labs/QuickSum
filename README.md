
# Prerequisites

- Latest version of Google Chrome (127+) or any compatible Chromium-based browser.

# How to Set Up Built-in Gemini Nano in Chrome

1. **Install Chrome Canary**: Ensure you have version 127. [Download Chrome Canary](https://google.com/chrome/canary/).
2. **Enable Prompt API**: Open `chrome://flags/#prompt-api-for-gemini-nano`, set it to "Enabled".
3. **Enable Optimization Guide**: Open `chrome://flags/#optimization-guide-on-device-model`, set it to "Enabled BypassPerfRequirement". Restart the browser.
4. **Download Model**: Go to `chrome://components/`, find "Optimization Guide On Device Model", ensure it’s fully downloaded. If the version is "0.0.0.0", click "Check for update".
5. **Troubleshoot**: If the "Optimization Guide On Device Model" is not displayed, disable the settings in steps 2 and 3, ensure you have at least 22gb free on your disk and restart your browser and re-enable it.
6. **Verify Setup**: Open a webpage, press F12, and check `window.ai` in the console.

# TODO
* Improve the README 
* Improve prompt
* Check correctly if it's a group when clicked
* Add multiple languages?