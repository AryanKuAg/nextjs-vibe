// @ts-nocheck
import { useStore } from "./store/useStore";
import { Preloader } from "./components/Preloader";
import { CanvasScroll } from "./components/CanvasScroll";
import { Navbar } from "./components/Navbar";

export default function App() {
  const isReady = useStore((state: any) => state.isReady);

  return (
    <>
      <Preloader />
      
      <div className={`relative w-full transition-opacity duration-1000 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
        <CanvasScroll />
        <Navbar />
        
        <main className="w-full relative z-10 text-white flex flex-col">
          {/* AI will generate and inject sections here */}
        </main>
      </div>
    </>
  );
}
