// Define supported models and their URLs
const SUPPORTED_MODELS = {
  chatgpt: {
    name: 'ChatGPT',
    url: 'chatgpt.com',
    baseUrl: 'https://chatgpt.com/'
  },
  deepseek: {
    name: 'DeepSeek',
    url: 'chat.deepseek.com',
    baseUrl: 'https://chat.deepseek.com/'
  },
  claude: {
    name: 'Claude',
    url: 'claude.ai',
    baseUrl: 'https://claude.ai/chat'
  },
  gemini: {
    name: 'Gemini',
    url: 'gemini.google.com',
    baseUrl: 'https://gemini.google.com/app'
  },
  poe: {
    name: 'Poe',
    url: 'poe.com',
    baseUrl: 'https://poe.com/'
  }
};

/**
 * Get the URL for a given model
 * @param {string} model - The model identifier
 * @returns {string} The base URL for the model
 */
export function getModelUrl(model) {
  const modelInfo = SUPPORTED_MODELS[model];
  return modelInfo ? modelInfo.baseUrl : null;
}

/**
 * Get the name for a given model
 * @param {string} model - The model identifier
 * @returns {string} The display name for the model
 */
export function getModelName(model) {
  const modelInfo = SUPPORTED_MODELS[model];
  return modelInfo ? modelInfo.name : model;
}

/**
 * Get all supported models
 * @returns {Object} Object containing all supported models
 */
export function getSupportedModels() {
  return SUPPORTED_MODELS;
}

/**
 * Check if a model is supported
 * @param {string} model - The model identifier
 * @returns {boolean} Whether the model is supported
 */
export function isModelSupported(model) {
  return Object.keys(SUPPORTED_MODELS).includes(model);
}

/**
 * Check if a URL belongs to a supported model
 * @param {string} url - The URL to check
 * @returns {string|null} The model identifier if supported, null otherwise
 */
export function getModelFromUrl(url) {
  for (const [modelId, modelInfo] of Object.entries(SUPPORTED_MODELS)) {
    if (url.includes(modelInfo.url)) {
      return modelId;
    }
  }
  return null;
}