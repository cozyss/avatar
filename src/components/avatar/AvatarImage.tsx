"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { 
  validateImageUrl, 
  normalizeImageUrl, 
  loadImageWithRetry,
  getImageErrorDetails,
  isLikelyTemporaryUrl
} from "@/lib/client/imageUtils";

interface AvatarImageProps {
  imageUrl: string;
  alt: string;
  isLoading?: boolean;
  onError?: (errorType: string, errorMessage: string) => void;
}

export function AvatarImage({ 
  imageUrl, 
  alt, 
  isLoading = false,
  onError 
}: AvatarImageProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [normalizedUrl, setNormalizedUrl] = useState<string | null>(null);
  const [useFallbackImg, setUseFallbackImg] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorReportedRef = useRef(false);
  const maxRetries = 2;

  // Reset error reported flag when URL changes
  useEffect(() => {
    errorReportedRef.current = false;
  }, [imageUrl]);

  // Helper function to report errors to parent component
  const reportError = useCallback((type: string, message: string) => {
    // Only report the error once per image URL
    if (!errorReportedRef.current && onError) {
      console.log("Reporting error to parent component:", type, message);
      onError(type, message);
      errorReportedRef.current = true;
    }
  }, [onError]);

  // Validate and normalize the URL when it changes
  useEffect(() => {
    // Skip if no URL or loading state
    if (!imageUrl || imageUrl.trim() === '' || isLoading) {
      setNormalizedUrl(null);
      return;
    }

    // Log the original URL for debugging
    console.log("Original image URL:", imageUrl);
    
    // Validate the URL
    const isValid = validateImageUrl(imageUrl);
    if (!isValid) {
      console.error("Invalid image URL format:", imageUrl);
      setHasError(true);
      setErrorType("invalid_url");
      setErrorMessage("Invalid image URL format");
      reportError("invalid_url", "Invalid image URL format");
      return;
    }
    
    // Normalize the URL
    const normalized = normalizeImageUrl(imageUrl);
    console.log("Normalized image URL:", normalized);
    
    // Only update if the URL has changed to prevent unnecessary re-renders
    if (normalized !== normalizedUrl) {
      setNormalizedUrl(normalized);
      
      // Reset states when URL changes
      setIsImageLoaded(false);
      setHasError(false);
      setErrorType(null);
      setErrorMessage(null);
      setRetryCount(0);
      setLoadingTimeout(false);
      setUseFallbackImg(false);
    }
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Set a timeout for image loading
    if (normalized) {
      // Use a longer timeout for Replicate URLs
      const timeoutDuration = isLikelyTemporaryUrl(normalized) ? 20000 : 15000;
      
      timeoutRef.current = setTimeout(() => {
        if (!isImageLoaded && !hasError) {
          console.warn(`Image loading timeout after ${timeoutDuration/1000}s:`, normalized);
          setLoadingTimeout(true);
          
          // Report timeout error to parent
          reportError("timeout", "Image is taking too long to load. It might still be processing.");
          
          // Try fallback method after timeout
          setUseFallbackImg(true);
        }
      }, timeoutDuration);
    }
    
    // Cleanup timeout on unmount or URL change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [imageUrl, isLoading, normalizedUrl, isImageLoaded, hasError, reportError]);

  // Attempt to preload the image with retry logic
  useEffect(() => {
    if (!normalizedUrl || isImageLoaded || hasError || retryCount >= maxRetries) return;
    
    // Only attempt to preload if we're not already in an error state and haven't exceeded retries
    const preloadImage = async () => {
      try {
        // Check if it's a temporary URL that might need time to be ready
        if (isLikelyTemporaryUrl(normalizedUrl) && retryCount === 0) {
          console.log("Detected temporary URL, waiting before first load attempt:", normalizedUrl);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before first attempt
        }
        
        await loadImageWithRetry(normalizedUrl, 1, 2000); // Just 1 retry in preload phase
        console.log("Image preloaded successfully:", normalizedUrl);
      } catch (error) {
        console.warn("Image preload failed, will try again on render:", normalizedUrl, error);
        // Increment retry count but don't set error yet - let the Image component try
        setRetryCount(prev => prev + 1);
      }
    };
    
    preloadImage();
  }, [normalizedUrl, isImageLoaded, hasError, retryCount]);

  const handleImageLoad = () => {
    console.log("Image loaded successfully:", normalizedUrl);
    setIsImageLoaded(true);
    setHasError(false);
    setErrorType(null);
    setErrorMessage(null);
    setLoadingTimeout(false);
    
    // Clear timeout if it exists
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Get detailed error information
    const errorDetails = getImageErrorDetails(event);
    console.error("Image load error:", errorDetails.type, errorDetails.message, normalizedUrl);
    
    // If we haven't exceeded retry count, increment and try again
    if (retryCount < maxRetries) {
      console.log(`Retry ${retryCount + 1}/${maxRetries} for image:`, normalizedUrl);
      setRetryCount(prev => prev + 1);
      
      // Try fallback method after first retry
      if (retryCount === 0) {
        setUseFallbackImg(true);
      }
    } else {
      // Max retries exceeded, set error state
      setHasError(true);
      setErrorType(errorDetails.type);
      setErrorMessage(errorDetails.message);
      
      // Report the error to the parent component
      reportError(errorDetails.type, errorDetails.message);
      
      // Clear timeout if it exists
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  };

  const handleDownload = async () => {
    if (!normalizedUrl) {
      toast.error("No image available to download");
      return;
    }
    
    try {
      const response = await fetch(normalizedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "avatar-image.png";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Image downloaded successfully!");
    } catch (error) {
      console.error("Failed to download image:", error);
      toast.error("Failed to download image");
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="aspect-square w-full overflow-hidden rounded-md bg-gray-100">
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            <p className="text-sm text-gray-500">Generating your avatar...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render timeout state
  if (loadingTimeout && !isImageLoaded && !hasError) {
    return (
      <div className="aspect-square w-full overflow-hidden rounded-md bg-gray-100">
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center justify-center space-y-3 p-4 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-gray-700">Image is taking longer than expected to load...</p>
            <p className="text-xs text-gray-500">The image might still be processing. Please wait a moment.</p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (hasError) {
    return (
      <div className="aspect-square w-full overflow-hidden rounded-md bg-gray-100">
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center justify-center space-y-3 p-4 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm font-medium text-gray-700">Failed to load image</p>
            {errorType === 'replicate_delivery_error' && (
              <p className="text-xs text-gray-500">
                The image might still be processing or is no longer available. 
                Try regenerating the image.
              </p>
            )}
            {errorType !== 'replicate_delivery_error' && errorMessage && (
              <p className="text-xs text-gray-500">{errorMessage}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If we're using fallback img element instead of Next.js Image
  if (useFallbackImg && normalizedUrl) {
    return (
      <div className="space-y-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-md bg-gray-100">
          {!isImageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            </div>
          )}
          <div className="flex h-full w-full items-center justify-center">
            <img
              src={normalizedUrl}
              alt={alt}
              className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${
                isImageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ display: 'block', margin: '0 auto' }}
            />
          </div>
        </div>
        {isImageLoaded && (
          <button
            onClick={handleDownload}
            className="flex w-full items-center justify-center rounded-md bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-1 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download Image
          </button>
        )}
      </div>
    );
  }

  // Default render with Next.js Image
  return (
    <div className="space-y-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-gray-100">
        {!isImageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          </div>
        )}
        {normalizedUrl && (
          <Image
            src={normalizedUrl}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, 500px"
            className={`object-contain transition-opacity duration-300 ${
              isImageLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            priority
            unoptimized={isLikelyTemporaryUrl(normalizedUrl)} // Skip optimization for temporary URLs
          />
        )}
      </div>
      {isImageLoaded && (
        <button
          onClick={handleDownload}
          className="flex w-full items-center justify-center rounded-md bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mr-1 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download Image
        </button>
      )}
    </div>
  );
}
