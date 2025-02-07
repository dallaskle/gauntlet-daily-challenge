"use client";

import { useEffect } from "react";
import Feb7_LogicPuzzle from "./components/Feb7_LogicPuzzle";
import Feb6_ImageGeneration from "./components/Feb6_ImageGeneration";

export default function Home() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Feb7_LogicPuzzle />
      <Feb6_ImageGeneration />
    </>
  );
}
