import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#1C1C1C] flex flex-col items-center justify-center font-inconsolata px-6">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <Image src="/logo.png" alt="Framerate" width={24} height={24} />
        <span className="text-white text-lg">Framerate</span>
      </Link>
      
      <h1 className="text-[80px] font-bold text-white mb-2 leading-none">404</h1>
      <h2 className="text-xl text-white mb-4">Page not found</h2>
      <p className="text-sm text-[#CCCCCC] mb-8 text-center max-w-md">
        Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or doesn&apos;t exist.
      </p>
      
      <Link href="/" className="px-6 py-3 bg-white text-black rounded-full hover:bg-gray-200 transition-colors text-sm font-medium">
        Back to Home
      </Link>
    </div>
  );
}
