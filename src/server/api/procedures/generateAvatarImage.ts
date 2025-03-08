import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { procedure } from "@/server/api/trpc";
import { env } from "@/env";
// Add import for Replicate client
import Replicate from "replicate";

export const generateAvatarImage = procedure
  .input(z.object({ prompt: z.string() }))
  .mutation(async ({ input }) => {
    try {
      console.log("Starting avatar image generation with prompt:", input.prompt);
      
      // Validate that the API token is configured
      if (!env.REPLICATE_API_TOKEN) {
        console.error("Replicate API token is not configured");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Image generation service is not properly configured",
        });
      }
      
      // Initialize the Replicate client with API token
      const replicate = new Replicate({
        auth: env.REPLICATE_API_TOKEN,
      });

      // Log the input parameters for debugging
      console.log("Replicate API input parameters:", {
        model: "black-forest-labs/flux-schnell",
        prompt: input.prompt,
        go_fast: true,
        num_outputs: 1,
        aspect_ratio: "1:1",
        negative_prompt: "ugly, disfigured, low quality, blurry, nsfw",
      });

      // Run the model using the client library with a timeout
      console.log("Calling Replicate API with model: black-forest-labs/flux-schnell");
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Replicate API call timed out after 60 seconds")), 60000);
      });
      
      // Race the API call against the timeout
      const output = await Promise.race([
        replicate.run(
          "black-forest-labs/flux-schnell",
          {
            input: {
              prompt: input.prompt,
              go_fast: true,
              num_outputs: 1,
              aspect_ratio: "1:1",
              negative_prompt: "ugly, disfigured, low quality, blurry, nsfw",
            },
          }
        ),
        timeoutPromise
      ]);

      // Log the complete output for debugging
      console.log("Replicate API response type:", typeof output);
      console.log("Replicate API response structure:", JSON.stringify(output));

      // The output is an array of image URLs, we take the first one
      if (Array.isArray(output) && output.length > 0) {
        const imageUrl = output[0];
        
        // Validate the image URL
        if (!imageUrl || typeof imageUrl !== 'string') {
          console.error("Invalid image URL format received from Replicate:", imageUrl);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Received invalid image URL from generation service",
          });
        }
        
        // Validate that the URL is from the expected domain
        try {
          const url = new URL(imageUrl);
          if (!url.hostname.includes('replicate.delivery')) {
            console.warn("Image URL is not from expected domain:", url.hostname);
            console.warn("Full image URL:", imageUrl);
          }
          
          // Log the URL components for debugging
          console.log("Image URL components:", {
            protocol: url.protocol,
            hostname: url.hostname,
            pathname: url.pathname,
            search: url.search
          });
        } catch (error) {
          console.error("Failed to parse image URL:", imageUrl, error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Generated image URL is not properly formatted",
          });
        }
        
        console.log("Successfully generated avatar image URL:", imageUrl);
        return { imageUrl };
      } else {
        console.error("Empty or non-array output from Replicate:", output);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Image generation succeeded but no output was returned",
        });
      }
    } catch (error) {
      // Log the full error for debugging
      console.error("Error generating avatar image:", error);

      // Handle different types of errors
      if (error instanceof TRPCError) {
        throw error;
      }
      
      // Check for timeout errors
      if (error.message && error.message.includes("timed out")) {
        console.error("Replicate API call timed out");
        throw new TRPCError({
          code: "TIMEOUT",
          message: "Image generation timed out. Please try again later.",
        });
      }
      
      // Check for network errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message?.includes('network')) {
        console.error("Network error connecting to Replicate API:", error.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not connect to image generation service. Please check your internet connection and try again.",
        });
      }
      
      // Check for Replicate API specific errors
      if (error.response && error.response.status) {
        const status = error.response.status;
        const message = error.response.data?.detail || error.message;
        
        if (status === 401) {
          console.error("Authentication error with Replicate API:", message);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Failed to authenticate with image generation service. Please check your API credentials.",
          });
        } else if (status === 402) {
          console.error("Payment required error with Replicate API:", message);
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Image generation service requires payment. Please check your account status.",
          });
        } else if (status === 429) {
          console.error("Rate limit exceeded with Replicate API:", message);
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Image generation rate limit exceeded. Please try again in a few minutes.",
          });
        } else if (status >= 500) {
          console.error("Replicate API server error:", status, message);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Image generation service is currently experiencing issues. Please try again later.",
          });
        }
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error 
          ? `Error during image generation: ${error.message}` 
          : "Unknown error occurred during image generation",
      });
    }
  });
