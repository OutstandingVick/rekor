// The Meteora SDK (via Anchor and web3.js) expects Node's Buffer as a global.
import { Buffer } from "buffer";

if (!("Buffer" in globalThis)) (globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
