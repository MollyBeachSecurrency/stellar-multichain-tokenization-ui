"use client";

import React from "react";

interface BooleanInputProps {
  name: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * BooleanInput renders a checkbox for Solidity bool types.
 */
export function BooleanInput({
  name,
  value,
  onChange,
  disabled = false,
}: BooleanInputProps) {
  return (
    <div className="field-group field-group-inline">
      <input
        id={name}
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="field-checkbox"
      />
      <label htmlFor={name} className="field-label field-label-inline">
        {name}
        <span className="field-type">bool</span>
      </label>
    </div>
  );
}
