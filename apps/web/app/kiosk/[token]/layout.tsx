import type { Metadata, Viewport } from "next";

// Public self-service kiosk shell. Everything here is deliberately
// independent of the staff dashboard: no sidebar, no auth, no staff links.
// The token only ever appears in the URL the restaurant gave this device.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  return {
    title: "Kiosk",
    description: "Self-service order kiosk",
    // Per-token manifest so "Add to Home screen" opens THIS kiosk, not "/".
    manifest: `/kiosk/${encodeURIComponent(token)}/manifest.webmanifest`,
    robots: { index: false, follow: false },
    appleWebApp: { capable: true, title: "Kiosk", statusBarStyle: "black-translucent" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // A public touchscreen: stray pinch-zoom would break the layout for the
  // next customer. (Browsers with an OS-level "force zoom" accessibility
  // setting still override this, which is the right outcome.)
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // When the on-screen keyboard opens, shrink the layout (so the search box
  // stays visible) instead of panning the page under it.
  interactiveWidget: "resizes-content",
  themeColor: "#2A4D77",
};

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Sizing: Apple HIG fluid scaling across mobile phones (portrait),
          tablets, and large self-service kiosk displays. */}
      <style>{`
        html { font-size: clamp(15px, 2.5vw, 20px); }
        @media (min-width: 768px) {
          html { font-size: clamp(16px, 1.35vw, 22px); }
        }
        @media (min-width: 1200px) {
          html { font-size: clamp(16px, 1.1vw, 24px); }
        }
        html, body {
          overscroll-behavior: none;
          background-color: var(--bg-app, #EDE7D8);
        }
      `}</style>
      <div className="kiosk-root fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground antialiased selection:bg-primary/20">
        {children}
      </div>
    </>
  );
}
