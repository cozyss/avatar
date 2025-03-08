"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { AvatarImage } from "@/components/avatar/AvatarImage";
import { validateImageUrl, normalizeImageUrl, isLikelyTemporaryUrl } from "@/lib/client/imageUtils";

interface AvatarResultDisplayProps {
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
  gameStyle: string | null;
  onReset: () => void;
  onRegenerateImage: () => void;
}

export function AvatarResultDisplay({
  imageUrl,
  isLoading,
  error,
  gameStyle,
  onReset,
  onRegenerateImage,
}: AvatarResultDisplayProps) {
  const [validatedImageUrl, setValidatedImageUrl] = useState<string | null>(null);
  const [imageValidationError, setImageValidationError] = useState<string | null>(null);
  const [isTemporaryUrl, setIsTemporaryUrl] = useState(false);
  const [imageLoadError, setImageLoadError] = useState<{type: string; message: string} | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);

  // Validate the image URL when it changes
  useEffect(() => {
    // Reset validation states
    setValidatedImageUrl(null);
    setImageValidationError(null);
    setIsTemporaryUrl(false);
    setImageLoadError(null);
    
    // Skip validation if no URL or still loading
    if (!imageUrl || isLoading) return;
    
    console.log("Validating image URL in AvatarResultDisplay:", imageUrl);
    
    // Check if the URL is valid
    if (!validateImageUrl(imageUrl)) {
      console.error("Invalid image URL format in AvatarResultDisplay:", imageUrl);
      setImageValidationError("The generated image URL is not properly formatted");
      return;
    }
    
    // Normalize the URL
    const normalized = normalizeImageUrl(imageUrl);
    console.log("Normalized image URL in AvatarResultDisplay:", normalized);
    
    // Check if it's a temporary URL
    if (normalized && isLikelyTemporaryUrl(normalized)) {
      console.log("Detected temporary URL in AvatarResultDisplay:", normalized);
      setIsTemporaryUrl(true);
    }
    
    setValidatedImageUrl(normalized);
  }, [imageUrl, isLoading]);

  // Handle image loading errors
  const handleImageLoadError = useCallback((errorType: string, errorMessage: string) => {
    console.error("Image load error in AvatarResultDisplay:", errorType, errorMessage);
    setImageLoadError({ type: errorType, message: errorMessage });
    
    if (errorType === 'replicate_delivery_error') {
      toast.error("The image is no longer available. Please regenerate it.");
    } else {
      toast.error("Failed to load image. Please try again.");
    }
  }, []);

  // Handle retrying image load without regenerating
  const handleRetryImageLoad = useCallback(() => {
    console.log("Retrying image load...");
    setImageLoadError(null);
    setRetryCounter(prev => prev + 1);
    
    // Force a re-render of the AvatarImage component by temporarily clearing and resetting the URL
    setValidatedImageUrl(null);
    setTimeout(() => {
      if (imageUrl) {
        const normalized = normalizeImageUrl(imageUrl);
        setValidatedImageUrl(normalized);
      }
    }, 100);
  }, [imageUrl]);

  // Format the game style for display
  const formattedGameStyle = gameStyle || "Custom";

  // Create a dynamic loading message based on the game style
  const loadingMessage = (() => {
    if (gameStyle) {
      return `Creating your ${gameStyle} avatar... This may take up to a minute.`;
    } else {
      return "Creating your custom avatar... This may take up to a minute.";
    }
  })();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-lg font-semibold text-gray-800">Your Custom Avatar</h3>

      {/* Game Style Display */}
      {gameStyle && !isLoading && imageUrl && (
        <div className="mb-3 flex flex-wrap gap-2">
          {gameStyle && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              Style: {formattedGameStyle}
            </span>
          )}
        </div>
      )}

      <div className="mb-4">
        {/* API Error Display */}
        {error && !isLoading && !imageUrl && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            <p>Error: {error}</p>
            <button
              onClick={onRegenerateImage}
              className="mt-2 text-red-700 underline hover:text-red-800"
            >
              Try Again
            </button>
          </div>
        )}
        
        {/* Image URL Validation Error Display */}
        {imageValidationError && !isLoading && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            <p>Error: {imageValidationError}</p>
            <button
              onClick={onRegenerateImage}
              className="mt-2 text-red-700 underline hover:text-red-800"
            >
              Regenerate Image
            </button>
          </div>
        )}
        
        {/* Image Load Error Display */}
        {imageLoadError && !isLoading && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            <p>
              <strong>Image Load Error:</strong> {imageLoadError.message}
            </p>
            <div className="mt-2 flex space-x-3">
              <button
                onClick={handleRetryImageLoad}
                className="text-red-700 underline hover:text-red-800"
              >
                Retry Loading
              </button>
              <button
                onClick={onRegenerateImage}
                className="text-red-700 underline hover:text-red-800"
              >
                Regenerate Image
              </button>
            </div>
          </div>
        )}
        
        {/* Temporary URL Warning */}
        {isTemporaryUrl && validatedImageUrl && !isLoading && !imageLoadError && (
          <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
            <div className="flex items-start">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="mr-2 h-5 w-5 flex-shrink-0 text-yellow-600" 
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
              <p>
                <strong>Note:</strong> This image is temporary and may expire after some time. 
                If you want to keep it, please download it using the button below.
              </p>
            </div>
          </div>
        )}

        {/* Avatar Image Component */}
        <AvatarImage
          imageUrl={validatedImageUrl || ""}
          alt={`Generated ${formattedGameStyle} avatar`}
          isLoading={isLoading}
          key={`avatar-image-${retryCounter}`} // Force re-render on retry
          onError={handleImageLoadError}
        />

        {/* Loading Message */}
        {isLoading && (
          <p className="mt-2 text-center text-sm text-gray-600">
            {loadingMessage}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {/* Regenerate Button */}
        {imageUrl && !isLoading && (
          <button
            onClick={onRegenerateImage}
            disabled={isLoading}
            className="flex items-center justify-center rounded-md bg-purple-600 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:bg-purple-400 sm:flex-1"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Regenerate Image
          </button>
        )}

        {/* Generate Another Button */}
        <button
          onClick={onReset}
          className="rounded-md border border-gray-300 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:flex-1"
        >
          Generate Another
        </button>
      </div>

      {/* Help Text */}
      {imageUrl && !isLoading && (
        <p className="mt-4 text-xs text-gray-500">
          {gameStyle ? (
            `This is your custom ${formattedGameStyle} avatar based on your description.`
          ) : (
            "This is your custom avatar based on your description."
          )}
          {" "}Click "Generate Another" to create a new one with different settings.
        </p>
      )}
    </div>
  );
}