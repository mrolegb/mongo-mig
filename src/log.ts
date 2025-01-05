import mongoose, { Document, Schema } from "mongoose";
import { Instruction, MigrationStatus } from "./apply";

export interface MigrationLog {
  existingCollection: string;
  instructions?: Instruction;
  comments?: string;
  status?: MigrationStatus;
  statusMessage?: string;
  executedAt?: Date;
}

const migrationLogSchema = new Schema<MigrationLog & Document>({
  existingCollection: { type: String, required: true },
  instructions: { type: Schema.Types.Mixed },
  comments: { type: String },
  executedAt: { type: Date, default: Date.now },
});

export async function log(log: MigrationLog) {
  if (!mongoose.models["migrationLog"]) {
    mongoose.model("migrationLog", migrationLogSchema);
  }

  const MigrationLog = mongoose.models["migrationLog"];
  await MigrationLog.create(log);
}
