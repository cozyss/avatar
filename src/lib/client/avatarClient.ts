import { api } from "@/trpc/react";

/**
 * Custom hook that returns a function to generate avatar descriptions using the tRPC procedure
 */
export function useAvatarDescription() {
  const mutation = api.generateAvatarDescription.useMutation();
  
  const generateDescription = async (
    userDescription: string,
    gameStyle: string
  ): Promise<string> => {
    try {
      console.log("Starting avatar description generation with Claude via tRPC");
      console.log("Parameters:", { userDescription, gameStyle });

      const result = await mutation.mutateAsync({
        description: userDescription,
        gameStyle: gameStyle
      });

      console.log("Successfully received response from tRPC procedure");

      if (!result.description) {
        console.error("Unexpected response structure:", result);
        throw new Error("Received invalid response structure from API");
      }

      return result.description;
    } catch (error) {
      console.error("Error generating avatar description:", error);
      // Rethrow with more specific error message
      throw new Error(`Failed to generate avatar description: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return {
    generateDescription,
    isLoading: mutation.isPending,
    error: mutation.error
  };
}

// Legacy function for backward compatibility
// This will be used until components are updated to use the hook directly
export async function generateAvatarDescription(
  userDescription: string,
  gameStyle: string
): Promise<string> {
  try {
    console.log("Starting avatar description generation with Claude");
    console.log("Parameters:", { userDescription, gameStyle });

    // Create a request to our own server endpoint that will handle the Claude API call
    const response = await fetch('/api/generate-avatar-description', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: userDescription,
        gameStyle: gameStyle
      })
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      // Get the error details
      const errorText = await response.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch (e) {
        errorDetails = errorText;
      }

      console.error("API error details:", errorDetails);
      throw new Error(`API error (${response.status}): ${JSON.stringify(errorDetails)}`);
    }

    const result = await response.json();
    console.log("Successfully received response from server");

    if (!result.description) {
      console.error("Unexpected response structure:", result);
      throw new Error("Received invalid response structure from API");
    }

    return result.description;

  } catch (error) {
    console.error("Error generating avatar description:", error);
    // Rethrow with more specific error message
    throw new Error(`Failed to generate avatar description: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}