import { validateSelections } from './utils/validator.js';
import { getModelUrl } from './utils/models.js';

document.addEventListener('DOMContentLoaded', () => {
  const sourceSelect = document.getElementById('source');
  const destinationSelect = document.getElementById('destination');
  const previewBtn = document.getElementById('preview-btn');
  const transferBtn = document.getElementById('transfer-btn');
  const previewContainer = document.getElementById('preview-container');
  const previewContent = document.getElementById('preview-content');
  const statusContainer = document.getElementById('status-container');
  const statusMessage = document.getElementById('status-message');

  // Function to update button state based on selections
  function updateButtonState() {
    const sourceValue = sourceSelect.value;
    const destinationValue = destinationSelect.value;
    
    transferBtn.disabled = !sourceValue || !destinationValue || sourceValue === destinationValue;
    
    if (sourceValue === destinationValue && sourceValue) {
      showError('Source and destination cannot be the same');
    }
  }

  // Show error message
  function showError(message) {
    statusContainer.classList.remove('hidden');
    statusMessage.textContent = message;
    statusMessage.classList.add('error');
    
    // Hide spinner if showing an error
    document.querySelector('.spinner').style.display = 'none';
    
    setTimeout(() => {
      statusContainer.classList.add('hidden');
      statusMessage.classList.remove('error');
      document.querySelector('.spinner').style.display = 'flex';
    }, 3000);
  }

  // Show success message
  function showSuccess(message) {
    statusContainer.classList.remove('hidden');
    statusMessage.textContent = message;
    statusMessage.classList.add('success');
    
    // Hide spinner if showing a success message
    document.querySelector('.spinner').style.display = 'none';
    
    setTimeout(() => {
      statusContainer.classList.add('hidden');
      statusMessage.classList.remove('success');
      document.querySelector('.spinner').style.display = 'flex';
    }, 3000);
  }

  // Show loading state
  function showLoading(message = 'Processing...') {
    statusContainer.classList.remove('hidden');
    statusMessage.textContent = message;
    document.querySelector('.spinner').style.display = 'flex';
  }

  // Hide loading state
  function hideLoading() {
    statusContainer.classList.add('hidden');
  }

  // Check if we're currently on a supported AI chat page
  async function checkCurrentPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab.url;
      
      if (url.includes('chatgpt.com')) {
        sourceSelect.value = 'chatgpt';
      } else if (url.includes('chat.deepseek.com')) {
        sourceSelect.value = 'deepseek';
      } else if (url.includes('claude.ai')) {
        sourceSelect.value = 'claude';
      } else if (url.includes('gemini.google.com')) {
        sourceSelect.value = 'gemini';
      } else if (url.includes('poe.com')) {
        sourceSelect.value = 'poe';
      }
      
      updateButtonState();
    } catch (error) {
      console.error('Error checking current page:', error);
    }
  }

  // Preview conversation history
  async function previewConversation() {
    try {
      const sourceValue = sourceSelect.value;
      
      if (!sourceValue) {
        showError('Please select a source model');
        return;
      }
      
      showLoading('Fetching conversation...');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if we're on the right page for the selected source
      const url = tab.url;
      const modelUrl = getModelUrl(sourceValue);
      
      if (!url.includes(modelUrl)) {
        showError(`Please navigate to ${modelUrl} first`);
        return;
      }
      
      // Execute the scraper content script
      chrome.tabs.sendMessage(tab.id, { action: 'previewConversation' }, (response) => {
        hideLoading();
        
        if (chrome.runtime.lastError) {
          showError('Error: ' + chrome.runtime.lastError.message);
          return;
        }
        
        if (!response || response.error) {
          showError(response?.error || 'Failed to fetch conversation');
          return;
        }
        
        // Show the preview
        previewContainer.classList.remove('hidden');
        
        if (response.conversation && response.conversation.length > 0) {
          const formattedPreview = formatPreview(response.conversation);
          previewContent.innerHTML = formattedPreview;
        } else {
          previewContent.innerHTML = '<div class="placeholder-text">No conversation found or empty conversation</div>';
        }
      });
    } catch (error) {
      hideLoading();
      showError('Error previewing conversation: ' + error.message);
    }
  }

  // Format preview of conversation
  function formatPreview(conversation) {
    if (!Array.isArray(conversation) || conversation.length === 0) {
      return '<div class="placeholder-text">No conversation found</div>';
    }
    
    // Limit to first 3 exchanges for preview
    const previewItems = conversation.slice(0, 3);
    
    let html = '';
    previewItems.forEach((item, index) => {
      const isUser = item.role === 'user';
      const role = isUser ? 'You' : 'AI';
      const message = item.content.length > 100 
        ? item.content.substring(0, 100) + '...' 
        : item.content;
      
      html += `<div style="margin-bottom: 8px;">
                <strong>${role}:</strong> ${message}
              </div>`;
    });
    
    if (conversation.length > 3) {
      html += `<div style="font-style: italic; color: var(--text-tertiary);">
                + ${conversation.length - 3} more messages
              </div>`;
    }
    
    return html;
  }

  // Utility function to download JSON file
  function downloadJSON(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  // Transfer conversation
  async function transferConversation() {
    try {
      const sourceValue = sourceSelect.value;
      const destinationValue = destinationSelect.value;
      
      // Validate selections
      const validationResult = validateSelections(sourceValue, destinationValue);
      if (!validationResult.valid) {
        showError(validationResult.error);
        return;
      }
      
      showLoading('Transferring conversation...');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if we're on the right page for the selected source
      const url = tab.url;
      const sourceUrl = getModelUrl(sourceValue);
      
      if (!url.includes(sourceUrl)) {
        showError(`Please navigate to ${sourceUrl} first`);
        return;
      }
      
      // Get conversation from source
      chrome.tabs.sendMessage(tab.id, { action: 'scrapeConversation' }, async (response) => {
        if (chrome.runtime.lastError) {
          hideLoading();
          showError('Error: ' + chrome.runtime.lastError.message);
          return;
        }
        
        if (!response || response.error) {
          hideLoading();
          showError(response?.error || 'Failed to scrape conversation');
          return;
        }
        
        if (!response.conversation || response.conversation.length === 0) {
          hideLoading();
          showError('No conversation found or empty conversation');
          return;
        }
        
        // Download conversation as JSON
        const filename = `conversation_${sourceValue}_to_${destinationValue}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        downloadJSON({
          conversation: response.conversation,
          source: sourceValue,
          destination: destinationValue
        }, filename);
        
        // Notify user to upload the file in the destination model
        showSuccess('Conversation JSON downloaded! Please upload this file and prompt the destination AI model to store it.');
        
        // Store conversation data
        await chrome.storage.local.set({ 
          transferData: {
            conversation: response.conversation,
            source: sourceValue,
            destination: destinationValue
          }
        });
        
        // Send message to background script to handle tab navigation and injection
        chrome.runtime.sendMessage({ 
          action: 'transferConversation',
          source: sourceValue,
          destination: destinationValue
        }, (response) => {
          hideLoading();
          
          if (chrome.runtime.lastError) {
            showError('Error: ' + chrome.runtime.lastError.message);
            return;
          }
          
          if (response && response.success) {
            showSuccess('Transfer initiated successfully!');
          } else {
            showError(response?.error || 'Failed to transfer conversation');
          }
        });
      });
    } catch (error) {
      hideLoading();
      showError('Error transferring conversation: ' + error.message);
    }
  }

  // Event listeners
  sourceSelect.addEventListener('change', updateButtonState);
  destinationSelect.addEventListener('change', updateButtonState);
  previewBtn.addEventListener('click', previewConversation);
  transferBtn.addEventListener('click', transferConversation);

  // Initialize
  checkCurrentPage();
  updateButtonState();
});