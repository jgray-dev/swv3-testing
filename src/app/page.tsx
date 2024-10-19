"use client";
import { useState } from "react";

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  return (
    <div className={"h-screen w-screen bg-slate-500 p-6"}>
      <textarea
        className={"resize-none"}
        onChange={(e) => {
          setPrompt(e.target.value);
        }}
      ></textarea>
      <button
        onClick={() => {
          console.log(prompt);
        }}
      >
        print
      </button>
    </div>
  );
}
