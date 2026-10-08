export type TxStatus = "ready" | "wallet" | "broadcasting" | "confirmed" | "failed";

const LABEL: Record<TxStatus, string> = {
  ready: "Ready",
  wallet: "Awaiting wallet",
  broadcasting: "Broadcasting",
  confirmed: "Confirmed",
  failed: "Failed",
};

export function StatusPill({ status, detail }: { status: TxStatus; detail?: string }) {
  return (
    <span className={`status-pill s-${status}`} role="status">
      <i aria-hidden="true" />
      {LABEL[status]}
      {detail && <span className="status-detail">{detail}</span>}
    </span>
  );
}
