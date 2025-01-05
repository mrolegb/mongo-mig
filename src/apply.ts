import mongoose, {
  AnyBulkWriteOperation,
  ClientSession,
  model,
  models,
  Schema,
} from "mongoose";
import { log } from "./log";

interface AddWithTransform {
  new: string;
  transform: string;
}

interface AddFromOld {
  new: string;
  from: string;
}

interface RemoveOld {
  field: string;
}

export enum MigrationStatus {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  WARNING = "WARNING",
}

export interface MigrationResult {
  status: MigrationStatus;
  message: string;
}

export interface Instruction {
  collection: string;
  addWithTransform?: AddWithTransform[];
  addFromOld?: AddFromOld[];
  removeOld?: RemoveOld[];
  comments?: string;
}

async function apply(
  instr: Instruction,
  session?: ClientSession,
): Promise<MigrationResult> {
  if (!models[instr.collection]) {
    model(
      instr.collection,
      new Schema({}, { strict: false, collection: instr.collection }),
    );
  }

  const Model = models[instr.collection];

  const docs = await Model.find({}, null, { session });
  if (docs.length === 0) {
    if (session) await session.commitTransaction();
    return {
      status: MigrationStatus.SUCCESS,
      message: "No documents found, skipping migration",
    };
  }

  const transformFunctions =
    instr.addWithTransform?.map((t) => ({
      new: t.new,
      transformFn: new Function("doc", `return (${t.transform})(doc)`) as (
        doc: unknown,
      ) => unknown,
    })) ?? [];

  const addMappings =
    instr.addFromOld?.map((a) => ({
      new: a.new,
      from: a.from,
    })) ?? [];

  const removeFields = instr.removeOld?.map((r) => r.field) ?? [];

  const bulkOps: AnyBulkWriteOperation[] = [];

  for (const doc of docs) {
    const setPayload: Record<string, unknown> = {};
    const unsetPayload: Record<string, "" | 1> = {};

    for (const { new: newKey, transformFn } of transformFunctions) {
      const newValue = transformFn(doc);
      if (typeof newValue !== "undefined") {
        setPayload[newKey] = newValue;
      }
    }

    for (const { new: newKey, from } of addMappings) {
      const value = doc[from];
      if (typeof value !== "undefined") {
        setPayload[newKey] = value;
      }
    }

    for (const field of removeFields) {
      unsetPayload[field] = "";
    }

    if (
      Object.keys(setPayload).length > 0 ||
      Object.keys(unsetPayload).length > 0
    ) {
      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            ...(Object.keys(setPayload).length > 0 && { $set: setPayload }),
            ...(Object.keys(unsetPayload).length > 0 && {
              $unset: unsetPayload,
            }),
          },
        },
      });
    }
  }

  if (bulkOps.length > 0) {
    await Model.bulkWrite(bulkOps, { session });
  }

  return { status: MigrationStatus.SUCCESS, message: "Migration successful" };
}

async function applyWithTx(instr: Instruction): Promise<MigrationResult> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await apply(instr, session);
    await session.commitTransaction();
    return result;
  } catch (error: any) {
    await session.abortTransaction();
    return { status: MigrationStatus.FAILED, message: error.message };
  } finally {
    session.endSession();
  }
}

export async function applyInstruction(
  instr: Instruction,
  withTx: boolean,
): Promise<MigrationResult> {
  const result = withTx ? await applyWithTx(instr) : await apply(instr);
  await log({
    existingCollection: instr.collection,
    instructions: instr,
    comments: instr.comments,
    status: result.status,
    statusMessage: result.message,
  });
  return result;
}
