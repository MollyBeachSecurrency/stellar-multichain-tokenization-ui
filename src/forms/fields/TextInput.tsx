"use client";

import React from "react";

interface TextInputProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  solidityType: string;
}

/**
 * TextInput renders a standard text input for string/bytes Solidity types.
 */
export function TextInput({
  name,
  value,
  onChange,
  placeholder = "",
  disabled = false,
  error,
  solidityType,
}: TextInputProps) {
  return (
    <div className="field-group">
      <label htmlFor={name} className="field-label">
        {name}
        <span className="field-type">{solidityType}</span>
      </label>
      <input
        id={name}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`field-input ${error ? "field-input-error" : ""}`}
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
