import type {
  ApprovedFieldId,
  EvidenceCoordinates,
  SampleDocumentKind,
} from "@/lib/profile-schema";

export type DemoFieldDefinition = {
  fieldId: ApprovedFieldId;
  reviewGroupId: string;
  label: string;
  value: string;
  confidence: number;
  sourceText: string;
  sourcePage: number;
  evidenceCoordinates?: EvidenceCoordinates;
};

export type DemoSampleDocument = {
  kind: SampleDocumentKind;
  title: string;
  fileName: string;
  href: string;
  description: string;
  sha256: string;
  fields: readonly DemoFieldDefinition[];
};

export const sampleDocuments: readonly DemoSampleDocument[] = [
  {
    kind: "pay-stub",
    title: "Synthetic pay stub",
    fileName: "synthetic-pay-stub.pdf",
    href: "/sample-documents/synthetic-pay-stub.pdf",
    description:
      "Maria Johnson pay statement from Riverside Market LLC, dated June 14, 2026.",
    sha256:
      "8b518c05178604586d3e8117766f9c9125353e1fd55994e0a6c6a41a510ef31b",
    fields: [
      {
        fieldId: "fullName",
        reviewGroupId: "person.fullName",
        label: "Full name",
        value: "Maria Johnson",
        confidence: 0.99,
        sourceText: "Employee: Maria Johnson",
        sourcePage: 1,
        evidenceCoordinates: {
          x: 0.09,
          y: 0.28,
          width: 0.39,
          height: 0.06,
        },
      },
      {
        fieldId: "employer",
        reviewGroupId: "employment.employer",
        label: "Employer",
        value: "Riverside Market LLC",
        confidence: 0.99,
        sourceText: "Employer: Riverside Market LLC",
        sourcePage: 1,
        evidenceCoordinates: {
          x: 0.09,
          y: 0.42,
          width: 0.39,
          height: 0.06,
        },
      },
      {
        fieldId: "payFrequency",
        reviewGroupId: "employment.payFrequency",
        label: "Pay frequency",
        value: "Biweekly",
        confidence: 0.99,
        sourceText: "Pay frequency: Biweekly",
        sourcePage: 1,
        evidenceCoordinates: {
          x: 0.52,
          y: 0.28,
          width: 0.39,
          height: 0.06,
        },
      },
      {
        fieldId: "payPeriodStart",
        reviewGroupId: "employment.payPeriodStart",
        label: "Pay period start",
        value: "June 1, 2026",
        confidence: 0.99,
        sourceText: "Pay period start: June 1, 2026",
        sourcePage: 1,
        evidenceCoordinates: {
          x: 0.09,
          y: 0.35,
          width: 0.39,
          height: 0.06,
        },
      },
      {
        fieldId: "payPeriodEnd",
        reviewGroupId: "employment.payPeriodEnd",
        label: "Pay period end",
        value: "June 14, 2026",
        confidence: 0.99,
        sourceText: "Pay period end: June 14, 2026",
        sourcePage: 1,
        evidenceCoordinates: {
          x: 0.52,
          y: 0.35,
          width: 0.39,
          height: 0.06,
        },
      },
      {
        fieldId: "documentDate",
        reviewGroupId: "payStub.documentDate",
        label: "Document date",
        value: "June 14, 2026",
        confidence: 0.99,
        sourceText: "Document date: June 14, 2026",
        sourcePage: 1,
        evidenceCoordinates: {
          x: 0.52,
          y: 0.42,
          width: 0.39,
          height: 0.06,
        },
      },
      {
        fieldId: "grossPay",
        reviewGroupId: "employment.grossPay.currentPeriod",
        label: "Gross pay",
        value: "$1,620.00",
        confidence: 0.99,
        sourceText: "Gross pay: $1,620.00",
        sourcePage: 1,
        evidenceCoordinates: {
          x: 0.09,
          y: 0.52,
          width: 0.4,
          height: 0.08,
        },
      },
      {
        fieldId: "netPay",
        reviewGroupId: "employment.netPay.currentPeriod",
        label: "Net pay",
        value: "$1,318.40",
        confidence: 0.99,
        sourceText: "Net pay: $1,318.40",
        sourcePage: 1,
        evidenceCoordinates: {
          x: 0.51,
          y: 0.52,
          width: 0.4,
          height: 0.08,
        },
      },
    ],
  },
  {
    kind: "benefits-letter",
    title: "Synthetic benefits letter",
    fileName: "synthetic-benefits-letter.pdf",
    href: "/sample-documents/synthetic-benefits-letter.pdf",
    description:
      "Maria Johnson Social Security benefit notice, dated May 12, 2026.",
    sha256:
      "b62120d1e72b074158637f010efb25188f148f355c0d3a2be5d99eb9617abe09",
    fields: [
      {
        fieldId: "fullName",
        reviewGroupId: "person.fullName",
        label: "Full name",
        value: "Maria Johnson",
        confidence: 0.99,
        sourceText: "Recipient: Maria Johnson",
        sourcePage: 1,
        evidenceCoordinates: {
          x: 0.09,
          y: 0.28,
          width: 0.39,
          height: 0.06,
        },
      },
      {
        fieldId: "documentDate",
        reviewGroupId: "benefitsLetter.documentDate",
        label: "Document date",
        value: "May 12, 2026",
        confidence: 0.99,
        sourceText: "Letter date: May 12, 2026",
        sourcePage: 1,
        evidenceCoordinates: {
          x: 0.52,
          y: 0.28,
          width: 0.39,
          height: 0.06,
        },
      },
      {
        fieldId: "benefitType",
        reviewGroupId: "benefits.benefitType",
        label: "Benefit type",
        value: "Social Security",
        confidence: 0.99,
        sourceText: "Benefit type: Social Security",
        sourcePage: 1,
        evidenceCoordinates: {
          x: 0.09,
          y: 0.39,
          width: 0.39,
          height: 0.06,
        },
      },
      {
        fieldId: "monthlyBenefit",
        reviewGroupId: "benefits.monthlyBenefit",
        label: "Monthly benefit",
        value: "$650.00",
        confidence: 0.99,
        sourceText: "Monthly benefit: $650.00",
        sourcePage: 1,
        evidenceCoordinates: {
          x: 0.52,
          y: 0.39,
          width: 0.39,
          height: 0.06,
        },
      },
      {
        fieldId: "effectiveDate",
        reviewGroupId: "benefits.effectiveDate",
        label: "Effective date",
        value: "January 1, 2026",
        confidence: 0.99,
        sourceText: "Effective date: January 1, 2026",
        sourcePage: 1,
        evidenceCoordinates: {
          x: 0.09,
          y: 0.46,
          width: 0.39,
          height: 0.06,
        },
      },
    ],
  },
  {
    kind: "residency-document",
    title: "Synthetic residency document",
    fileName: "synthetic-residency-document.pdf",
    href: "/sample-documents/synthetic-residency-document.pdf",
    description:
      "Maria Johnson fictional utility bill for 24 River Street, dated June 4, 2026.",
    sha256:
      "ba87d097d16a91c3efec12434750159ade73185131f84fec1339292ece2e4eb7",
    fields: [
      {
        fieldId: "fullName",
        reviewGroupId: "person.fullName",
        label: "Full name",
        value: "Maria Johnson",
        confidence: 0.99,
        sourceText: "Resident: Maria Johnson",
        sourcePage: 1,
        evidenceCoordinates: {
          x: 0.09,
          y: 0.28,
          width: 0.39,
          height: 0.06,
        },
      },
      {
        fieldId: "documentType",
        reviewGroupId: "residency.documentType",
        label: "Document type",
        value: "Utility bill",
        confidence: 0.99,
        sourceText: "Document type: Utility bill",
        sourcePage: 1,
        evidenceCoordinates: {
          x: 0.52,
          y: 0.28,
          width: 0.39,
          height: 0.06,
        },
      },
      {
        fieldId: "documentDate",
        reviewGroupId: "residencyDocument.documentDate",
        label: "Document date",
        value: "June 4, 2026",
        confidence: 0.99,
        sourceText: "Issue date: June 4, 2026",
        sourcePage: 1,
        evidenceCoordinates: {
          x: 0.09,
          y: 0.35,
          width: 0.39,
          height: 0.06,
        },
      },
      {
        fieldId: "address",
        reviewGroupId: "person.address",
        label: "Address",
        value: "24 River Street, Cambridge, MA 02139",
        confidence: 0.99,
        sourceText: "Address: 24 River Street, Cambridge, MA 02139",
        sourcePage: 1,
        evidenceCoordinates: {
          x: 0.09,
          y: 0.42,
          width: 0.82,
          height: 0.06,
        },
      },
    ],
  },
] as const;
