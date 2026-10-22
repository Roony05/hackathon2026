// app/components/loadingSquare.js
"use client";

import { useEffect } from "react";

// Module-level counter: body stays locked only while at least one loader is mounted.
let mounted = 0;

export function releaseScrollIfIdle() {
  if (typeof document === "undefined") return;
  if (mounted <= 0) {
    mounted = 0;
    document.body.classList.remove("no-scroll");
  }
}

export function LoadingSquareFullPage() {
  useEffect(() => {
    mounted += 1;
    document.body.classList.add("no-scroll");
    return () => {
      mounted = Math.max(0, mounted - 1);
      if (mounted === 0) document.body.classList.remove("no-scroll");
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-90"
      style={{ pointerEvents: "none" }}
    >
      <div className="sk-cube-grid mb-4">
        <div className="sk-cube-grid mb-4" />
        <div className="sk-cube sk-cube1" />
        <div className="sk-cube sk-cube2" />
        <div className="sk-cube sk-cube3" />
        <div className="sk-cube sk-cube4" />
        <div className="sk-cube sk-cube5" />
        <div className="sk-cube sk-cube6" />
        <div className="sk-cube sk-cube7" />
        <div className="sk-cube sk-cube8" />
        <div className="sk-cube sk-cube9" />
      </div>
    </div>
  );
}
