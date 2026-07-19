import {
  CircleAlert,
  CircleCheck,
  FileCheck2,
  MapPin,
  UserRound,
  WalletCards,
} from "lucide-react";
import { RestoredProfileEditor } from "@/components/RestoredProfileEditor";
import type {
  ApprovedFieldId,
  ConfirmedProfileField,
  ProfileCorrection,
  ProfileSession,
} from "@/lib/profile-schema";
import { isCompletedProfileSession } from "@/lib/profile-fingerprint";

type ProfileSummaryProps = {
  session: ProfileSession | null;
  restored: boolean;
  availablePreviewDocumentNames?: readonly string[];
  onConfirmedCorrection?: (
    nextSession: ProfileSession,
    correction: ProfileCorrection,
  ) => void;
  onEditPendingChange?: (pending: boolean) => void;
};

function findField(
  fields: readonly ConfirmedProfileField[],
  fieldId: ApprovedFieldId,
): ConfirmedProfileField | undefined {
  return fields.find((field) => field.fieldId === fieldId);
}

export function ProfileSummary({
  session,
  restored,
  availablePreviewDocumentNames = [],
  onConfirmedCorrection,
  onEditPendingChange,
}: ProfileSummaryProps) {
  const fields = session?.confirmedFields ?? [];
  const fullName = findField(fields, "fullName");
  const address = findField(fields, "address");
  const incomeFields = fields.filter((field) =>
    [
      "employer",
      "benefitType",
      "grossPay",
      "netPay",
      "monthlyBenefit",
      "payFrequency",
    ].includes(field.fieldId),
  );
  const profileComplete = isCompletedProfileSession(session);

  return (
    <section
      aria-labelledby="profile-summary-heading"
      className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="profile-summary-heading"
            className="text-xl font-bold text-ink"
          >
            Confirmed profile summary
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Only confirmed structured values and document metadata are saved
            in temporary session storage.
          </p>
        </div>
        <span
          className={
            "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold " +
            (profileComplete
              ? "bg-brand-soft text-brand-dark"
              : "bg-slate-100 text-slate-700")
          }
        >
          {profileComplete ? (
            <CircleCheck aria-hidden="true" size={15} />
          ) : (
            <CircleAlert aria-hidden="true" size={15} />
          )}
          {profileComplete
            ? "Profile confirmation complete"
            : "Profile confirmation in progress"}
        </span>
      </div>

      {restored && session ? (
        <p className="mt-5 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm leading-6 text-brand-dark">
          Confirmed session values were restored. Raw documents and previews
          were not stored. You can edit confirmed values without re-uploading;
          re-upload a sample only when you want to inspect its evidence again.
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-line bg-canvas p-4">
          <UserRound aria-hidden="true" size={20} className="text-brand" />
          <h3 className="mt-3 text-sm font-bold text-ink">
            Confirmed person name
          </h3>
          <p className="mt-2 text-sm text-slate-700">
            {fullName?.value ?? "Not confirmed"}
          </p>
        </article>
        <article className="rounded-xl border border-line bg-canvas p-4">
          <MapPin aria-hidden="true" size={20} className="text-brand" />
          <h3 className="mt-3 text-sm font-bold text-ink">
            Confirmed address
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {address?.value ?? "Not confirmed"}
          </p>
        </article>
        <article className="rounded-xl border border-line bg-canvas p-4">
          <WalletCards aria-hidden="true" size={20} className="text-brand" />
          <h3 className="mt-3 text-sm font-bold text-ink">
            Confirmed income-related fields
          </h3>
          {incomeFields.length > 0 ? (
            <dl className="mt-2 space-y-2 text-sm">
              {incomeFields.map((field) => (
                <div key={field.reviewGroupId}>
                  <dt className="font-semibold text-slate-500">
                    {field.label}
                  </dt>
                  <dd className="font-bold text-slate-700">{field.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-700">None confirmed</p>
          )}
        </article>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-line p-4">
          <dt className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <FileCheck2 aria-hidden="true" size={17} className="text-brand" />
            Documents reviewed
          </dt>
          <dd className="mt-2 text-2xl font-bold text-ink">
            {session?.counts.documentsReviewed ?? 0}
          </dd>
        </div>
        <div className="rounded-xl border border-line p-4">
          <dt className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <CircleCheck aria-hidden="true" size={17} className="text-brand" />
            Fields confirmed
          </dt>
          <dd className="mt-2 text-2xl font-bold text-ink">
            {session?.counts.fieldsConfirmed ?? 0}
          </dd>
        </div>
        <div className="rounded-xl border border-line p-4">
          <dt className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <CircleAlert
              aria-hidden="true"
              size={17}
              className="text-amber-700"
            />
            Fields excluded
          </dt>
          <dd className="mt-2 text-2xl font-bold text-ink">
            {session?.counts.fieldsExcluded ?? 0}
          </dd>
        </div>
        <div className="rounded-xl border border-line p-4">
          <dt className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <CircleAlert
              aria-hidden="true"
              size={17}
              className="text-amber-700"
            />
            Unresolved conflicts
          </dt>
          <dd className="mt-2 text-2xl font-bold text-ink">
            {session?.counts.unresolvedConflicts ?? 0}
          </dd>
        </div>
      </dl>

      {session && session.documents.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-bold text-ink">Document metadata saved</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            {session.documents.map((document) => (
              <li key={document.id}>
                {document.name} -{" "}
                {document.reviewState === "reviewed"
                  ? "reviewed"
                  : "no-call recorded"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {restored && session && onConfirmedCorrection && onEditPendingChange ? (
        <RestoredProfileEditor
          session={session}
          availablePreviewDocumentNames={availablePreviewDocumentNames}
          onConfirmedCorrection={onConfirmedCorrection}
          onPendingChange={onEditPendingChange}
        />
      ) : null}
    </section>
  );
}
