"use client";

import React from "react";

interface BigIntegerInputProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  solidityType: string;
  signed?: boolean;
}

/**
 * BigIntegerInput renders an input for uint/int Solidity types.
 * Accepts string values to support BigInt ranges beyond Number.MAX_SAFE_INTEGER.
 */
export function BigIntegerInput({
  name,
  value,
  onChange,
  placeholder = "0",
  disabled = false,
  error,
  solidityType,
  signed = false,
}: BigIntegerInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Allow digits, optionally a leading negative sign for signed types
    if (signed) {
      if (/^-?\d*$/.test(input)) {
        onChange(input);
      }
    } else {
      if (/^\d*$/.test(input)) {
        onChange(input);
      }
    }
  };

  return (
    <div className="field-group">
      <label htmlFor={name} className="field-label">
        {name}
        <span className="field-type">{solidityType}</span>
      </label>
      <input
        id={name}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`field-input field-input-number ${error ? "field-input-error" : ""}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <span id={`${name}-error`} className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
