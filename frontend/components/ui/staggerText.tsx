'use client'
import React, { useEffect, useState } from "react";

const TextAnimation = ({
  children,
  delay = 0,
  divideBy = "word",
}: {
  children: React.ReactNode;
  delay?: number;
  divideBy?: "word" | "letter";
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (typeof children !== "string") {
    if (typeof children === "number" || typeof children === "boolean") {
      children = String(children);
    } else {
      return <>{children}</>;
    }
  }

  const text = (children as string).trim().replace(/\s+/g, " ");
  const parts = divideBy === "letter" ? text.split("") : text.split(" ");
  const staggerStep = divideBy === "letter" ? 0.02 : 0.04;

  return (
    <span className="inline-block">
      {parts.map((part, i) => (
        <span
          key={i}
          className="inline-block transition-all duration-500 ease-out"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(6px)",
            transitionDelay: `${delay + i * staggerStep}s`,
            verticalAlign: "top",
          }}
        >
          {divideBy === "letter"
            ? part === " "
              ? "\u00A0"
              : part
            : part + "\u00A0"}
        </span>
      ))}
    </span>
  );
};

export default TextAnimation;
