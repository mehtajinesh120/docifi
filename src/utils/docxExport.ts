import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Footer,
} from "docx";
import { Question, AnswerImage, DocifyConfig } from "../types";

// Convert base64 data URL to Uint8Array
function base64ToUint8Array(base64Data: string): { uint8: Uint8Array; mimeType: string } {
  let cleanBase64 = base64Data;
  let mimeType = "image/png";

  if (base64Data.startsWith("data:")) {
    const parts = base64Data.split(",");
    const mimeMatch = parts[0].match(/:(.*?);/);
    if (mimeMatch) mimeType = mimeMatch[1];
    cleanBase64 = parts[1];
  }

  const binaryString = atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return { uint8: bytes, mimeType };
}

// Helper to get image intrinsic dimensions in browser
function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      return resolve({ width: 800, height: 600 });
    }
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
    };
    img.onerror = () => {
      resolve({ width: 800, height: 600 });
    };
    img.src = dataUrl;
  });
}

export async function generateDocxBlob(
  questions: Question[],
  images: AnswerImage[],
  config: DocifyConfig
): Promise<Blob> {
  // Map images to questions
  const imageMap = new Map<string, AnswerImage[]>();
  images.forEach((img) => {
    if (img.matchedQuestionId) {
      const existing = imageMap.get(img.matchedQuestionId) || [];
      existing.push(img);
      imageMap.set(img.matchedQuestionId, existing);
    }
  });

  // Filter questions based on config.printBlankForUnanswered
  const questionsToInclude = questions.filter((q) => {
    const matchedImgs = imageMap.get(q.id) || [];
    if (matchedImgs.length > 0) return true;
    // If no answers found, only keep if printBlankForUnanswered is true
    return config.printBlankForUnanswered;
  });

  const children: (Paragraph | Table)[] = [];

  // Optional student header block if requested
  if (config.includeStudentHeader && (config.studentName || config.rollNumber || config.subjectCode)) {
    const headerDetails: string[] = [];
    if (config.studentName) headerDetails.push(`Student: ${config.studentName}`);
    if (config.rollNumber) headerDetails.push(`Roll / ID: ${config.rollNumber}`);
    if (config.subjectCode) headerDetails.push(`Course / Subject: ${config.subjectCode}`);

    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: headerDetails.join("   |   "),
            size: 18, // 9pt
            color: "666666",
            font: "Arial",
          }),
        ],
      })
    );
  }

  // Document Topic Header: "Topic Name: ..."
  children.push(
    new Paragraph({
      spacing: { before: 100, after: 280 },
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: "Topic Name: ",
          bold: true,
          size: 32, // 16pt
          color: "111827",
          font: "Arial",
        }),
        new TextRun({
          text: config.topicName || "Assignment",
          bold: true,
          size: 32, // 16pt
          color: "2563EB", // Elegant royal blue
          font: "Arial",
        }),
      ],
    })
  );

  // Decorative divider line
  children.push(
    new Paragraph({
      spacing: { after: 320 },
      border: {
        bottom: {
          color: "D1D5DB",
          space: 1,
          style: BorderStyle.SINGLE,
          size: 12,
        },
      },
    })
  );

  const questionsPerPage = config.questionsPerPage || 0; // 0 means continuous

  for (let i = 0; i < questionsToInclude.length; i++) {
    const q = questionsToInclude[i];
    const matchedImgs = imageMap.get(q.id) || [];
    const hasTextAnswer = Boolean(q.textAnswer && q.textAnswer.trim());
    const hasImageAnswer = matchedImgs.length > 0;
    const hasAnyAnswer = hasTextAnswer || hasImageAnswer;

    // 1. Clean Question Number and Question Text: "Q1. Question title"
    // Strictly strip any residual "[Expected: ...]" hints or brackets from question text
    const cleanQuestionText = (q.question || "")
      .replace(/\[\s*Expected:[\s\S]*?\]/gi, "")
      .trim();

    const qNum = q.number ? `Q${q.number}. ` : `Q${i + 1}. `;
    children.push(
      new Paragraph({
        spacing: { before: 240, after: 100 },
        children: [
          new TextRun({
            text: qNum,
            bold: true,
            size: 24, // 12pt
            color: "111827",
            font: "Arial",
          }),
          new TextRun({
            text: cleanQuestionText,
            bold: true,
            size: 24, // 12pt
            color: "1F2937",
            font: "Arial",
          }),
        ],
      })
    );

    // Decorative separator line directly between Question and Answer
    children.push(
      new Paragraph({
        spacing: { before: 60, after: 120 },
        border: {
          bottom: {
            color: "E2E8F0", // Soft slate divider line
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
      })
    );

    // 2. "Answer:" label
    children.push(
      new Paragraph({
        spacing: { before: 60, after: 140 },
        children: [
          new TextRun({
            text: "Answer:",
            bold: true,
            size: 22, // 11pt
            color: "2563EB", // Elegant royal blue accent
            font: "Arial",
          }),
        ],
      })
    );

    // 2b. If student typed a written text answer, render paragraphs
    if (hasTextAnswer && q.textAnswer) {
      const textLines = q.textAnswer.trim().split(/\r?\n/);
      for (const line of textLines) {
        if (line.trim()) {
          children.push(
            new Paragraph({
              spacing: { before: 40, after: 100 },
              children: [
                new TextRun({
                  text: line,
                  size: 22, // 11pt
                  color: "1F2937",
                  font: "Arial",
                }),
              ],
            })
          );
        }
      }
    }

    // 3. Matched image answer(s) or blank lined answer space
    if (hasImageAnswer) {
      for (const img of matchedImgs) {
        try {
          const { uint8, mimeType } = base64ToUint8Array(img.base64);
          const dims = await getImageDimensions(img.base64);

          // Max page content width is ~520px
          const maxWidth = 520;
          let maxHeight = 480;
          if (questionsPerPage === 1) {
            maxHeight = 650;
          } else if (questionsPerPage >= 2) {
            maxHeight = 320;
          }

          let renderWidth = dims.width;
          let renderHeight = dims.height;

          if (renderWidth > maxWidth) {
            const ratio = maxWidth / renderWidth;
            renderWidth = maxWidth;
            renderHeight = renderHeight * ratio;
          }

          if (renderHeight > maxHeight) {
            const ratio = maxHeight / renderHeight;
            renderHeight = maxHeight;
            renderWidth = renderWidth * ratio;
          }

          const imgType = mimeType.toLowerCase().includes("png") ? "png" : "jpg";

          children.push(
            new Paragraph({
              spacing: { before: 80, after: 200 },
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  type: imgType,
                  data: uint8,
                  transformation: {
                    width: Math.round(renderWidth),
                    height: Math.round(renderHeight),
                  },
                }),
              ],
            })
          );
        } catch (imgErr) {
          console.error("Failed to render image into docx:", imgErr);
          children.push(
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: `[Image: ${img.name}]`,
                  color: "6B7280",
                  italics: true,
                }),
              ],
            })
          );
        }
      }
    } else if (!hasTextAnswer) {
      // Print clean ruled blank space for answer
      const linesCount = Math.max(3, config.blankSpaceLines || 5);
      for (let line = 0; line < linesCount; line++) {
        children.push(
          new Paragraph({
            spacing: { before: 80, after: 120 },
            border: {
              bottom: {
                color: "CBD5E1",
                space: 1,
                style: BorderStyle.DASHED,
                size: 6,
              },
            },
            children: [
              new TextRun({
                text: " ",
                size: 20,
              }),
            ],
          })
        );
      }
    }

    // Page break or question block separator line
    const isLastQuestion = i === questionsToInclude.length - 1;
    if (questionsPerPage > 0 && !isLastQuestion) {
      if ((i + 1) % questionsPerPage === 0) {
        children.push(
          new Paragraph({
            children: [new PageBreak()],
          })
        );
      } else {
        // Line between questions on the same page
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 200 },
            border: {
              bottom: {
                color: "CBD5E1",
                space: 1,
                style: BorderStyle.SINGLE,
                size: 8,
              },
            },
          })
        );
      }
    } else if (!isLastQuestion) {
      // Continuous mode separator between questions
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 200 },
          border: {
            bottom: {
              color: "CBD5E1",
              space: 1,
              style: BorderStyle.SINGLE,
              size: 8,
            },
          },
        })
      );
    }
  }

  // Create docx Document with invisible watermark in metadata and footer
  const doc = new Document({
    title: config.topicName || "Assignment Doc",
    creator: "Docify by JineshMehta",
    description: "made by docify by jineshmehta",
    subject: "made by docify by jineshmehta",
    keywords: "made by docify by jineshmehta",
    lastModifiedBy: "Docify by JineshMehta",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch (720 dxa)
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80 },
                children: [
                  // Invisible watermark: 2pt micro text with nearly white color, invisible to naked eye but embedded in the docx
                  new TextRun({
                    text: "made by docify by jineshmehta",
                    size: 4, // 2pt
                    color: "F9FAFB", // ultra faint, invisible on white paper
                    font: "Arial",
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export function downloadDocx(blob: Blob, filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, "_") || "Assignment_Docify";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
