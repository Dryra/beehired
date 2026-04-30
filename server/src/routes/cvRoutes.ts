import express from "express";
import multer from "multer";
import { PDFParse } from "pdf-parse";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post("/parse-cv", upload.single("cv"), async (req, res) => {
  let parser: PDFParse | undefined;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF uploaded" });
    }

    parser = new PDFParse({
      data: req.file.buffer,
    });

    const result = await parser.getText();

    const cleanedText = result.text
      .replace(/\s+/g, " ")
      .replace(/Page \d+/gi, "")
      .trim();

    return res.json({ text: cleanedText });
  } catch (error) {
    console.error("PDF parse error:", error);

    return res.status(500).json({
      error: "PDF parsing failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await parser?.destroy();
  }
});

export default router;
