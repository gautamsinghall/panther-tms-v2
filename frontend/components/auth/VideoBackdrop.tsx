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

      {/* Background Video */}
      {!hasError && (
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
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
    </div>
  );
}

export default VideoBackdrop;
