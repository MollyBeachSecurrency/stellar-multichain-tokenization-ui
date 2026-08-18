import { describe, it, expect } from "vitest";
import { parseAbi, getWriteFunctions, getReadFunctions, findFunction } from "../abi/parseAbi";

const mockAbi = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "createOrder",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "order",
        type: "tuple",
        components: [
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "items", type: "tuple[]", components: [
            { name: "tokenId", type: "uint256" },
            { name: "quantity", type: "uint256" },
          ]},
        ],
      },
    ],
    outputs: [{ name: "orderId", type: "bytes32" }],
  },
  {
    name: "Transfer",
    type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
];

describe("parseAbi", () => {
  it("extracts only function types", () => {
    const functions = parseAbi(mockAbi);
    expect(functions).toHaveLength(3);
    expect(functions.every((f) => f.name)).toBe(true);
  });

  it("normalizes state mutability", () => {
    const functions = parseAbi(mockAbi);
    const transfer = functions.find((f) => f.name === "transfer");
    expect(transfer?.mutability).toBe("nonpayable");

    const balance = functions.find((f) => f.name === "balanceOf");
    expect(balance?.mutability).toBe("view");
  });

  it("parses inputs correctly", () => {
    const functions = parseAbi(mockAbi);
    const transfer = functions.find((f) => f.name === "transfer")!;

    expect(transfer.inputs).toHaveLength(2);
    expect(transfer.inputs[0].name).toBe("to");
    expect(transfer.inputs[0].type).toBe("address");
    expect(transfer.inputs[1].name).toBe("amount");
    expect(transfer.inputs[1].type).toBe("uint256");
  });

  it("handles nested tuple components", () => {
    const functions = parseAbi(mockAbi);
    const createOrder = functions.find((f) => f.name === "createOrder")!;

    expect(createOrder.inputs).toHaveLength(1);
    expect(createOrder.inputs[0].type).toBe("tuple");
    expect(createOrder.inputs[0].components).toHaveLength(3);

    // Nested tuple array
    const items = createOrder.inputs[0].components![2];
    expect(items.type).toBe("tuple[]");
    expect(items.components).toHaveLength(2);
    expect(items.components![0].name).toBe("tokenId");
  });
});

describe("getWriteFunctions", () => {
  it("returns only nonpayable/payable functions", () => {
    const writes = getWriteFunctions(mockAbi);
    expect(writes).toHaveLength(2);
    expect(writes.map((f) => f.name)).toContain("transfer");
    expect(writes.map((f) => f.name)).toContain("createOrder");
  });
});

describe("getReadFunctions", () => {
  it("returns only view/pure functions", () => {
    const reads = getReadFunctions(mockAbi);
    expect(reads).toHaveLength(1);
    expect(reads[0].name).toBe("balanceOf");
  });
});

describe("findFunction", () => {
  it("finds a function by name", () => {
    const fn = findFunction(mockAbi, "transfer");
    expect(fn).toBeDefined();
    expect(fn!.name).toBe("transfer");
  });

  it("returns undefined for missing function", () => {
    const fn = findFunction(mockAbi, "nonexistent");
    expect(fn).toBeUndefined();
  });
});
