import type { ReadinessPacketContent } from "@/lib/packet-content";

export type PacketPdfSection = Readonly<{
  heading: string;
  paragraphs: readonly string[];
}>;

export type GeneratedReadinessPacketPdf = Readonly<{
  blob: Blob;
  filename: string;
  pageCount: number;
}>;

function textFieldValue(
  field: { value: string; confirmationStatus: string } | null,
): string {
  return field
    ? `${field.value} (${field.confirmationStatus})`
    : "Not confirmed in the current Profile";
}

function moneyFieldValue(
  field: { formattedAmount: string; confirmationStatus: string } | null,
): string {
  return field
    ? `${field.formattedAmount} (${field.confirmationStatus})`
    : "Not confirmed in the current Profile";
}

function formatDocumentPages(pages: readonly number[]): string {
  return pages.length === 0 ? "No confirmed field page retained" : pages.join(", ");
}

/**
 * Exposes the deterministic, searchable text command model separately from
 * binary rendering so packet safety and content can be verified directly.
 */
export function buildReadinessPacketPdfSections(
  packet: ReadinessPacketContent,
): readonly PacketPdfSection[] {
  const comparison = packet.hudReferenceComparison;
  const official = packet.sourceAndDecisionBoundaries.officialHudData;

  return [
    {
      heading: "Cover",
      paragraphs: [
        packet.cover.productName,
        packet.cover.packetTitle,
        `Generated: ${packet.cover.generatedAtDisplay}`,
        `Profile revision: ${packet.cover.profileRevision}`,
        packet.cover.disclaimer,
      ],
    },
    {
      heading: "Confirmed renter information",
      paragraphs: [
        `Confirmed name: ${textFieldValue(packet.renterInformation.fullName)}`,
        `Confirmed address: ${textFieldValue(packet.renterInformation.address)}`,
        `Household size: ${packet.renterInformation.householdSize} (${packet.renterInformation.householdSizeStatus})`,
      ],
    },
    {
      heading: "Confirmed income-related information",
      paragraphs: [
        `Employer: ${textFieldValue(packet.incomeInformation.employer)}`,
        `Gross pay: ${moneyFieldValue(packet.incomeInformation.grossPay)}`,
        `Pay frequency: ${textFieldValue(packet.incomeInformation.payFrequency)}`,
        `Net pay: ${moneyFieldValue(packet.incomeInformation.netPay)}`,
        packet.incomeInformation.netPayNote,
        `Benefit type: ${textFieldValue(packet.incomeInformation.benefitType)}`,
        `Monthly benefit: ${moneyFieldValue(packet.incomeInformation.monthlyBenefit)}`,
      ],
    },
    {
      heading: "Transparent annualised calculation",
      paragraphs: [
        `Calculated: ${packet.annualisedCalculation.calculatedAtDisplay}`,
        `Employment formula: ${packet.annualisedCalculation.employment.formula}`,
        `Employment substitution: ${packet.annualisedCalculation.employment.substitution} = ${packet.annualisedCalculation.employment.formattedResult}`,
        `Benefit formula: ${packet.annualisedCalculation.benefits.formula}`,
        `Benefit substitution: ${packet.annualisedCalculation.benefits.substitution} = ${packet.annualisedCalculation.benefits.formattedResult}`,
        `Combined formula: ${packet.annualisedCalculation.combined.formula}`,
        `Combined substitution: ${packet.annualisedCalculation.combined.substitution} = ${packet.annualisedCalculation.combined.formattedResult}`,
        packet.annualisedCalculation.explanation,
      ],
    },
    {
      heading: "Verified HUD reference comparison",
      paragraphs: [
        `Rule year: ${comparison.ruleYear}`,
        `Effective date: ${comparison.effectiveDateDisplay}`,
        `Geography: ${comparison.geography}`,
        `Household size: ${comparison.householdSize}`,
        `Selected threshold type: ${comparison.thresholdType}`,
        `Official reference threshold: ${comparison.formattedOfficialThreshold}`,
        `Confirmed annualised amount: ${comparison.formattedConfirmedAnnualisedAmount}`,
        `Absolute difference: ${comparison.formattedAbsoluteDifference}`,
        `Difference calculation: ${comparison.differenceCalculation}`,
        comparison.neutralStatement,
        comparison.context,
      ],
    },
    {
      heading: "Document-readiness checklist",
      paragraphs: [
        `Reviewed: ${packet.documentReadinessChecklist.reviewedAtDisplay}`,
        ...packet.documentReadinessChecklist.items.map(
          (item) => `${item.label} — ${item.status}`,
        ),
        packet.documentReadinessChecklist.disclaimer,
      ],
    },
    {
      heading: "Confirmed source-document metadata",
      paragraphs:
        packet.sourceDocumentMetadata.length === 0
          ? ["No confirmed source-document metadata is available."]
          : packet.sourceDocumentMetadata.map(
              (document) =>
                `${document.fileName} — ${document.category}; ${document.profileReviewStatus}; retained source page(s): ${formatDocumentPages(document.sourcePages)}`,
            ),
    },
    {
      heading: "Source and decision boundaries",
      paragraphs: [
        `A. ${official.classification} — ${official.verificationLabel}`,
        `Publisher: ${official.publisher}`,
        `Dataset: ${official.datasetTitle}`,
        `Citation: ${official.citationIdentifier}`,
        `Official PDF page: ${official.pdfPage} of ${official.pdfPageCount}`,
        `Official dataset page: ${official.datasetPageUrl}`,
        `Official PDF: ${official.pdfUrl}`,
        `B. ${packet.sourceAndDecisionBoundaries.productArithmetic.classification}`,
        packet.sourceAndDecisionBoundaries.productArithmetic.explanation,
        `C. ${packet.sourceAndDecisionBoundaries.productPolicy.classification}`,
        packet.sourceAndDecisionBoundaries.productPolicy.coverDisclaimer,
        packet.sourceAndDecisionBoundaries.productPolicy.finalReviewStatement,
      ],
    },
  ];
}

function normalizeForStandardPdfFont(value: string): string {
  return value
    .replaceAll("—", "-")
    .replaceAll("–", "-")
    .replaceAll("−", "-")
    .replaceAll("×", "x")
    .replaceAll("’", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"');
}

/**
 * Creates PDF bytes in the browser without downloading, uploading, or creating
 * an object URL. The caller owns the explicit download interaction and any
 * short-lived URL lifecycle.
 */
export async function generateReadinessPacketPdf(
  packet: ReadinessPacketContent,
): Promise<GeneratedReadinessPacketPdf> {
  if (typeof window === "undefined") {
    throw new Error("Readiness packet PDFs can only be generated in the browser.");
  }

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
    compress: true,
    putOnlyUsedFonts: true,
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const footerSpace = 46;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - footerSpace) {
      return;
    }

    pdf.addPage();
    y = margin;
  };

  const addWrappedText = (
    text: string,
    options: {
      fontSize?: number;
      fontStyle?: "normal" | "bold";
      after?: number;
      textColor?: readonly [number, number, number];
    } = {},
  ) => {
    const fontSize = options.fontSize ?? 10.5;
    const lineHeight = fontSize * 1.38;
    const lines = pdf.splitTextToSize(
      normalizeForStandardPdfFont(text),
      contentWidth,
    ) as string[];
    ensureSpace(lines.length * lineHeight + (options.after ?? 7));
    pdf.setFont("helvetica", options.fontStyle ?? "normal");
    pdf.setFontSize(fontSize);
    const color = options.textColor ?? ([36, 52, 64] as const);
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.text(lines, margin, y, { lineHeightFactor: 1.38 });
    y += lines.length * lineHeight + (options.after ?? 7);
  };

  const sections = buildReadinessPacketPdfSections(packet);

  sections.forEach((section, sectionIndex) => {
    if (sectionIndex === 0) {
      addWrappedText(packet.cover.productName, {
        fontSize: 18,
        fontStyle: "bold",
        after: 14,
        textColor: [12, 104, 97],
      });
      addWrappedText(packet.cover.packetTitle, {
        fontSize: 24,
        fontStyle: "bold",
        after: 18,
        textColor: [20, 33, 43],
      });
      section.paragraphs.slice(2).forEach((paragraph, paragraphIndex) => {
        addWrappedText(paragraph, {
          fontSize: paragraphIndex === 2 ? 12 : 10.5,
          fontStyle: paragraphIndex === 2 ? "bold" : "normal",
          after: paragraphIndex === 2 ? 20 : 7,
        });
      });
      return;
    }

    ensureSpace(44);
    addWrappedText(section.heading, {
      fontSize: 14,
      fontStyle: "bold",
      after: 10,
      textColor: [12, 104, 97],
    });
    section.paragraphs.forEach((paragraph) => {
      addWrappedText(paragraph);
    });
    y += 8;
  });

  const pageCount = pdf.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    pdf.setPage(pageNumber);
    pdf.setDrawColor(203, 213, 225);
    pdf.line(margin, pageHeight - 34, pageWidth - margin, pageHeight - 34);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    const footerText =
      `HousingReady Copilot | Page ${pageNumber} of ${pageCount}`;
    const footerX = (pageWidth - pdf.getTextWidth(footerText)) / 2;
    pdf.text(
      footerText,
      footerX,
      pageHeight - 20,
    );
  }

  pdf.setProperties({
    title: packet.cover.packetTitle,
    subject: "Application-preparation information only",
    author: packet.cover.productName,
    creator: packet.cover.productName,
    keywords: "application readiness, renter-confirmed information, HUD reference",
  });

  return {
    blob: pdf.output("blob"),
    filename: packet.filename,
    pageCount,
  };
}
