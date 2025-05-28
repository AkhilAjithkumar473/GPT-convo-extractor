import { getModelUrl } from './utils/models.js';

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'transferConversation') {
    handleTransfer(message.source, message.destination)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true; // Indicates async response
  }
  
  return false;
});

// Handle the transfer process
async function handleTransfer(source, destination) {
  try {
    // Get destination URL
    const destinationUrl = getModelUrl(destination);
    if (!destinationUrl) {
      throw new Error(`Unsupported destination: ${destination}`);
    }

    // Check for an existing tab with the destination URL
    const tabs = await chrome.tabs.query({ url: destinationUrl + '*' });
    let tab;
    if (tabs && tabs.length > 0) {
      // Switch to the first matching tab
      tab = tabs[0];
      await chrome.tabs.update(tab.id, { active: true });
    } else {
      // Open the destination in a new tab
      tab = await chrome.tabs.create({ 
        url: destinationUrl,
        active: true 
      });
      // Wait for tab to fully load
      await new Promise(resolve => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        });
      });
      // Give a little more time for the application to initialize
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Inject the conversation data
    const injectResult = await chrome.tabs.sendMessage(tab.id, { 
      action: 'injectConversation',
      destination: destination
    });
    if (!injectResult || !injectResult.success) {
      throw new Error(injectResult?.error || 'Failed to inject conversation');
    }
    return { success: true };
  } catch (error) {
    console.error('Transfer error:', error);
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred during transfer' 
    };
  }
}

// Handle extension installation or update
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Chat Transfer extension installed/updated');
});