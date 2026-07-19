import { CheckCircle2, CircleAlert, UsersRound } from "lucide-react";
import type { HouseholdSize } from "@/lib/rules-schema";
import type { HouseholdSizeConfirmation } from "@/lib/understand-schema";

type HouseholdSizeControlProps = {
  draftValue: HouseholdSize;
  confirmed: HouseholdSizeConfirmation | null;
  onChange: (value: HouseholdSize) => void;
  onConfirm: () => void;
};

const householdSizes = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function HouseholdSizeControl({
  draftValue,
  confirmed,
  onChange,
  onConfirm,
}: HouseholdSizeControlProps) {
  const isCurrentConfirmation = confirmed?.value === draftValue;

  return (
    <section
      aria-labelledby="household-size-heading"
      className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-bold text-brand">
            <UsersRound aria-hidden="true" size={18} />
            Renter-provided information
          </p>
          <h2
            id="household-size-heading"
            className="mt-2 text-xl font-bold text-ink"
          >
            Confirm household size
          </h2>
          <p id="household-size-help" className="mt-2 text-sm leading-6 text-slate-600">
            The sample documents do not establish household size. Select a
            number from 1 through 8 and confirm it yourself. HousingReady
            Copilot does not infer relationships or household composition.
          </p>
        </div>
        <span
          className={
            "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold " +
            (isCurrentConfirmation
              ? "bg-brand-soft text-brand-dark"
              : "bg-sun-soft text-amber-900")
          }
        >
          {isCurrentConfirmation ? (
            <CheckCircle2 aria-hidden="true" size={15} />
          ) : (
            <CircleAlert aria-hidden="true" size={15} />
          )}
          {isCurrentConfirmation
            ? "Household size confirmed"
            : "Confirmation required"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,240px)_auto] sm:items-end">
        <div>
          <label
            htmlFor="household-size"
            className="block text-sm font-bold text-ink"
          >
            Renter-confirmed household size
          </label>
          <select
            id="household-size"
            name="household-size"
            value={draftValue}
            aria-describedby="household-size-help household-size-storage"
            onChange={(event) =>
              onChange(Number(event.target.value) as HouseholdSize)
            }
            className="mt-2 min-h-12 w-full rounded-xl border border-line bg-white px-4 py-3 text-ink outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-teal-200"
          >
            {householdSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isCurrentConfirmation}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-white outline-none hover:bg-brand-dark focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
        >
          <CheckCircle2 aria-hidden="true" size={18} />
          {isCurrentConfirmation ? "Confirmed" : "Confirm household size"}
        </button>
      </div>
      <p id="household-size-storage" className="mt-3 text-xs leading-5 text-slate-500">
        Only the explicitly confirmed number is saved to temporary session
        storage. Changing this selection clears the prior confirmation.
      </p>
    </section>
  );
}
