"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause } from "lucide-react";

export interface VideoBackdropProps {
  className?: string;
  videoSrc?: string;
  posterSrc?: string;
}

export function VideoBackdrop({
  className = "",
  videoSrc = "/panther-tms-loop-4k-clean.mp4",
  posterSrc = "/panther-truck-poster.jpg",
}: VideoBackdropProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Respect user's motion preferences
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setIsReducedMotion(true);
      setIsPlaying(false);
    }

    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsReducedMotion(true);
        setIsPlaying(false);
        if (videoRef.current) {
          videoRef.current.pause();
        }
      } else {
        setIsReducedMotion(false);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMotionChange);
    } else {
      mediaQuery.addListener(handleMotionChange);
    }

    // Ensure muted for browser autoplay policy
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      if (!mediaQuery.matches) {
        videoRef.current.play().catch(() => {
          setIsPlaying(false);
        });
      }
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleMotionChange);
      } else {
        mediaQuery.removeListener(handleMotionChange);
      }
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
        });
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 pointer-events-none select-none overflow-hidden z-0 ${className}`}
        aria-hidden="true"
      >
        {/* Fallback dark gradient backdrop (visible when video fails to load or before load) */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" />

        {/* Background Video */}
        {!hasError && (
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay={!isReducedMotion}
            muted
            loop
            playsInline
            controls={false}
            aria-hidden="true"
            poster={posterSrc}
            onError={() => setHasError(true)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        )}

        {/* Dark gradient scrim over the video to preserve readability while highlighting truck & logo */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(15,23,42,0.65) 0%, rgba(15,23,42,0.22) 28%, rgba(15,23,42,0.18) 55%, rgba(15,23,42,0.72) 100%), linear-gradient(90deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.22) 34%, rgba(15,23,42,0.1) 50%, rgba(15,23,42,0.48) 100%)",
          }}
        />
      </div>

      {/* Small Pause/Play Button fixed at bottom-right */}
      {!hasError && (
        <div className="fixed bottom-4 right-4 z-50 pointer-events-auto">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause background video" : "Play background video"}
            title={isPlaying ? "Pause background video" : "Play background video"}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white/90 hover:text-white border border-white/20 backdrop-blur-md shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer active:scale-95"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>
        </div>
      )}
    </>
  );
}

export default VideoBackdrop;
