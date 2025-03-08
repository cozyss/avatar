/**
 * Utility functions for handling image URLs and loading
 */

/**
 * Validates if a string is a properly formatted image URL
 */
export function validateImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  try {
    // Check if it's a valid URL
    const parsedUrl = new URL(url);
    
    // Check if it uses https protocol
    if (parsedUrl.protocol !== 'https:') {
      console.warn('Image URL does not use HTTPS protocol:', url);
      return false;
    }
    
    // Check if it's from a known image domain (Replicate)
    if (!parsedUrl.hostname.includes('replicate.delivery')) {
      console.warn('Image URL is not from a known domain:', url);
      // Still return true as it might be a valid URL from another domain
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Invalid image URL format:', url, error);
    return false;
  }
}

/**
 * Normalizes an image URL to ensure consistent handling
 */
export function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  try {
    // Parse the URL
    const parsedUrl = new URL(url);
    
    // Ensure HTTPS protocol
    if (parsedUrl.protocol !== 'https:') {
      parsedUrl.protocol = 'https:';
    }
    
    return parsedUrl.toString();
  } catch (error) {
    console.error('Failed to normalize image URL:', url, error);
    return url; // Return the original URL if normalization fails
  }
}

/**
 * Checks if an image is accessible by performing a HEAD request
 * Note: This may trigger CORS issues when called from the browser
 * It's best used in a server-side context or through a proxy
 */
export async function isImageAccessible(url: string | null | undefined): Promise<boolean> {
  if (!url) return false;
  
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      cache: 'no-cache',
      headers: {
        'Accept': 'image/*'
      }
    });
    
    if (!response.ok) {
      console.warn(`Image not accessible (${response.status}):`, url);
      return false;
    }
    
    // Check if the content type is an image
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.startsWith('image/')) {
      console.warn(`URL does not point to an image (${contentType}):`, url);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking image accessibility:', url, error);
    return false;
  }
}

/**
 * Loads an image with retry logic and exponential backoff
 * @returns A promise that resolves when the image is loaded or rejects after all retries fail
 */
export function loadImageWithRetry(
  url: string, 
  maxRetries = 3, 
  initialDelay = 1000
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    let retries = 0;
    let delay = initialDelay;
    
    const attemptLoad = () => {
      const img = new Image();
      
      img.onload = () => {
        resolve(img);
      };
      
      img.onerror = (error) => {
        if (retries < maxRetries) {
          retries++;
          console.log(`Retry ${retries}/${maxRetries} loading image: ${url} (waiting ${delay}ms)`);
          setTimeout(attemptLoad, delay);
          // Exponential backoff
          delay *= 2;
        } else {
          console.error(`Failed to load image after ${maxRetries} retries:`, url, error);
          reject(new Error(`Failed to load image after ${maxRetries} retries`));
        }
      };
      
      img.src = url;
    };
    
    attemptLoad();
  });
}

/**
 * Checks if a URL is likely from a temporary/expiring service
 */
export function isLikelyTemporaryUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  try {
    const parsedUrl = new URL(url);
    
    // Replicate delivery URLs are temporary and expire after some time
    if (parsedUrl.hostname.includes('replicate.delivery')) {
      return true;
    }
    
    // Add other known temporary URL services here if needed
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Extracts detailed error information from an image loading error
 */
export function getImageErrorDetails(
  event: React.SyntheticEvent<HTMLImageElement, Event>
): { message: string; type: string } {
  const target = event.target as HTMLImageElement;
  
  // Try to determine the type of error
  if (!target.src) {
    return { message: 'No image source provided', type: 'missing_src' };
  }
  
  // Check if the image URL is from Replicate
  try {
    const url = new URL(target.src);
    
    if (url.hostname.includes('replicate.delivery')) {
      return { 
        message: 'Failed to load Replicate image. The image might still be processing or is no longer available.',
        type: 'replicate_delivery_error'
      };
    }
    
    // Check for other common issues
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return {
        message: 'Invalid image URL protocol',
        type: 'invalid_protocol'
      };
    }
  } catch (error) {
    return {
      message: 'Invalid image URL format',
      type: 'invalid_url_format'
    };
  }
  
  // Default error message
  return { 
    message: 'Failed to load image. Please try again.',
    type: 'unknown_error'
  };
}
