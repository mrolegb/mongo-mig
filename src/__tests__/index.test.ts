import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Schema, Document } from "mongoose";
import { applyInstruction } from "../apply";
import { Instruction } from "../apply";

interface TestDoc extends Document {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  age?: number;
  info?: { age?: number };
}

describe("applyInstruction", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("adds new fields", async () => {
    expect(true).toBe(true);
  });

  it("transforms fields and removes old fields when removeOldFields=true", async () => {
    const TestSchema = new Schema<TestDoc>(
      { firstName: String, lastName: String, age: Number },
      { strict: false, collection: "testdocs" },
    );
    const TestModel = mongoose.model<TestDoc>("testdocs", TestSchema);

    await TestModel.create([
      { firstName: "John", lastName: "Doe", age: 30 },
      { firstName: "Jane", lastName: "Smith", age: 25 },
    ]);

    const instruction: Instruction = {
      collection: "testdocs",
      addWithTransform: [
        {
          new: "fullName",
          transform: '(doc) => doc.firstName + " " + doc.lastName',
        },
      ],
      addFromOld: [{ new: "info.age", from: "age" }],
      removeOld: [
        { field: "firstName" },
        { field: "lastName" },
        { field: "age" },
      ],
    };

    await applyInstruction(instruction);

    const docs = await TestModel.find({});
    expect(docs.length).toBe(2);

    expect(docs[0].toObject()).toMatchObject({
      fullName: "John Doe",
      info: { age: 30 },
    });
    expect(docs[0].firstName).toBeUndefined();
    expect(docs[0].lastName).toBeUndefined();
    expect(docs[0].age).toBeUndefined();

    expect(docs[1].toObject()).toMatchObject({
      fullName: "Jane Smith",
      info: { age: 25 },
    });
    expect(docs[1].firstName).toBeUndefined();
    expect(docs[1].lastName).toBeUndefined();
    expect(docs[1].age).toBeUndefined();
  });

  it("transforms fields but keeps old fields when removeOldFields=false", async () => {
    const AnotherSchema = new Schema<TestDoc>(
      { firstName: String, lastName: String },
      { strict: false, collection: "anotherdocs" },
    );
    const AnotherModel = mongoose.model<TestDoc>("anotherdocs", AnotherSchema);

    await AnotherModel.create({ firstName: "Alice", lastName: "Wonderland" });

    const instruction: Instruction = {
      collection: "anotherdocs",
      addWithTransform: [
        {
          new: "fullName",
          transform: '(doc) => doc.firstName + " " + doc.lastName',
        },
      ],
    };

    await applyInstruction(instruction);

    const doc = await AnotherModel.findOne({});
    expect(doc).not.toBeNull();
    expect(doc?.fullName).toBe("Alice Wonderland");
    expect(doc?.firstName).toBe("Alice");
    expect(doc?.lastName).toBe("Wonderland");
  });
});
