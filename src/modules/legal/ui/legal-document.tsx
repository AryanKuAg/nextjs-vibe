import Image from "next/image";
import Link from "next/link";

/**
 * The shell shared by /terms and /privacy. They used to be one client page at
 * /legal that switched tabs in state, so crawlers received an empty page and
 * neither document had a URL of its own. The tabs are links now, styled exactly
 * as the buttons were.
 */

const TABS = [
  { key: "terms", href: "/terms", label: "Terms of Service" },
  { key: "privacy", href: "/privacy", label: "Privacy Policy" },
] as const;

export type LegalTab = (typeof TABS)[number]["key"];

const LegalFooter = () => (
  <footer className="mt-40 pt-6 flex items-center justify-start text-sm text-[#CCCCCC] font-sans gap-4">
    <span>2026 © Framerate</span>
  </footer>
);

export function LegalDocument({ active, children }: { active: LegalTab; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background font-sans">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-11">
          <Link href="/" className="flex items-center gap-2 mb-11">
            <Image src="/logo.png" alt="Framerate" width={24} height={24} />
            <span className="text-white text-lg">Framerate</span>
          </Link>

          <nav aria-label="Legal documents" className="flex gap-6 border-b-[0.5px] border-white-8">
            {TABS.map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                aria-current={active === tab.key ? "page" : undefined}
                className={`text-[16px] leading-[24px] pb-4 relative transition-colors ${active === tab.key ? "text-white" : "text-white-50 hover:text-white-85"
                  }`}
              >
                {tab.label}
                {active === tab.key && (
                  <span aria-hidden className="absolute bottom-[-0.5px] left-0 right-0 h-[2px] bg-white rounded-t-sm" />
                )}
              </Link>
            ))}
          </nav>
        </header>

        {children}

        <LegalFooter />
      </div>
    </main>
  );
}
