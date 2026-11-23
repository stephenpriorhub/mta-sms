import PortraitTracker from "@/components/PortraitTracker";

/** Public T-Letter pages (/[list] and /[list]/[postId]). Adds Portrait Tracker. */
export default function PublicListLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PortraitTracker />
      {children}
    </>
  );
}
