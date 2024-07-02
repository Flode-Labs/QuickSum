// Initial log to confirm content script is running
console.log('Content script loaded');
let aiSession = null;

// Function to extract unread messages
function extractUnreadMessages() {
    const messages = [];
    const unreadElements = document.querySelectorAll('.message-in');

    console.log('Extracting unread messages...');
    unreadElements.forEach(el => {
        messages.push(el.innerText);
    });

    console.log('Extracted messages:', messages);
    return formatMessages(messages);
}

// Function to format messages as conversation
function formatMessages(messages) {
    let formattedMessages = "";
    let lastSender = "";
    let lastTime = "";

    messages.forEach(message => {
        const parts = message.split('\n');
        const sender = parts[0];
        const time = parts[parts.length - 1];
        if (parts.length === 5) {
            const quoteSender = parts[1];
            const quoteContent = parts[2];
            const text = parts[3];
            if (/^\d{1,2}:\d{2}$/.test(quoteContent)) {
                formattedMessages += `${time} - ${sender}: (responding to the audio of ${quoteContent} of ${quoteSender}) ${text}\n\n`;
            } else {
                formattedMessages += `${time} - ${sender}: (responding to the message of ${quoteSender}: "${quoteContent}") ${text}\n\n`;
            }
            lastSender = sender;
            lastTime = time;
        } else {
            console.log('Message parts:', parts);
            console.log('Sender:', sender);
            if (parts.length === 3) {
            const text = parts.slice(1, parts.length - 1).join('\n');
            formattedMessages += `${time} - ${sender}: ${text}\n\n`;
            lastSender = sender;
            lastTime = time;
            } else if (parts.length === 2) {
            const text = parts[0];
            formattedMessages += `${lastTime} - ${lastSender}: ${text}\n\n`;
            }
        }
    });

    console.log('Formatted messages:', formattedMessages);
    return formattedMessages;
}

// Function to scroll and extract messages by scrolling down
function scrollAndExtract() {
    return new Promise((resolve) => {
        let lastScrollHeight = 0;
        let retries = 0;

        const scrollContainer = document.querySelector('._ajyl');
        console.log('Scroll container:', scrollContainer);

        if (!scrollContainer) {
            console.error('Scroll container not found');
            resolve([]);
            return;
        }

        function scrollToBottom() {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }

        const intervalId = setInterval(() => {
            scrollToBottom();
            console.log('Scrolling to bottom...');

            if (scrollContainer.scrollTop === lastScrollHeight) {
                retries++;
                console.log(`Retry #${retries}`);
            } else {
                retries = 0;
            }

            lastScrollHeight = scrollContainer.scrollTop;

            if (retries > 2) {
                clearInterval(intervalId);
                console.log('All messages loaded');
                resolve(extractUnreadMessages());
            }
        }, 1000);
    });
}

// Function to handle new chat opening
function handleNewChat() {
    console.log('New chat opened, extracting messages...');
    scrollAndExtract().then((formattedMessages) => {
        console.log('Sending messages to background script');
        console.log('Messages:', formattedMessages);
        chrome.runtime.sendMessage({ action: "newChatMessages", messages: formattedMessages });
    });
}

// Event listener to detect chat clicks and avoid adding duplicate listeners
function addChatClickListener() {
    const chatElements = document.querySelectorAll('#pane-side > div > div > div > div');

    chatElements.forEach(chatElement => {
        if (!chatElement.hasAttribute('data-click-listener')) {
            chatElement.setAttribute('data-click-listener', 'true');
            chatElement.addEventListener('click', (event) => {
                const newChat = event.currentTarget;
                console.log('Chat clicked:', newChat);
                let newChatInfo = newChat.querySelectorAll('._ahlk span');
                //keep only the span that doesnt contains an svg inside
                console.log('Chat info:', newChatInfo);

                newChatInfo = Array.from(newChatInfo).filter(span => span.querySelector('svg') === null)[0];
                console.log('Chat info:', newChatInfo);
                const isUnread = newChatInfo != null;
                const isGroupChat = newChat.querySelector('.x1n2onr6 .x14yjl9h img') !== null;

                console.log('Chat clicked');
                console.log('isUnread:', isUnread);
                console.log('isGroupChat:', isGroupChat);

                if (isUnread && isGroupChat && newChatInfo.innerText.match(/\d+/) && newChatInfo.innerText > "20" ) {
                    console.log('Chat list changed, detected new chat');
                    handleNewChat();
                }
            });
        }
    });
}

// Function to wait until the WhatsApp loading div disappears
function waitForWhatsAppToLoad() {
    return new Promise((resolve) => {
        const checkLoading = setInterval(() => {
            const loadingDiv = document.querySelector('._alyo._alyw');
            if (!loadingDiv) {
                clearInterval(checkLoading);
                resolve();
            }
        }, 1000);
    });
}

// Initialize the script after WhatsApp is fully loaded
waitForWhatsAppToLoad().then(() => {
    console.log('WhatsApp fully loaded');
    
    const chatList = document.querySelector('#pane-side');
    console.log('Chat list:', chatList);

    if (chatList) {
        addChatClickListener();

        // Observer to detect changes in the chat list and reapply click listeners
        const chatListObserver = new MutationObserver(() => {
            console.log('Chat list updated, reapplying click listeners');
            addChatClickListener();
        });

        chatListObserver.observe(chatList, { childList: true, subtree: true });
    } else {
        console.error('Chat list element not found');
    }

    // Listen for a message from the background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "extractMessages") {
            console.log('Extract messages request received');
            scrollAndExtract().then((formattedMessages) => {
                sendResponse({ messages: formattedMessages });
            });
            return true;  // Keep the message channel open for asynchronous response
        }

        if (request.action === "summarizeMessages") {
            console.log('Summarize messages request received');
            summarizeMessages(request.messages).then((summary) => {
                sendResponse({ success: true, summary: summary });
            }).catch((error) => {
                sendResponse({ success: false, error: error });
            });
            return true;  // Keep the message channel open for asynchronous response
        }

        if (request.action === "injectDiv") {
            console.log('Inject div request received');
            injectDiv(request.messages);
        }
    });
});

// Function to summarize messages using window.ai
// Function to initialize AI session
async function initializeAISession() {
  if (!window || !window.ai) {
      throw new Error("window.ai is not available.");
  }
  
  const sessionReady = await window.ai.canCreateTextSession();
  console.log("AI Session Ready State:", sessionReady);

  if (sessionReady !== "readily") {
      throw new Error("Gemini Nano not ready or not supported.");
  }
  
  aiSession = await window.ai.createTextSession();
}

// Function to summarize messages using window.ai
async function summarizeMessages(messages) {
  if (!aiSession) {
      await initializeAISession();
  }
  
  const prompt = `
  Summarize the following chat messages in one paragraph so i dont have to read all messages to know what happened.
  Consider:
  - The main topics discussed
  - The opinions expressed
  - The key points made
  - Make the summary respecting the order of the messages and the original language
  The message format is as follows:
    - {time} - {sender}: {message}
    - if its only {time} - {message} then the sender is the same as the previous message

  messages unreaden:
  ${messages}
  `;
  const aiSummary = await aiSession.prompt(prompt);

  console.log('AI Summary:', aiSummary);

  return aiSummary;
}
// Function to inject the div with the summary
function injectDiv(messages) {
    const mainDiv = document.getElementById('main');
    if (mainDiv) {
        const targetDiv = mainDiv.querySelector('._amm9');
        if (targetDiv) {
            // Create the summary container div
            const summaryDiv = document.createElement('div');
            summaryDiv.style.position = 'absolute';
            summaryDiv.style.bottom = '10px';
            summaryDiv.style.right = '10px';
            summaryDiv.style.width = '80%';
            summaryDiv.style.maxWidth = '400px';
            summaryDiv.style.background = 'linear-gradient(145deg, #1b1b1b, #0e0e0e)';
            summaryDiv.style.border = '1px solid #333';
            summaryDiv.style.borderRadius = '10px';
            summaryDiv.style.padding = '20px';
            summaryDiv.style.color = 'white';
            summaryDiv.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
            summaryDiv.style.zIndex = '1000';
            summaryDiv.style.fontFamily = 'Arial, sans-serif';
            summaryDiv.style.opacity = '0';  // Initially hidden for fade-in effect
            summaryDiv.style.transition = 'opacity 0.5s';  // Animation effect

            // Create the close button
            const closeButton = document.createElement('span');
            closeButton.innerHTML = '&times;';
            closeButton.style.position = 'absolute';
            closeButton.style.top = '10px';
            closeButton.style.right = '15px';
            closeButton.style.cursor = 'pointer';
            closeButton.style.fontSize = '20px';
            closeButton.style.color = 'white';
            closeButton.onclick = () => {
                summaryDiv.style.opacity = '0';
                setTimeout(() => summaryDiv.remove(), 500);  // Remove after fade-out
            };

            // Create the title
            const title = document.createElement('h2');
            title.textContent = 'Summary';
            title.style.marginTop = '0';
            title.style.marginBottom = '10px';
            title.style.fontSize = '18px';
            title.style.borderBottom = '1px solid #444';
            title.style.paddingBottom = '5px';

            // Create the message content
            const content = document.createElement('div');
            content.style.marginTop = '10px';
            content.style.overflowY = 'auto';
            content.style.maxHeight = '150px';
            content.textContent = messages;

            // Append title, content, and close button to the summaryDiv
            summaryDiv.appendChild(closeButton);
            summaryDiv.appendChild(title);
            summaryDiv.appendChild(content);

            // Append the summaryDiv to the targetDiv
            targetDiv.appendChild(summaryDiv);

            // Trigger the fade-in effect
            setTimeout(() => summaryDiv.style.opacity = '1', 0);
        } else {
            console.error('Target div with class _amm9 not found');
        }
    } else {
        console.error('Main div with id main not found');
    }
}
