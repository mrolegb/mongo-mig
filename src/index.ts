import { applyInstruction, Instruction } from "./apply";

export async function migrate(
  instr: Instruction[],
  withTx: boolean,
  logCollection?: string,
) {
  instr.map(async (i) => {
    await applyInstruction(i, withTx, logCollection);
  });
}
