import mongoose, { ClientSession, Document, Schema } from "mongoose";
import { Instruction, MigrationStatus } from "./apply";

export interface MigrationLog {
  target: string;
  instruction: Instruction;
  comments?: string;
  status: MigrationStatus;
  statusMessage: string;
  executedAt?: Date;
}

const migrationLogSchema = new Schema<MigrationLog & Document>({
  target: { type: String, required: true },
  instruction: { type: Schema.Types.Mixed, required: true },
  comments: { type: String },
  status: { type: String, required: true },
  statusMessage: { type: String, required: true },
  executedAt: { type: Date, default: Date.now },
});

export async function log(log: MigrationLog, collectionName: string) {
  if (!mongoose.models[collectionName]) {
    mongoose.model(collectionName, migrationLogSchema);
  }

  const MigrationLog = mongoose.models[collectionName];
  await MigrationLog.create(log);
}
