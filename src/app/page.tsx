"use client";

import { useState, useRef } from "react";
import { AvatarPromptForm } from "@/components/avatar/AvatarPromptForm";
import { AvatarResultDisplay } from "@/components/avatar/AvatarResultDisplay";
import { api } from "@/trpc/react";
import { useInView } from "react-intersection-observer";

export default function Home() {
  const [internalPrompt, setInternalPrompt] = useState<string | null>(null);
  const [gameStyle, setGameStyle] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showResultSection, setShowResultSection] = useState(false);

  // Refs for scrolling
  const resultSectionRef = useRef<HTMLDivElement>(null);
  const descriptionSectionRef = useRef<HTMLDivElement>(null);

  // Intersection observer hooks for animation triggers
  const [headerRef, headerInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [formRef, formInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [resultRef, resultInView] = useInView({
    triggerOnce: false,
    threshold: 0.1,
  });

  const generateAvatarImageMutation = api.generateAvatarImage.useMutation({
    onSuccess: (data) => {
      setImageUrl(data.imageUrl);
      // Scroll to the result section
      if (resultSectionRef.current) {
        resultSectionRef.current.scrollIntoView({ behavior: "smooth" });
      }
    },
    onError: (error) => {
      setImageError(error.message);
      // Still scroll to the result section to show the error
      if (resultSectionRef.current) {
        resultSectionRef.current.scrollIntoView({ behavior: "smooth" });
      }
    },
  });

  const handleStartImageGeneration = (prompt: string, style: string) => {
    setInternalPrompt(prompt);
    setGameStyle(style);
    setImageError(null);
    setShowResultSection(true);
    generateAvatarImageMutation.mutate({ prompt });
  };

  const handleRegenerateImage = () => {
    if (internalPrompt) {
      setImageError(null);
      generateAvatarImageMutation.mutate({ prompt: internalPrompt });
      // Scroll to the result section
      if (resultSectionRef.current) {
        resultSectionRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleReset = () => {
    setInternalPrompt(null);
    setGameStyle(null);
    setImageUrl(null);
    setImageError(null);
    setShowResultSection(false);
    // Scroll to the description section when resetting
    if (descriptionSectionRef.current) {
      descriptionSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Check if we're in a loading state for image generation
  const isGeneratingImage = generateAvatarImageMutation.isPending && generateAvatarImageMutation.isFetching;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 py-12 px-4 sm:px-6">
      {/* Decorative background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-pink-100 opacity-30 blur-3xl"></div>
        <div className="absolute top-1/4 -left-24 h-64 w-64 rounded-full bg-blue-100 opacity-30 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-purple-100 opacity-30 blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-indigo-100 opacity-30 blur-3xl"></div>
      </div>

      <div className="relative mx-auto max-w-4xl">
        {/* Header Section */}
        <div
          ref={headerRef}
          className={`mb-12 text-center transition-all duration-700 ${headerInView ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
        >
          <div className="mb-6 flex justify-center">
            <div className="relative inline-flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <div className="absolute inset-1 rounded-full bg-white"></div>
              <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>

              {/* Animated dots around the logo */}
              <div className="absolute top-0 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1 rounded-full bg-pink-400 animate-pulse motion-reduce:animate-none"></div>
              <div className="absolute top-1/4 right-0 h-2 w-2 translate-x-1 rounded-full bg-blue-400 animate-pulse motion-reduce:animate-none" style={{ animationDelay: "0.2s" }}></div>
              <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1 rounded-full bg-purple-400 animate-pulse motion-reduce:animate-none" style={{ animationDelay: "0.4s" }}></div>
              <div className="absolute top-1/4 left-0 h-2 w-2 -translate-x-1 rounded-full bg-indigo-400 animate-pulse motion-reduce:animate-none" style={{ animationDelay: "0.6s" }}></div>
            </div>
          </div>

          <h1 className="mb-4 bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 bg-clip-text text-5xl font-extrabold text-transparent sm:text-6xl">
            Avatar Generator
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-gray-700">
            Transform your self-description into a customized avatar in your favorite game style!
            Choose your game style and describe yourself to create a personalized avatar.
          </p>

          {/* Decorative divider */}
          <div className="mx-auto mt-6 flex w-24 justify-center space-x-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse motion-reduce:animate-none"
                style={{ animationDelay: `${i * 0.2}s` }}
              ></div>
            ))}
          </div>
        </div>

        {/* Description Input Section */}
        <div
          ref={(node) => {
            // Assign to both refs
            if (node) {
              descriptionSectionRef.current = node;
              formRef(node);
            }
          }}
          className={`relative mb-16 overflow-hidden rounded-2xl bg-white p-8 shadow-xl transition-all duration-500 ${formInView ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
        >
          {/* Decorative elements */}
          <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 opacity-50"></div>
          <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-gradient-to-br from-blue-100 to-pink-100 opacity-50"></div>

          {/* Floating decorative shapes */}
          <div className="absolute right-12 top-12 h-8 w-8 rounded-full border-2 border-purple-200 bg-white opacity-70 animate-pulse motion-reduce:animate-none" style={{ animationDelay: "0s" }}></div>
          <div className="absolute right-24 top-24 h-4 w-4 rounded-full bg-blue-200 opacity-70 animate-pulse motion-reduce:animate-none" style={{ animationDelay: "0.5s" }}></div>
          <div className="absolute left-16 bottom-16 h-6 w-6 rounded-full border-2 border-pink-200 bg-white opacity-70 animate-pulse motion-reduce:animate-none" style={{ animationDelay: "1s" }}></div>
          <div className="absolute left-32 bottom-32 h-3 w-3 rounded-full bg-purple-200 opacity-70 animate-pulse motion-reduce:animate-none" style={{ animationDelay: "1.5s" }}></div>

          <div className="relative z-10 mb-8">
            <h2 className="mb-3 text-2xl font-semibold text-gray-800 sm:text-3xl">Create Your Avatar</h2>
          </div>

          <div className="relative z-10">
            <AvatarPromptForm onStartImageGeneration={handleStartImageGeneration} />
          </div>
        </div>

        {/* Result Display Section */}
        {(showResultSection || isGeneratingImage || imageUrl) && (
          <div
            ref={(node) => {
              // Assign to both refs
              if (node) {
                resultSectionRef.current = node;
                resultRef(node);
              }
            }}
            className={`relative mb-12 overflow-hidden rounded-2xl bg-white p-8 shadow-xl transition-all duration-500 ${resultInView ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
          >
            {/* Decorative elements for result section */}
            <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 opacity-50"></div>
            <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 opacity-50"></div>

            {/* Floating decorative shapes */}
            <div className="absolute right-16 top-16 h-6 w-6 rounded-full border-2 border-indigo-200 bg-white opacity-70 animate-pulse motion-reduce:animate-none" style={{ animationDelay: "0.2s" }}></div>
            <div className="absolute right-32 top-32 h-3 w-3 rounded-full bg-purple-200 opacity-70 animate-pulse motion-reduce:animate-none" style={{ animationDelay: "0.7s" }}></div>
            <div className="absolute left-20 bottom-20 h-5 w-5 rounded-full border-2 border-pink-200 bg-white opacity-70 animate-pulse motion-reduce:animate-none" style={{ animationDelay: "1.2s" }}></div>
            <div className="absolute left-36 bottom-36 h-4 w-4 rounded-full bg-indigo-200 opacity-70 animate-pulse motion-reduce:animate-none" style={{ animationDelay: "1.7s" }}></div>

            <div className="relative z-10">
              <AvatarResultDisplay
                imageUrl={imageUrl}
                isLoading={isGeneratingImage}
                error={imageError}
                gameStyle={gameStyle}
                onReset={handleReset}
                onRegenerateImage={handleRegenerateImage}
              />
            </div>
          </div>
        )}

        {/* Footer section */}
        <div className="mt-12 text-center">
          <p className="text-sm font-medium text-gray-600">
            Create your own unique avatar based on your personality and preferences!
          </p>

          <div className="mt-4 flex justify-center space-x-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-2 w-2 animate-pulse motion-reduce:animate-none rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
                style={{ animationDelay: `${i * 0.2}s` }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}