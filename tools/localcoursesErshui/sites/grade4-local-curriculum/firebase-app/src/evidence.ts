import html2canvas from "html2canvas";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type EvidenceCapture = {
  page: number;
  title: string;
  image: string;
};

export async function captureEvidence(
  element: HTMLElement,
  page: number,
  title: string,
): Promise<EvidenceCapture> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  const canvas = await html2canvas(element, {
    backgroundColor: "#fffaf0",
    scale: Math.min(window.devicePixelRatio || 1.5, 1.8),
    useCORS: true,
    logging: false,
    windowWidth: Math.max(element.scrollWidth, 920),
  });
  return {
    page,
    title,
    image: canvas.toDataURL("image/jpeg", 0.84),
  };
}

export async function buildEvidencePdf(
  captures: EvidenceCapture[],
  studentId: string,
  attemptId: string,
) {
  const pages = [...captures].sort((a, b) => a.page - b.page);
  const pdf = await PDFDocument.create();
  const labelFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const item of pages) {
    const page = pdf.addPage([841.89, 595.28]);
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const imageBytes = Uint8Array.from(
      atob(item.image.split(",")[1]),
      (character) => character.charCodeAt(0),
    );
    const image = await pdf.embedJpg(imageBytes);
    const maxWidth = pageWidth - 40;
    const maxHeight = pageHeight - 54;
    const ratio = Math.min(
      maxWidth / image.width,
      maxHeight / image.height,
    );
    const width = image.width * ratio;
    const height = image.height * ratio;
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(1, 0.992, 0.968),
    });
    page.drawText(
      `ERHSUI GRADE 4  |  STEP ${item.page} / 7  |  STUDENT ${studentId}  |  ${attemptId.slice(-8)}`,
      {
        x: 22,
        y: pageHeight - 24,
        size: 11,
        font: labelFont,
        color: rgb(0.09, 0.23, 0.36),
      },
    );
    page.drawImage(image, {
      x: (pageWidth - width) / 2,
      y: 18,
      width,
      height,
    });
  }

  const bytes = await pdf.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}
