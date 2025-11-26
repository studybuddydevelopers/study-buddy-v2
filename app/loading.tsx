"use client";

import Logo from "@/components/Logo";
import Paragraph from "@/components/Paragraph";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      {/* Spinning icon logo */}
      <div className="spin mb-6">
        <Logo variant="icon" size="max" animated animation="rotate"/>
      </div>

      <Paragraph variant="muted" size="md">
        Loading, please wait…
      </Paragraph>

      {/* Inline CSS for spin animation */}
      <style jsx>{`
        @keyframes spin-slow {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .spin {
          animation: spin-slow 2.5s linear infinite;
        }
      `}</style>
    </div>
  );
}
