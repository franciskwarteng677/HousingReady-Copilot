import { ArrowLeft, FileCheck2, UserRound } from "lucide-react";
import Link from "next/link";
import type {
  ApprovedFieldId,
  ConfirmedProfileField,
  ProfileSession,
} from "@/lib/profile-schema";
import { confirmationOriginLabel } from "@/lib/profile-corrections";

type ConfirmedProfilePanelProps = {
  profile: ProfileSession;
};

const displayedFields: readonly {
  fieldId: ApprovedFieldId;
  label: string;
}[] = [
  { fieldId: "fullName", label: "Confirmed name" },
  { fieldId: "address", label: "Address" },
  { fieldId: "employer", label: "Employer" },
  { fieldId: "grossPay", label: "Gross pay" },
  { fieldId: "netPay", label: "Net pay" },
  { fieldId: "payFrequency", label: "Pay frequency" },
  { fieldId: "benefitType", label: "Benefit type" },
  { fieldId: "monthlyBenefit", label: "Monthly benefit" },
] as const;

function fieldsFor(
  profile: ProfileSession,
  fieldId: ApprovedFieldId,
): ConfirmedProfileField[] {
  return profile.confirmedFields.filter((field) => field.fieldId === fieldId);
}

export function ConfirmedProfilePanel({
  profile,
}: ConfirmedProfilePanelProps) {
  const sourceDocuments = Array.from(
    new Set(
      profile.confirmedFields.flatMap((field) =>
        field.sources.map((source) => source.sourceDocumentName),
      ),
    ),
  ).sort();

  return (
    <section
      aria-labelledby="confirmed-profile-heading"
      className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-bold text-brand">
            <UserRound aria-hidden="true" size={18} />
            Confirmed Profile data
          </p>
          <h2
            id="confirmed-profile-heading"
            className="mt-2 text-xl font-bold text-ink"
          >
            Confirmed household information
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Only explicitly confirmed Profile values appear here. Excluded
            candidates are not included.
          </p>
        </div>
        <Link
          href="/profile"
          className="link-focus inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-ink hover:bg-slate-50"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Review or correct Profile
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {displayedFields.map(({ fieldId, label }) => {
          const fields = fieldsFor(profile, fieldId);

          return (
            <article
              key={fieldId}
              className="rounded-xl border border-line bg-canvas p-4"
            >
              <h3 className="text-sm font-bold text-slate-600">{label}</h3>
              {fields.length === 0 ? (
                <p className="mt-2 font-bold text-ink">No confirmed value</p>
              ) : (
                <div className="mt-2 space-y-3">
                  {fields.map((field) => (
                    <div key={field.reviewGroupId}>
                      <p className="font-bold text-ink">{field.value}</p>
                      <p className="mt-1 text-xs font-bold text-slate-600">
                        {confirmationOriginLabel(field.confirmationOrigin)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Source{field.sources.length === 1 ? "" : "s"}:
                      </p>
                      <ul className="mt-1 space-y-1 text-xs leading-5 text-slate-600">
                        {field.sources.map((source) => (
                          <li
                            key={
                              source.sourceDocumentId + ":" + source.sourcePage
                            }
                          >
                            {source.sourceDocumentName}, page {source.sourcePage}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-line p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
          <FileCheck2 aria-hidden="true" size={17} className="text-brand" />
          Source documents
        </h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          {sourceDocuments.map((documentName) => (
            <li key={documentName}>{documentName}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
