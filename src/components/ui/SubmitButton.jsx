"use client";

import { useFormStatus } from "react-dom";
import { buttonClasses } from "./Button";
import { Spinner } from "./Spinner";

/** Form submit button that reflects the parent form's pending state. */
export function SubmitButton({ children, pendingLabel = "Please wait", variant, size, fullWidth = true, className }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={buttonClasses({ variant, size, fullWidth, className })}
    >
      {pending ? (
        <>
          <Spinner />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
