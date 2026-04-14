import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

export default function SSOCallbackPage() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#1C1C1C]">
      <div className="flex flex-col items-center gap-4">
        <i className="ri-loader-4-line text-white/50 text-2xl animate-spin" />
        <p className="text-white/50 font-mono text-sm">Authenticating...</p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  )
}
