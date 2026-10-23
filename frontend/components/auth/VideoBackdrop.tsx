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
  posterSrc,
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

      {/* Transparent Black Tinted Background Overlays - Balanced for bright daytime video visibility & text legibility */}
      {/* 1. Light Base Tint - keeps 4K daytime sky, truck & scenery bright and vibrant */}
      <div className="absolute inset-0 bg-black/20 z-10 pointer-events-none" />

      {/* 2. Soft Horizontal Gradient - gentle localized contrast for left hero copy while leaving center video clear */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-black/30 z-10 pointer-events-none" />

      {/* 3. Subtle Header & Footer Vignette - frames top navigation and footer status bar */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/40 z-10 pointer-events-none" />
    </div>
  );
}

export default VideoBackdrop;
