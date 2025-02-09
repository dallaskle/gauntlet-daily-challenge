"use client";

import { useEffect, useState } from "react";
import Feb7_LogicPuzzle from "./components/Feb7_LogicPuzzle";
import Feb6_ImageGeneration from "./components/Feb6_ImageGeneration";
import PythonRunner from "./components/PythonRunner";

export default function Home() {
  const [showFeb6, setShowFeb6] = useState(false);
  const [showFeb7, setShowFeb7] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main>
      
      
      <PythonRunner />
      <hr className="my-4 mt-40" /> {/* Added line below PythonRunner */}

      <div className="pt-20 pb-10 px-10">
        <h2 className="mr-4 text-lg font-bold">Past Days</h2>
        {showFeb7 && <Feb7_LogicPuzzle />}
        {showFeb6 && <Feb6_ImageGeneration />}
        <div className="flex space-x-4">
          {!showFeb7 && (
            <button className="bg-gray-500 text-white px-4 py-2 rounded-md" onClick={() => setShowFeb7(true)}>
              Show Feb 7
            </button>
          )}
          {!showFeb6 && (
            <button className="bg-gray-500 text-white px-4 py-2 rounded-md" onClick={() => setShowFeb6(true)}>
              Show Feb 6
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
