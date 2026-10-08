/** Rekor only ever talks to devnet (enforced by the genesis guard); say so up front. */
export function NetworkBadge() {
  return (
    <span className="net-badge" title="All transactions go to Solana devnet. Mainnet is out of scope.">
      <i aria-hidden="true" />
      Devnet
    </span>
  );
}
