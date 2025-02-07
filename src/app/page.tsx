"use client";

import { useEffect, useState } from "react";
import Feb7_LogicPuzzle from "./components/Feb7_LogicPuzzle";
import Feb6_ImageGeneration from "./components/Feb6_ImageGeneration";

export default function Home() {

  const [showFeb6, setShowFeb6] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Feb7_LogicPuzzle />
      {showFeb6 && <Feb6_ImageGeneration />}
      {!showFeb6 && (
        <div className="flex justify-center items-center min-h-[20vh] pt-20">
          <button className="bg-gray-500 text-white px-4 py-2 rounded-md" onClick={() => setShowFeb6(true)}>
            Show Feb 6
          </button>
        </div>
      )}
    </>
  );
}
