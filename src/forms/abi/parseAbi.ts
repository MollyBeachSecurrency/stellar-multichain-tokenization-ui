import { ContractFunctionSchema, ContractInputSchema, ContractOutputSchema, AbiMutability } from "@/types";

/**
 * Raw ABI types as they come from Solidity compilation.
 */
interface RawAbiItem {
  name?: string;
  type: string;
  stateMutability?: string;
  inputs?: RawAbiInput[];
  outputs?: RawAbiOutput[];
}

interface RawAbiInput {
  name: string;
  type: string;
  components?: RawAbiInput[];
  indexed?: boolean;
}

interface RawAbiOutput {
  name: string;
  type: string;
  components?: RawAbiOutput[];
}

/**
 * Parse a raw ABI JSON into a list of callable function schemas.
 *
 * Filters to only `function` type entries (excludes events, errors, constructors).
 * Normalizes nested tuple/array types into a recursive schema structure.
 */
export function parseAbi(abi: RawAbiItem[]): ContractFunctionSchema[] {
  return abi
    .filter((item) => item.type === "function" && item.name)
    .map((item) => ({
      name: item.name!,
      mutability: normalizeMutability(item.stateMutability),
      inputs: (item.inputs ?? []).map(parseInput),
      outputs: (item.outputs ?? []).map(parseOutput),
    }));
}

/**
 * Get only callable (non-view) functions from an ABI.
 */
export function getWriteFunctions(abi: RawAbiItem[]): ContractFunctionSchema[] {
  return parseAbi(abi).filter(
    (fn) => fn.mutability === "nonpayable" || fn.mutability === "payable"
  );
}

/**
 * Get only view/pure (read-only) functions from an ABI.
 */
export function getReadFunctions(abi: RawAbiItem[]): ContractFunctionSchema[] {
  return parseAbi(abi).filter(
    (fn) => fn.mutability === "view" || fn.mutability === "pure"
  );
}

/**
 * Find a specific function by name.
 */
export function findFunction(
  abi: RawAbiItem[],
  name: string
): ContractFunctionSchema | undefined {
  return parseAbi(abi).find((fn) => fn.name === name);
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function parseInput(input: RawAbiInput): ContractInputSchema {
  const schema: ContractInputSchema = {
    name: input.name || "unnamed",
    type: input.type,
  };

  // Handle tuple (struct) types — they have components
  if (input.components && input.components.length > 0) {
    schema.components = input.components.map(parseInput);
  }

  // Handle array of tuples (e.g., tuple[])
  if (input.type.endsWith("[]") && input.components) {
    schema.components = input.components.map(parseInput);
  }

  return schema;
}

function parseOutput(output: RawAbiOutput): ContractOutputSchema {
  const schema: ContractOutputSchema = {
    name: output.name || "unnamed",
    type: output.type,
  };

  if (output.components && output.components.length > 0) {
    schema.components = output.components.map(parseOutput);
  }

  return schema;
}

function normalizeMutability(stateMutability?: string): AbiMutability {
  switch (stateMutability) {
    case "view":
      return "view";
    case "pure":
      return "pure";
    case "payable":
      return "payable";
    case "nonpayable":
    default:
      return "nonpayable";
  }
}
