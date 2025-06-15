import { translate } from '@vitalets/google-translate-api';

function normalizeLanguageCode(langCode) {
  const mapping = {
    'pt-br': 'pt',
    'pt-pt': 'pt',
    
    'en-us': 'en',
    'en-gb': 'en',
    'en-ca': 'en',
    'en-au': 'en',
    
    'es-es': 'es',
    'es-mx': 'es',
    'es-ar': 'es',
    
    'fr-fr': 'fr',
    'fr-ca': 'fr',
    
    'de-de': 'de',
    'de-at': 'de',
    'de-ch': 'de',
    
    'zh-cn': 'zh',
    'zh-tw': 'zh-tw',
    'zh-hk': 'zh-tw'
  };

  const normalized = langCode.toLowerCase();
  return mapping[normalized] || normalized.split('-')[0];
}

export async function translateText(text, sourceLang, targetLang) {
  try {

    if (typeof translate !== 'function') {
      throw new Error('Google Translate function not available');
    }

    const normalizedSource = normalizeLanguageCode(sourceLang);
    const normalizedTarget = normalizeLanguageCode(targetLang);

    const result = await translate(text, {
      from: normalizedSource,
      to: normalizedTarget
    });

    if (!result || !result.text) {
      throw new Error('Invalid translate response');
    }

    return result.text;

  } catch (error) {
    console.error('Translate error details:', error);
    
    if (error.message.includes('not available') || error.message.includes('not a function')) {
      throw new Error('Translate service initialization failed - check library installation');
    } else if (error.code === 'BAD_REQUEST') {
      throw new Error('Invalid translate request - check language codes');
    } else if (error.code === 'TOO_MANY_REQUESTS' || error.message.includes('TooManyRequestsError')) {
      throw new Error('Translate rate limit exceeded - please try again later');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
      throw new Error('Network error - translate service temporarily unavailable');
    }

    throw new Error(`Translate failed: ${error.message}`);
  }
}

export async function translateTextRobust(text, sourceLang, targetLang) {
  try {
    return await translateTextRetry(text, sourceLang, targetLang, 2);
  } catch (error) {
    console.warn(`Translate failed: ${error.message}`);
    console.log('Falling back to alternative translate method...');

    throw new Error(`Translate failed. Last error: ${error.message}`);
  }
}

export async function translateTextRetry(text, sourceLang, targetLang, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Retrying translate in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      return await translateText(text, sourceLang, targetLang);
      
    } catch (error) {
      lastError = error;
      
      if (error.message.includes('Invalid translate request') ||
          error.message.includes('check language codes') ||
          error.message.includes('initialization failed')) {
        throw error;
      }

      console.warn(`Translate attempt ${attempt} failed: ${error.message}`);

      if (attempt === maxRetries) {
        break;
      }
    }
  }

  throw new Error(`Translate failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
}



export default {
  translateText,
  translateTextRetry,
  translateTextRobust,
};