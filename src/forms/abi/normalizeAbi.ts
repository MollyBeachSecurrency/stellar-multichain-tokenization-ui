import { ContractInputSchema } from "@/types";

/**
 * Field types used by the recursive form renderer.
 * Maps Solidity types to UI component types.
 */
export type FieldType =
  | "address"
  | "uint"
  | "int"
  | "bool"
  | "string"
  | "bytes"
  | "tuple"
  | "array"
  | "unknown";

/**
 * Normalized field descriptor used by the form renderer.
 */
export interface NormalizedField {
  /** Field name from the ABI */
  name: string;
  /** Original Solidity type (e.g., "uint256", "address", "tuple[]") */
  solidityType: string;
  /** Normalized field type for component selection */
  fieldType: FieldType;
  /** Whether this is an array type */
  isArray: boolean;
  /** For array types, the base element type */
  arrayElementType?: FieldType;
  /** For tuple/struct types, the nested fields */
  children?: NormalizedField[];
  /** Placeholder text based on type */
  placeholder: string;
  /** Validation hint */
  validationHint: string;
}

/**
 * Normalize an ABI input schema into a form-renderable field descriptor.
 * Handles:
 * - Primitive types (address, uint256, bool, string, bytes)
 * - Nested structs (tuple)
 * - Arrays of primitives (uint256[])
 * - Arrays of structs (tuple[])
 * - Deeply nested structures (tuples containing tuples)
 */
export function normalizeInput(input: ContractInputSchema): NormalizedField {
  const solidityType = input.type;

  // Array types
  if (solidityType.endsWith("[]")) {
    const baseType = solidityType.slice(0, -2);
    const isTupleArray = baseType === "tuple";

    return {
      name: input.name,
      solidityType,
      fieldType: "array",
      isArray: true,
      arrayElementType: isTupleArray ? "tuple" : resolveFieldType(baseType),
      children: input.components?.map(normalizeInput),
      placeholder: `Add ${input.name} items`,
      validationHint: `Array of ${baseType} values`,
    };
  }

  // Tuple (struct) types
  if (solidityType === "tuple") {
    return {
      name: input.name,
      solidityType,
      fieldType: "tuple",
      isArray: false,
      children: input.components?.map(normalizeInput),
      placeholder: "",
      validationHint: "Struct with nested fields",
    };
  }

  // Fixed-size arrays (e.g., uint256[3])
  const fixedArrayMatch = solidityType.match(/^(.+)\[(\d+)\]$/);
  if (fixedArrayMatch) {
    const baseType = fixedArrayMatch[1];
    return {
      name: input.name,
      solidityType,
      fieldType: "array",
      isArray: true,
      arrayElementType: resolveFieldType(baseType),
      children: input.components?.map(normalizeInput),
      placeholder: `${fixedArrayMatch[2]} ${baseType} values`,
      validationHint: `Fixed array of ${fixedArrayMatch[2]} ${baseType} values`,
    };
  }

  // Primitive types
  const fieldType = resolveFieldType(solidityType);
  return {
    name: input.name,
    solidityType,
    fieldType,
    isArray: false,
    placeholder: getPlaceholder(fieldType, solidityType),
    validationHint: getValidationHint(fieldType, solidityType),
  };
}

/**
 * Normalize all inputs for a function into form field descriptors.
 */
export function normalizeInputs(inputs: ContractInputSchema[]): NormalizedField[] {
  return inputs.map(normalizeInput);
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function resolveFieldType(solidityType: string): FieldType {
  if (solidityType === "address") return "address";
  if (solidityType === "bool") return "bool";
  if (solidityType === "string") return "string";
  if (solidityType.startsWith("uint")) return "uint";
  if (solidityType.startsWith("int")) return "int";
  if (solidityType.startsWith("bytes")) return "bytes";
  if (solidityType === "tuple") return "tuple";
  return "unknown";
}

function getPlaceholder(fieldType: FieldType, solidityType: string): string {
  switch (fieldType) {
    case "address":
      return "0x...";
    case "uint":
      return "0";
    case "int":
      return "0";
    case "bool":
      return "true / false";
    case "string":
      return "Enter text";
    case "bytes":
      return "0x...";
    default:
      return `Enter ${solidityType}`;
  }
}

function getValidationHint(fieldType: FieldType, solidityType: string): string {
  switch (fieldType) {
    case "address":
      return "42-character hex address starting with 0x";
    case "uint":
      return `Positive integer (${solidityType})`;
    case "int":
      return `Integer (${solidityType})`;
    case "bool":
      return "Boolean value";
    case "string":
      return "String value";
    case "bytes":
      return "Hex-encoded bytes starting with 0x";
    default:
      return solidityType;
  }
}
