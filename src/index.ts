import { applyInstruction, Instruction } from './apply';
import { log } from './log';

export async function migrate(file: string, instr: Instruction) {
  await applyInstruction(instr);
  await log(file, instr);
}
