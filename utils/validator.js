import { isModelSupported } from './models.js';

/**
 * Validate the source and destination selections
 * @param {string} source - The source model
 * @param {string} destination - The destination model
 * @returns {Object} Validation result with valid flag and optional error message
 */
export function validateSelections(source, destination) {
  // Check if source is selected
  if (!source) {
    return {
      valid: false,
      error: 'Please select a source model'
    };
  }
  
  // Check if destination is selected
  if (!destination) {
    return {
      valid: false,
      error: 'Please select a destination model'
    };
  }
  
  // Check if source is supported
  if (!isModelSupported(source)) {
    return {
      valid: false,
      error: `Source model "${source}" is not supported`
    };
  }
  
  // Check if destination is supported
  if (!isModelSupported(destination)) {
    return {
      valid: false,
      error: `Destination model "${destination}" is not supported`
    };
  }
  
  // Check if source and destination are the same
  if (source === destination) {
    return {
      valid: false,
      error: 'Source and destination cannot be the same'
    };
  }
  
  // All checks passed
  return {
    valid: true
  };
}

/**
 * Validate a conversation object
 * @param {Array} conversation - The conversation to validate
 * @returns {Object} Validation result with valid flag and optional error message
 */
export function validateConversation(conversation) {
  // Check if conversation exists
  if (!conversation) {
    return {
      valid: false,
      error: 'No conversation data provided'
    };
  }
  
  // Check if conversation is an array
  if (!Array.isArray(conversation)) {
    return {
      valid: false,
      error: 'Conversation data must be an array'
    };
  }
  
  // Check if conversation has messages
  if (conversation.length === 0) {
    return {
      valid: false,
      error: 'Conversation is empty'
    };
  }
  
  // Check each message in the conversation
  for (let i = 0; i < conversation.length; i++) {
    const message = conversation[i];
    
    // Check if message has required properties
    if (!message.role || !message.content) {
      return {
        valid: false,
        error: `Message at index ${i} is missing required properties`
      };
    }
    
    // Check if role is valid
    if (message.role !== 'user' && message.role !== 'assistant') {
      return {
        valid: false,
        error: `Invalid role "${message.role}" at message index ${i}`
      };
    }
  }
  
  // All checks passed
  return {
    valid: true
  };
}