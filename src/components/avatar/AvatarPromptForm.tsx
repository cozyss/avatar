"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { useAvatarDescription } from "@/lib/client/avatarClient";

// Art style options
const ART_STYLES = [
  { value: "pixel-art", label: "Pixel Art" },
  { value: "realistic", label: "Realistic" },
  { value: "cartoonish", label: "Cartoonish" },
  { value: "anime", label: "Anime" },
];

// Define the form schema using Zod
const formSchema = z.object({
  description: z
    .string()
    .min(20, "Description should be at least 20 characters")
    .max(500, "Description should not exceed 500 characters"),
  artStyle: z.string().min(1, "Please select an art style"),
  gameName: z.string().min(1, "Game name is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface AvatarPromptFormProps {
  onStartImageGeneration: (prompt: string, gameStyle: string) => void;
}

export function AvatarPromptForm({ onStartImageGeneration }: AvatarPromptFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Use the new hook for avatar description generation
  const { generateDescription, isLoading: isDescriptionLoading } = useAvatarDescription();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      artStyle: "",
      gameName: "",
    },
  });

  // Watch form fields for conditional rendering
  const description = watch("description");
  const artStyle = watch("artStyle");
  const gameName = watch("gameName");
  const characterCount = description.length;

  // Determine character count color based on length
  const getCharCountColorClass = () => {
    if (characterCount >= 400) return "text-orange-500";
    if (characterCount >= 450) return "text-red-500";
    return "text-gray-500";
  };

  const onSubmit = async (data: FormValues) => {
    try {
      // Clear any previous errors
      setErrorMessage(null);
      setIsGenerating(true);

      console.log("Starting avatar generation process");

      // Determine the final art style value
      const finalArtStyle = ART_STYLES.find(style => style.value === data.artStyle)?.label || data.artStyle;

      // Combine art style with game name
      const styleContext = `${finalArtStyle} style from ${data.gameName}`;

      // Get the avatar description from Claude using the new function
      console.log("Requesting avatar description from Claude via tRPC");
      let avatarDescription;

      try {
        avatarDescription = await generateDescription(
          data.description,
          styleContext
        );
        console.log("Claude description received successfully");
      } catch (claudeError) {
        console.error("Error from Claude API:", claudeError);
        throw new Error(`Claude API error: ${claudeError instanceof Error ? claudeError.message : 'Unknown error'}`);
      }

      // Create a prompt for image generation that includes Claude's description
      const imagePrompt = `${avatarDescription}

Style Guidelines:
- Use a ${finalArtStyle} art style inspired by ${data.gameName}
- Use colors and design elements appropriate for the art style
- Include subtle shading and highlights
- Keep the design cohesive and recognizable`;

      // Call the callback with the generated prompt and style information
      const displayStyle = `${finalArtStyle} (${data.gameName})`;
      onStartImageGeneration(imagePrompt, displayStyle);

      // Show success toast
      toast.success(`Creating your ${finalArtStyle} avatar...`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error generating prompt:", error);
      setErrorMessage(errorMsg);
      toast.error(`Failed to generate avatar: ${errorMsg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setErrorMessage(null);
    reset();
  };

  // Determine if the form is in a loading/submitting state
  const isFormDisabled = isGenerating || isDescriptionLoading;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Personal Description Field */}
      <div>
        <label
          htmlFor="description"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Personal Description
        </label>
        <textarea
          id="description"
          rows={4}
          placeholder="Example: I'm an energetic and creative person who loves solving problems. I have a calm demeanor but can be quite competitive when playing sports. I enjoy nature and have a knack for helping others..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          {...register("description")}
          disabled={isFormDisabled}
          aria-invalid={errors.description ? "true" : "false"}
          aria-describedby="description-error"
        />
        <div className="mt-1 flex justify-between">
          <div>
            {errors.description && (
              <p id="description-error" className="text-sm text-red-600" role="alert">
                {errors.description.message}
              </p>
            )}
          </div>
          <div className={`text-sm ${getCharCountColorClass()}`}>
            {characterCount}/500 characters
          </div>
        </div>
      </div>

      {/* Art Style and Game Name Selection */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="artStyle"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Art Style
          </label>
          <select
            id="artStyle"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            {...register("artStyle")}
            disabled={isFormDisabled}
            aria-invalid={errors.artStyle ? "true" : "false"}
            aria-describedby="artStyle-error"
          >
            <option value="">Select an art style</option>
            {ART_STYLES.map((style) => (
              <option key={style.value} value={style.value}>
                {style.label}
              </option>
            ))}
          </select>
          {errors.artStyle && (
            <p id="artStyle-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.artStyle.message}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Choose the visual style for your avatar.
          </p>
        </div>

        {/* Game Name Input */}
        <div>
          <label
            htmlFor="gameName"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Game Name
          </label>
          <input
            type="text"
            id="gameName"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="E.g., Minecraft, Final Fantasy, etc."
            {...register("gameName")}
            disabled={isFormDisabled}
            aria-invalid={errors.gameName ? "true" : "false"}
            aria-describedby="gameName-error"
          />
          {errors.gameName && (
            <p id="gameName-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.gameName.message}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Specify a game to influence the art style.
          </p>
        </div>
      </div>

      {/* Error Message Display */}
      {errorMessage && (
        <div className="rounded-md bg-red-50 p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Details</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{errorMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Buttons */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isFormDisabled}
          className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-400"
          aria-busy={isFormDisabled}
        >
          {isFormDisabled ? "Creating your avatar..." : "Generate your Avatar"}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={isFormDisabled || (characterCount === 0 && !artStyle && !gameName)}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
        >
          Clear
        </button>
      </div>
    </form>
  );
}