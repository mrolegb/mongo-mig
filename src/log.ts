import mongoose, { Document, Schema } from "mongoose";
import { Instruction } from "./apply";

export interface MigrationLogDoc extends Document {
  existingCollection: string;
  targetCollection?: string;
  instructions?: Instruction;
  comments?: string;
  executedAt: Date;
}

const migrationLogSchema = new Schema<MigrationLogDoc>({
  existingCollection: { type: String, required: true },
  targetCollection: { type: String },
  instructions: { type: Schema.Types.Mixed },
  comments: { type: String },
  executedAt: { type: Date, default: Date.now },
});


export async function log(file: string, instr: Instruction) {
    if (!mongoose.models['migrationLog']) {
      mongoose.model('migrationLog', migrationLogSchema);
    }
    
    const MigrationLog = mongoose.models['migrationLog'];
  await MigrationLog.create({ filename: file, instructions: instr });
}
