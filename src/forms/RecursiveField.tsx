"use client";

import React, { useCallback } from "react";
import { NormalizedField } from "./abi/normalizeAbi";
import { AddressInput } from "./fields/AddressInput";
import { BigIntegerInput } from "./fields/BigIntegerInput";
import { BooleanInput } from "./fields/BooleanInput";
import { TextInput } from "./fields/TextInput";

interface RecursiveFieldProps {
  field: NormalizedField;
  value: any;
  onChange: (value: any) => void;
  path: string;
  disabled?: boolean;
}

/**
 * RecursiveField renders the appropriate input component for a normalized
 * ABI field, handling nested structs and arrays recursively.
 *
 * This is the core of the dynamic form generator. Instead of writing
 * custom forms for every contract function, the ABI schema drives
 * form rendering through recursive composition.
 *
 * Handles:
 * - address -> AddressInput
 * - uint*/int* -> BigIntegerInput
 * - bool -> BooleanInput (checkbox)
 * - string/bytes -> TextInput
 * - tuple -> NestedFieldGroup (recursive)
 * - array -> DynamicFieldList (recursive)
 * - tuple[] -> DynamicFieldList containing NestedFieldGroup (recursive)
 */
export function RecursiveField({
  field,
  value,
  onChange,
  path,
  disabled = false,
}: RecursiveFieldProps) {
  // ─── Array type ──────────────────────────────────────────────────────────────
  if (field.isArray) {
    return (
      <DynamicArrayField
        field={field}
        value={value ?? []}
        onChange={onChange}
        path={path}
        disabled={disabled}
      />
    );
  }

  // ─── Tuple (struct) type ─────────────────────────────────────────────────────
  if (field.fieldType === "tuple" && field.children) {
    return (
      <NestedFieldGroup
        field={field}
        value={value ?? {}}
        onChange={onChange}
        path={path}
        disabled={disabled}
      />
    );
  }

  // ─── Primitive types ─────────────────────────────────────────────────────────
  switch (field.fieldType) {
    case "address":
      return (
        <AddressInput
          name={field.name}
          value={value ?? ""}
          onChange={onChange}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      );

    case "uint":
      return (
        <BigIntegerInput
          name={field.name}
          value={value ?? ""}
          onChange={onChange}
          placeholder={field.placeholder}
          disabled={disabled}
          solidityType={field.solidityType}
          signed={false}
        />
      );

    case "int":
      return (
        <BigIntegerInput
          name={field.name}
          value={value ?? ""}
          onChange={onChange}
          placeholder={field.placeholder}
          disabled={disabled}
          solidityType={field.solidityType}
          signed={true}
        />
      );

    case "bool":
      return (
        <BooleanInput
          name={field.name}
          value={value ?? false}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "string":
    case "bytes":
    default:
      return (
        <TextInput
          name={field.name}
          value={value ?? ""}
          onChange={onChange}
          placeholder={field.placeholder}
          disabled={disabled}
          solidityType={field.solidityType}
        />
      );
  }
}

// ─── Nested Field Group (tuple/struct) ─────────────────────────────────────────

interface NestedFieldGroupProps {
  field: NormalizedField;
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
  path: string;
  disabled?: boolean;
}

function NestedFieldGroup({
  field,
  value,
  onChange,
  path,
  disabled,
}: NestedFieldGroupProps) {
  const handleChildChange = useCallback(
    (childName: string, childValue: any) => {
      onChange({ ...value, [childName]: childValue });
    },
    [value, onChange]
  );

  return (
    <fieldset className="nested-field-group">
      <legend className="nested-field-legend">
        {field.name}
        <span className="field-type">struct</span>
      </legend>
      <div className="nested-field-children">
        {field.children?.map((child) => (
          <RecursiveField
            key={child.name}
            field={child}
            value={value[child.name]}
            onChange={(v) => handleChildChange(child.name, v)}
            path={`${path}.${child.name}`}
            disabled={disabled}
          />
        ))}
      </div>
    </fieldset>
  );
}

// ─── Dynamic Array Field ───────────────────────────────────────────────────────

interface DynamicArrayFieldProps {
  field: NormalizedField;
  value: any[];
  onChange: (value: any[]) => void;
  path: string;
  disabled?: boolean;
}

function DynamicArrayField({
  field,
  value,
  onChange,
  path,
  disabled,
}: DynamicArrayFieldProps) {
  const addItem = useCallback(() => {
    const defaultValue =
      field.arrayElementType === "tuple" ? {} :
      field.arrayElementType === "bool" ? false : "";
    onChange([...value, defaultValue]);
  }, [value, onChange, field.arrayElementType]);

  const removeItem = useCallback(
    (index: number) => {
      const updated = [...value];
      updated.splice(index, 1);
      onChange(updated);
    },
    [value, onChange]
  );

  const updateItem = useCallback(
    (index: number, itemValue: any) => {
      const updated = [...value];
      updated[index] = itemValue;
      onChange(updated);
    },
    [value, onChange]
  );

  // Build an element field descriptor for each array item
  const elementField: NormalizedField = {
    name: "item",
    solidityType: field.solidityType.replace("[]", ""),
    fieldType: field.arrayElementType ?? "unknown",
    isArray: false,
    children: field.children,
    placeholder: field.placeholder,
    validationHint: field.validationHint,
  };

  return (
    <fieldset className="array-field-group">
      <legend className="array-field-legend">
        {field.name}
        <span className="field-type">{field.solidityType}</span>
        <span className="array-count">({value.length} items)</span>
      </legend>

      <div className="array-field-items">
        {value.map((item, index) => (
          <div key={index} className="array-field-item">
            <div className="array-field-item-content">
              <RecursiveField
                field={{ ...elementField, name: `${field.name}[${index}]` }}
                value={item}
                onChange={(v) => updateItem(index, v)}
                path={`${path}[${index}]`}
                disabled={disabled}
              />
            </div>
            <button
              type="button"
              onClick={() => removeItem(index)}
              disabled={disabled}
              className="array-field-remove"
              aria-label={`Remove ${field.name} item ${index + 1}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        disabled={disabled}
        className="array-field-add"
      >
        + Add {field.name} item
      </button>
    </fieldset>
  );
}
