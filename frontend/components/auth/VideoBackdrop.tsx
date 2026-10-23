"use client";

import React, { useState, useEffect, useRef } from "react";

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
  const [hasError, setHasError] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Respect user's motion preferences
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setIsReducedMotion(true);
    }

    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsReducedMotion(true);
        if (videoRef.current) {
          videoRef.current.pause();
        }
      } else {
        setIsReducedMotion(false);
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMotionChange);
    } else {
      mediaQuery.addListener(handleMotionChange);
    }

    // Ensure muted for browser autoplay policy & trigger automatic playback
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      if (!mediaQuery.matches) {
        videoRef.current.play().catch(() => {});
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

  return (
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
  );
}

export default VideoBackdrop;
