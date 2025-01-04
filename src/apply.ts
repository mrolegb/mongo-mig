import { model, models, Schema } from "mongoose";

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

export interface Instruction {
  collection: string;
  addWithTransform?: AddWithTransform[];
  addFromOld?: AddFromOld[];
  removeOld?: RemoveOld[];
}

export async function applyInstruction(instr: Instruction) {
  if (!models[instr.collection]) {
    model(
      instr.collection,
      new Schema({}, { strict: false, collection: instr.collection }),
    );
  }
  const Model = models[instr.collection];

  // 1. Add new fields with transformations
  if (instr.addWithTransform && instr.addWithTransform.length > 0) {
    const transformFunctions = instr.addWithTransform.map((t) => ({
      new: t.new,
      transformFn: new Function("doc", `return (${t.transform})(doc)`) as (
        doc: unknown,
      ) => unknown,
    }));

    const docs = await Model.find({});
    for (const doc of docs) {
      const setPayload: Record<string, unknown> = {};
      transformFunctions.forEach(({ new: newKey, transformFn }) => {
        const newValue = transformFn(doc);
        if (typeof newValue !== "undefined") {
          setPayload[newKey] = newValue;
        }
      });
      if (Object.keys(setPayload).length > 0) {
        await Model.updateOne({ _id: doc._id }, { $set: setPayload });
      }
    }
  }

  // 2. Add new fields from existing fields without transformation
  if (instr.addFromOld && instr.addFromOld.length > 0) {
    const addMappings = instr.addFromOld.map((a) => ({
      new: a.new,
      from: a.from,
    }));

    const docs = await Model.find({});
    for (const doc of docs) {
      const setPayload: Record<string, unknown> = {};
      addMappings.forEach(({ new: newKey, from }) => {
        const value = doc[from];
        if (typeof value !== "undefined") {
          setPayload[newKey] = value;
        }
      });
      if (Object.keys(setPayload).length > 0) {
        await Model.updateOne({ _id: doc._id }, { $set: setPayload });
      }
    }
  }

  // 3. Remove old fields
  if (instr.removeOld && instr.removeOld.length > 0) {
    const unsetPayload: Record<string, ""> = {};
    instr.removeOld.forEach((r) => {
      unsetPayload[r.field] = "";
    });
    await Model.updateMany({}, { $unset: unsetPayload });
  }
}
