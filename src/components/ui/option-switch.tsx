"use client";

import clsx from "clsx";
import React, { createContext, useContext, useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

type OptionSwitchContextValue = {
  value: string | null;
  setValue: (next: string) => void;
};

const OptionSwitchContext = createContext<OptionSwitchContextValue | null>(
  null,
);

interface OptionSwitchProps {
  children: React.ReactNode;
  name?: string;
  size?: "small" | "medium" | "large";
  style?: React.CSSProperties;
  /** Controlled value. When provided alongside `onValueChange`, the
   *  parent fully owns selection state — internal state is bypassed.
   *  Required for surfaces driven by an external reducer (e.g. the
   *  practice mode-bar). */
  value?: string;
  onValueChange?: (value: string) => void;
}

export const OptionSwitch = ({
  children,
  name = "default",
  size = "medium",
  style,
  value: controlledValue,
  onValueChange,
}: OptionSwitchProps) => {
  const [internalValue, setInternalValue] = useState<string | null>(null);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const setValue: OptionSwitchContextValue["setValue"] = (next) => {
    if (!isControlled) setInternalValue(next);
    onValueChange?.(next);
  };

  return (
    <OptionSwitchContext.Provider value={{ value, setValue }}>
      <div
        className={clsx(
          "inline-flex bg-background-100 p-1 border border-gray-alpha-400 rounded-md",
          size === "small" && "h-8",
          size === "medium" && "h-10",
          size === "large" && "h-12",
        )}
        style={style}
      >
        {React.Children.map(children, (child) =>
          React.cloneElement(child as React.ReactElement<OptionSwitchControlProps>, {
            size,
            name,
          }),
        )}
      </div>
    </OptionSwitchContext.Provider>
  );
};

interface OptionSwitchControlProps {
  label?: React.ReactNode;
  value: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  name?: string;
  size?: "small" | "medium" | "large";
  icon?: React.ReactNode;
}

const OptionSwitchControl = ({
  label,
  value,
  defaultChecked,
  disabled = false,
  name,
  size = "medium",
  icon,
}: OptionSwitchControlProps) => {
  const context = useContext(OptionSwitchContext);
  const checked = value === context?.value;

  useEffect(() => {
    if (defaultChecked && context && context.value == null) context.setValue(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <label
      className={clsx(
        "flex flex-1 h-full",
        disabled && "cursor-not-allowed pointer-events-none",
      )}
      onClick={() => context?.setValue(value)}
    >
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        disabled={disabled}
        checked={checked}
        readOnly
        className="hidden"
      />
      <span
        className={twMerge(
          clsx(
            "flex items-center justify-center flex-1 cursor-pointer font-medium font-sans duration-150",
            checked
              ? "bg-primary text-primary-foreground fill-primary-foreground rounded-sm"
              : "text-gray-900 hover:text-gray-1000 fill-gray-900 hover:fill-gray-1000 rounded-sm",
            disabled && "text-gray-800 fill-gray-800",
            !icon && size === "small" && "text-xs px-2.5",
            !icon && size === "medium" && "text-sm px-3",
            !icon && size === "large" && "text-base px-4",
            icon && size === "small" && "py-1 px-2",
            icon && size === "medium" && "py-2 px-3",
            icon && size === "large" && "p-3",
          ),
        )}
      >
        {icon ? (
          <span className={clsx(size === "large" && "scale-125")}>{icon}</span>
        ) : (
          label
        )}
      </span>
    </label>
  );
};

OptionSwitch.Control = OptionSwitchControl;
