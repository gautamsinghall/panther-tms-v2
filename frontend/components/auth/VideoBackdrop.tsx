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

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <div
      className={`fixed inset-0 pointer-events-none select-none overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    >
      {/* Fallback neutral backdrop (visible only when video fails to load or before load) */}
      <div className="absolute inset-0 bg-[#0f1115]" />

      {/* Background Video - Hardware-accelerated native resolution playback */}
      {!hasError && (
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          aria-hidden="true"
          poster={posterSrc}
          onError={() => setHasError(true)}
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none transform-gpu will-change-transform"
          style={{
            transform: "translate3d(0, 0, 0)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* Transparent Black Tinted Background Overlays for Peak Contrast & SaaS Visibility */}
      {/* 1. Base Dark Tint - softens daytime glare while keeping 4K motion crisp */}
      <div className="absolute inset-0 bg-black/55 z-10 pointer-events-none" />

      {/* 2. Horizontal Scrim - gently deepens left hero content and right login card areas */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/75 z-10 pointer-events-none" />

      {/* 3. Top & Bottom Subtle Vignette - frames top navigation and footer status bar */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80 z-10 pointer-events-none" />
    </div>
  );
}

export default VideoBackdrop;
