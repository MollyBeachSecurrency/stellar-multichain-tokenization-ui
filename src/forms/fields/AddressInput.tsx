"use client";

import React from "react";

interface AddressInputProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

/**
 * AddressInput renders an input for blockchain addresses.
 * Provides basic validation for hex address format.
 */
export function AddressInput({
  name,
  value,
  onChange,
  placeholder = "0x...",
  disabled = false,
  error,
}: AddressInputProps) {
  return (
    <div className="field-group">
      <label htmlFor={name} className="field-label">
        {name}
        <span className="field-type">address</span>
      </label>
      <input
        id={name}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`field-input field-input-address ${error ? "field-input-error" : ""}`}
        pattern="^0x[a-fA-F0-9]{40}$"
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
