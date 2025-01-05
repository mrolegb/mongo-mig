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

const TIMEOUT = 60000;

describe("apply instructions to singleton", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }, TIMEOUT);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  }, TIMEOUT);

  it(
    "apply to replica set",
    async () => {
      const TestSchema = new Schema<TestDoc>(
        { firstName: String, lastName: String, age: Number },
        { strict: false, collection: "testdocs" },
      );
      const TestModel = mongoose.model<TestDoc>("testdocs", TestSchema);

      await TestModel.create([{ firstName: "John", lastName: "Doe", age: 30 }]);

      const instruction: Instruction = {
        collection: "testdocs",
        addWithTransform: [
          {
            new: "fullName",
            transform: '(doc) => doc.firstName + " " + doc.lastName',
          },
        ],
        addFromOld: [{ new: "info.age", from: "age" }],
        removeOld: [{ field: "firstName" }, { field: "lastName" }],
        comments: "Add fullName and info.age, remove firstName and lastName",
      };

      const result = await applyInstruction(instruction, false);

      expect(result.status).toBe("SUCCESS");
      expect(result.message).toBe("Migration successful");

      const docs = await TestModel.find({});
      expect(docs.length).toBe(1);

      expect(docs[0].toObject()).toMatchObject({
        fullName: "John Doe",
        info: { age: 30 },
      });
      expect(docs[0].firstName).toBeUndefined();
      expect(docs[0].lastName).toBeUndefined();
      expect(docs[0].age).toBe(30);

      const MigrationLog = mongoose.model("migrationLog");
      const logs = await MigrationLog.find({});

      expect(logs.length).toBe(1);
      expect(logs[0].status).toBe("SUCCESS");
      expect(logs[0].statusMessage).toBe("Migration successful");
      expect(logs[0].comments).toBe(
        "Add fullName and info.age, remove firstName and lastName",
      );
    },
    TIMEOUT,
  );
});
