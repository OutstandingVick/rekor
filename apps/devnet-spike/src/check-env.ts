import { DYNAMIC_BONDING_CURVE_PROGRAM_ID } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { devnet, wallet } from "./env.js";

const connection = await devnet();
const me = wallet();
const program = await connection.getAccountInfo(DYNAMIC_BONDING_CURVE_PROGRAM_ID);
console.log("wallet ", me.publicKey.toBase58());
console.log("balance", (await connection.getBalance(me.publicKey)) / LAMPORTS_PER_SOL, "SOL");
console.log("DBC program on devnet:", program?.executable ? "yes" : "NO");
