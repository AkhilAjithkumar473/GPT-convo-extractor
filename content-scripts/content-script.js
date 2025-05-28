// Determine which AI model page we're on
function detectModel() {
  const url = window.location.href;
  
  if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
    return 'chatgpt';
  } else if (url.includes('chat.deepseek.com')) {
    return 'deepseek';
  } else if (url.includes('claude.ai')) {
    return 'claude';
  } else if (url.includes('gemini.google.com')) {
    return 'gemini';
  } else if (url.includes('poe.com')) {
    return 'poe';
  }
  
  return null;
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const model = detectModel();
  
  if (!model) {
    sendResponse({ error: 'Not on a supported AI model page' });
    return;
  }
  
  if (message.action === 'previewConversation' || message.action === 'scrapeConversation') {
    scrapeConversation(model)
      .then(conversation => {
        sendResponse({ conversation });
      })
      .catch(error => {
        console.error('Scraping error:', error);
        sendResponse({ error: error.message || 'Failed to scrape conversation' });
      });
    
    return true; // Indicates async response
  }
  
  if (message.action === 'injectConversation') {
    // Get the stored conversation data
    chrome.storage.local.get(['transferData'], (result) => {
      if (!result.transferData) {
        sendResponse({ error: 'No conversation data found' });
        return;
      }
      
      injectConversation(model, result.transferData)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('Injection error:', error);
          sendResponse({ 
            success: false, 
            error: error.message || 'Failed to inject conversation' 
          });
        });
    });
    
    return true; // Indicates async response
  }
});

// Scrape conversation from the current page
async function scrapeConversation(model) {
  switch (model) {
    case 'chatgpt':
      return scrapeChatGPT();
    case 'deepseek':
      return scrapeDeepSeek();
    case 'claude':
      return scrapeClaudeAI();
    case 'gemini':
      return scrapeGemini();
    case 'poe':
      return scrapePoe();
    default:
      throw new Error('Unsupported model for scraping');
  }
}

// Inject conversation into the destination page
async function injectConversation(model, transferData) {
  const { conversation, source, destination } = transferData;
  
  if (!conversation || conversation.length === 0) {
    throw new Error('No conversation data to inject');
  }
  
  // Format the conversation for the destination model
  const formattedConversation = formatConversationForTransfer(conversation, source, destination);
  
  switch (model) {
    case 'chatgpt':
      return injectToChatGPT(formattedConversation);
    case 'deepseek':
      return injectToDeepSeek(formattedConversation);
    case 'claude':
      return injectToClaudeAI(formattedConversation);
    case 'gemini':
      return injectToGemini(formattedConversation);
    case 'poe':
      return injectToPoe(formattedConversation);
    default:
      throw new Error('Unsupported model for injection');
  }
}

// Format conversation for transfer
function formatConversationForTransfer(conversation, source, destination) {
  // Create a comprehensive prompt that instructs the destination model
  // about the imported conversation
  const formattedMessages = conversation.map((msg, index) => {
    const roleLabel = msg.role === 'user' ? 'Human' : 'AI';
    return `${roleLabel} (${index + 1}): ${msg.content}`;
  }).join('\n\n');
  
  const prompt = `I'm transferring a conversation from ${source.toUpperCase()} to you. Please store this conversation in your memory, including all code snippets and formatting. The conversation consists of ${conversation.length} messages.

CONVERSATION HISTORY:
---
${formattedMessages}
---

Please respond with: "I've received and stored the conversation history from ${source.toUpperCase()}. I now have access to all ${conversation.length} messages including any code snippets and context. How would you like to proceed?"`;

  return prompt;
}

// ChatGPT specific functions
async function scrapeChatGPT() {
  try {
    // Wait for content to load
    await waitForElement('.text-base');
    
    // Get all conversation elements
    const conversationElements = document.querySelectorAll('.text-base');
    
    if (!conversationElements || conversationElements.length === 0) {
      throw new Error('No conversation found on ChatGPT');
    }
    
    const conversation = [];
    
    conversationElements.forEach((element) => {
      // Determine if this is a user message or assistant message
      const isUserMessage = element.querySelector('.items-end') !== null;
      const role = isUserMessage ? 'user' : 'assistant';
      
      // Extract the text content
      const contentElement = element.querySelector('.markdown');
      
      if (contentElement) {
        // Clone the content to avoid modifying the page
        const contentClone = contentElement.cloneNode(true);
        
        // Get the HTML content to preserve formatting and code blocks
        let content = contentClone.innerHTML;
        
        // Clean up content if needed
        content = cleanContent(content);
        
        conversation.push({
          role,
          content
        });
      }
    });
    
    return conversation;
  } catch (error) {
    console.error('Error scraping ChatGPT:', error);
    throw new Error('Failed to scrape conversation from ChatGPT');
  }
}

async function injectToChatGPT(formattedConversation) {
  try {
    // Wait for the input area to be available
    const textarea = await waitForElement('textarea[data-id="root"]');
    
    // Focus and set the value
    textarea.focus();
    
    // Use the proper way to set value and trigger React's change event
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set;
    
    nativeTextAreaValueSetter.call(textarea, formattedConversation);
    
    // Dispatch events to ensure React picks up the change
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Submit the form
    const submitButton = textarea.closest('form').querySelector('button[data-testid="send-button"]');
    
    if (submitButton) {
      submitButton.click();
    } else {
      throw new Error('Submit button not found');
    }
    
    return true;
  } catch (error) {
    console.error('Error injecting to ChatGPT:', error);
    throw new Error('Failed to inject conversation to ChatGPT');
  }
}

// DeepSeek specific functions
async function scrapeDeepSeek() {
  try {
    // Wait for at least one user or assistant message to appear
    await waitForElement('div.fbb737a4, div.ds-markdown.ds-markdown--block');

    const conversation = [];
    // Find the parent container that holds all messages (adjust if needed)
    const parent = document.body;

    // Collect all user and assistant messages in DOM order
    parent.querySelectorAll('div.fbb737a4, div.ds-markdown.ds-markdown--block').forEach(element => {
      if (element.matches('div.fbb737a4')) {
        // User message
        conversation.push({
          role: 'user',
          content: element.textContent.trim()
        });
      } else if (element.matches('div.ds-markdown.ds-markdown--block')) {
        // Assistant message (reply)
        conversation.push({
          role: 'assistant',
          content: element.textContent.trim()
        });
      }
    });

    if (conversation.length === 0) {
      throw new Error('No conversation found on DeepSeek');
    }

    return conversation;
  } catch (error) {
    console.error('Error scraping DeepSeek:', error);
    throw new Error('Failed to scrape conversation from DeepSeek');
  }
}

async function injectToDeepSeek(formattedConversation) {
  try {
    // Wait for the input area to be available
    const textarea = await waitForElement('textarea.chat-input');
    
    // Focus and set the value
    textarea.focus();
    
    // Use the proper way to set value and trigger React's change event
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set;
    
    nativeTextAreaValueSetter.call(textarea, formattedConversation);
    
    // Dispatch events to ensure React picks up the change
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Submit the form - for DeepSeek, find the send button
    const submitButton = document.querySelector('button.send-button');
    
    if (submitButton) {
      submitButton.click();
    } else {
      throw new Error('Submit button not found');
    }
    
    return true;
  } catch (error) {
    console.error('Error injecting to DeepSeek:', error);
    throw new Error('Failed to inject conversation to DeepSeek');
  }
}

// Claude AI specific functions
async function scrapeClaudeAI() {
  try {
    // Wait for at least one user or assistant message to appear
    await waitForElement('div[data-testid="user-message"], div.font-claude-message');

    const conversation = [];
    // Get the parent container that holds all messages (adjust selector if needed)
    const parent = document.querySelector('[data-test-render-count]')?.parentElement || document.body;

    // Walk through all children and extract messages in order
    parent.querySelectorAll('div[data-testid="user-message"], div.font-claude-message').forEach(element => {
      if (element.matches('div[data-testid="user-message"]')) {
        // User message
        const p = element.querySelector('p.font-user-message');
        if (p) {
          conversation.push({
            role: 'user',
            content: p.textContent.trim()
          });
        }
      } else if (element.matches('div.font-claude-message')) {
        // Assistant message
        let content = '';
        element.querySelectorAll('p, ul').forEach(child => {
          content += child.textContent.trim() + '\\n';
        });
        conversation.push({
          role: 'assistant',
          content: content.trim()
        });
      }
    });

    if (conversation.length === 0) {
      throw new Error('No conversation found on Claude AI');
    }

    return conversation;
  } catch (error) {
    console.error('Error scraping Claude:', error);
    throw new Error('Failed to scrape conversation from Claude AI');
  }
}

async function injectToClaudeAI(formattedConversation) {
  try {
    // Implementation for Claude AI injection
    // This would need to be customized based on Claude's DOM structure and input methods
    
    // Example implementation - would need to be adjusted for actual Claude UI
    const textarea = await waitForElement('textarea.chat-input');
    
    // Focus and set the value
    textarea.focus();
    
    // Use the proper way to set value
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set;
    
    nativeTextAreaValueSetter.call(textarea, formattedConversation);
    
    // Dispatch events
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Find and click the submit button
    const submitButton = document.querySelector('button.send-button');
    
    if (submitButton) {
      submitButton.click();
    } else {
      throw new Error('Submit button not found');
    }
    
    return true;
  } catch (error) {
    console.error('Error injecting to Claude:', error);
    throw new Error('Failed to inject conversation to Claude AI');
  }
}

// Gemini specific functions
async function scrapeGemini() {
  try {
    // Wait for at least one message or user query to appear
    await waitForElement('div.user-query-container, p[data-sourcepos], div.code-block');

    const conversation = [];
    // Find the parent container that holds all messages (adjust if needed)
    const parent = document.body;

    // Collect all relevant elements in DOM order
    const elements = parent.querySelectorAll('div.user-query-container, p[data-sourcepos], div.code-block');
    let lastRole = null;
    let lastContent = '';

    elements.forEach(element => {
      if (element.matches('div.user-query-container')) {
        // User query
        const userText = element.textContent.trim();
        if (lastRole && lastContent) {
          conversation.push({ role: lastRole, content: lastContent.trim() });
        }
        lastRole = 'user';
        lastContent = userText;
      } else if (element.matches('p[data-sourcepos]')) {
        // Assistant message
        if (lastRole === 'assistant' && lastContent) {
          conversation.push({ role: lastRole, content: lastContent.trim() });
        }
        if (lastRole === 'user' && lastContent) {
          conversation.push({ role: lastRole, content: lastContent.trim() });
        }
        lastRole = 'assistant';
        lastContent = element.textContent.trim();
      } else if (element.matches('div.code-block')) {
        // Code block, always part of assistant reply
        if (lastRole !== 'assistant') {
          if (lastRole && lastContent) {
            conversation.push({ role: lastRole, content: lastContent.trim() });
          }
          lastRole = 'assistant';
          lastContent = '';
        }
        lastContent += '\n' + element.textContent.trim();
      }
    });
    // Push the last message
    if (lastRole && lastContent) {
      conversation.push({ role: lastRole, content: lastContent.trim() });
    }
    if (conversation.length === 0) {
      throw new Error('No conversation found on Gemini');
    }
    return conversation;
  } catch (error) {
    console.error('Error scraping Gemini:', error);
    throw new Error('Failed to scrape conversation from Gemini');
  }
}

async function injectToGemini(formattedConversation) {
  // Implementation would be similar to other models but customized for Gemini's DOM structure
  try {
    // Placeholder implementation
    return true; // Would need to be implemented based on Gemini's actual UI
  } catch (error) {
    console.error('Error injecting to Gemini:', error);
    throw new Error('Failed to inject conversation to Gemini');
  }
}

// Poe specific functions
async function scrapePoe() {
  try {
    // Wait for at least one user or assistant message to appear
    await waitForElement('div.Message_selectableText__SQ8WH, div.Message_row__ug_UU');

    const conversation = [];
    // Find the parent container that holds all messages (adjust if needed)
    const parent = document.body;

    // Collect all relevant elements in DOM order
    const elements = parent.querySelectorAll('div.Message_selectableText__SQ8WH, div.Message_row__ug_UU');
    elements.forEach(element => {
      if (element.matches('div.Message_selectableText__SQ8WH')) {
        // User message
        const p = element.querySelector('div.Markdown_markdownContainer__Tz3HQ > div[class^="Prose_prose_"] > p');
        if (p) {
          conversation.push({
            role: 'user',
            content: p.textContent.trim()
          });
        }
      } else if (element.matches('div.Message_row__ug_UU')) {
        // Assistant message (if not a user message)
        // Only add if it does not contain a user message
        if (!element.querySelector('div.Message_selectableText__SQ8WH')) {
          const p = element.querySelector('p');
          if (p) {
            conversation.push({
              role: 'assistant',
              content: p.textContent.trim()
            });
          }
        }
      }
    });
    if (conversation.length === 0) {
      throw new Error('No conversation found on Poe');
    }
    return conversation;
  } catch (error) {
    console.error('Error scraping Poe:', error);
    throw new Error('Failed to scrape conversation from Poe');
  }
}

async function injectToPoe(formattedConversation) {
  // Implementation would be similar to other models but customized for Poe's DOM structure
  try {
    // Placeholder implementation
    return true; // Would need to be implemented based on Poe's actual UI
  } catch (error) {
    console.error('Error injecting to Poe:', error);
    throw new Error('Failed to inject conversation to Poe');
  }
}

// Helper function to clean content HTML
function cleanContent(html) {
  // Remove any unwanted elements or attributes
  // This could be customized based on specific needs
  return html
    .replace(/<button[^>]*>.*?<\/button>/g, '') // Remove buttons
    .replace(/<svg[^>]*>.*?<\/svg>/g, '') // Remove SVGs
    .trim();
}

// Helper function to wait for an element to appear in the DOM
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    
    if (element) {
      return resolve(element);
    }
    
    const observer = new MutationObserver((mutations) => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Set timeout to avoid waiting forever
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for element: ${selector}`));
    }, timeout);
  });
}