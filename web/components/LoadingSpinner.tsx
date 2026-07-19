/** Branded loading state: gold ring spinner over the full wordmark. */
export default function LoadingSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10" role="status" aria-label={label}>
      <div className="h-10 w-10 animate-spin rounded-full border-3 border-gold/25 border-t-gold" />
      <div className="text-sm font-bold uppercase tracking-widest text-gold">Services</div>
      <span className="sr-only">{label}…</span>
    </div>
  );
}
