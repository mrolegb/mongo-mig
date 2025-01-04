import { applyInstruction, Instruction } from "./apply";
import { log } from "./log";

export async function migrate(instr: Instruction, comments?: string) {
  await applyInstruction(instr);
  await log({
    existingCollection: instr.collection,
    instructions: instr,
    comments: comments,
  });
}
