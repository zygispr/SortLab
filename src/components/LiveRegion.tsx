import { useAppStore } from '../store/appStore';

/**
 * Visually hidden polite live region for status and error messages (ui-contract.md →
 * Announcements). Each announcement is rendered under a new key, so repeating the same
 * text still replaces the node and screen readers read it again.
 */
export function LiveRegion() {
  const announcement = useAppStore((s) => s.announcement);
  return (
    <div role="status" aria-live="polite" className="visually-hidden">
      {announcement && <span key={announcement.seq}>{announcement.text}</span>}
    </div>
  );
}
