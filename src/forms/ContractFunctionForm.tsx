"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ContractFunctionSchema } from "@/types";
import { normalizeInputs, NormalizedField } from "./abi/normalizeAbi";
import { RecursiveField } from "./RecursiveField";

interface ContractFunctionFormProps {
  /** The parsed function schema from the ABI */
  schema: ContractFunctionSchema;
  /** Called when the form is submitted with serialized arguments */
  onSubmit: (args: Record<string, any>) => void;
  /** Whether the form is in a loading/submitting state */
  isSubmitting?: boolean;
  /** Whether the function is a read operation (view/pure) */
  isReadOnly?: boolean;
  /** Optional class name for styling */
  className?: string;
}

/**
 * ContractFunctionForm dynamically renders a form for any smart contract
 * function based on its ABI schema.
 *
 * Architecture:
 * ```
 * ABI → parseAbi → ContractFunctionSchema → normalizeInputs → NormalizedField[]
 *                                                                    ↓
 *                                                         RecursiveField (renders)
 *                                                                    ↓
 *                                                            User fills form
 *                                                                    ↓
 *                                                          onSubmit(serialized)
 * ```
 *
 * This avoids writing one custom React form for every smart contract function.
 * The interview specifically explored this recursive approach for handling
 * nested structs, arrays, and arrays of structs.
 */
export function ContractFunctionForm({
  schema,
  onSubmit,
  isSubmitting = false,
  isReadOnly = false,
  className = "",
}: ContractFunctionFormProps) {
  // Normalize inputs into renderable field descriptors
  const fields = useMemo(() => normalizeInputs(schema.inputs), [schema.inputs]);

  // Form state: keyed by field name
  const [values, setValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    fields.forEach((field) => {
      initial[field.name] = getDefaultValue(field);
    });
    return initial;
  });

  const handleFieldChange = useCallback(
    (fieldName: string, value: any) => {
      setValues((prev) => ({ ...prev, [fieldName]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(values);
    },
    [values, onSubmit]
  );

  const handleReset = useCallback(() => {
    const initial: Record<string, any> = {};
    fields.forEach((field) => {
      initial[field.name] = getDefaultValue(field);
    });
    setValues(initial);
  }, [fields]);

  return (
    <form
      onSubmit={handleSubmit}
      className={`contract-function-form ${className}`}
      aria-label={`${schema.name} contract function form`}
    >
      <div className="contract-function-header">
        <h3 className="contract-function-name">{schema.name}</h3>
        <span className="contract-function-mutability">
          {schema.mutability}
        </span>
      </div>

      {fields.length === 0 ? (
        <p className="contract-function-no-inputs">
          This function takes no arguments.
        </p>
      ) : (
        <div className="contract-function-fields">
          {fields.map((field) => (
            <RecursiveField
              key={field.name}
              field={field}
              value={values[field.name]}
              onChange={(v) => handleFieldChange(field.name, v)}
              path={field.name}
              disabled={isSubmitting}
            />
          ))}
        </div>
      )}

      <div className="contract-function-actions">
        <button
          type="submit"
          disabled={isSubmitting}
          className="contract-function-submit"
        >
          {isSubmitting
            ? "Processing..."
            : isReadOnly
              ? "Query"
              : "Execute"}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={isSubmitting}
          className="contract-function-reset"
        >
          Reset
        </button>
      </div>
    </form>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDefaultValue(field: NormalizedField): any {
  if (field.isArray) return [];
  if (field.fieldType === "tuple") {
    const obj: Record<string, any> = {};
    field.children?.forEach((child) => {
      obj[child.name] = getDefaultValue(child);
    });
    return obj;
  }
  if (field.fieldType === "bool") return false;
  return "";
}
