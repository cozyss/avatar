import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { procedure } from "@/server/api/trpc";
import { env } from "@/env";

export const generateAvatarDescription = procedure
  .input(
    z.object({
      description: z.string().min(1, "Description is required"),
      gameStyle: z.string().min(1, "Game style is required"),
    })
  )
  .mutation(async ({ input }) => {
    try {
      console.log("Starting avatar description generation with Claude");
      console.log("Parameters:", input);

      // Create the prompt for Claude
      const prompt = `
Create a prompt for generating an avatar in the style of ${input.gameStyle} based on this user description: ${input.description}. Just return the final prompt itself with no other text.

Template: "Create a detailed ${input.gameStyle}-style avatar based on this description: ${input.description}. The character should have [specific features based on the description]. The art style should match ${input.gameStyle} with [appropriate style-specific guidance]. Include details about clothing, accessories, pose, expression, and background elements that would be appropriate for this game world."

Make sure the prompt is specific, detailed, and tailored to the game style while incorporating elements from the user's personal description. Focus on visual elements that can be represented in an image.`;

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Anthropic API call timed out after 30 seconds")), 30000);
      });

      // Make the API request to Anthropic Claude with a timeout
      const responsePromise = fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-7-sonnet-latest",
          max_tokens: 500,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      // Race the API call against the timeout
      const response = await Promise.race([responsePromise, timeoutPromise]) as Response;

      // Handle error responses
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Anthropic API error (${response.status}):`, errorText);
        
        // Handle specific error codes
        if (response.status === 401) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication failed with the AI service",
          });
        } else if (response.status === 402) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "AI service requires payment. Please check your account status.",
          });
        } else if (response.status === 429) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Rate limit exceeded for the AI service. Please try again later.",
          });
        } else if (response.status >= 500) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "The AI service is currently experiencing issues. Please try again later.",
          });
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `AI service error: ${response.status}`,
        });
      }

      // Process successful response
      const result = await response.json();

      if (!result.content?.[0]?.text) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invalid response from AI service",
        });
      }

      // Return only the generated description
      return { description: result.content[0].text };
    } catch (error) {
      console.error("Error in generateAvatarDescription:", error);
      
      // Check for timeout errors
      if (error.message && error.message.includes("timed out")) {
        console.error("Anthropic API call timed out");
        throw new TRPCError({
          code: "TIMEOUT",
          message: "AI service request timed out. Please try again later.",
        });
      }
      
      // Check for network errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message?.includes('network')) {
        console.error("Network error connecting to Anthropic API:", error.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not connect to AI service. Please check your internet connection and try again.",
        });
      }
      
      // If it's already a TRPCError, just rethrow it
      if (error instanceof TRPCError) {
        throw error;
      }
      
      // Otherwise, wrap it in a TRPCError
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });