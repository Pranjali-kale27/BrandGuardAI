
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import upload from "./upload.js";
import { PDFParse } from "pdf-parse";
import connectDB from "./database.js";
import Submission from "./models/Submission.js";

dotenv.config();

// Initialize Express
const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10kb" }));

// Check Gemini API key
if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is missing from your .env file.");
  process.exit(1);
}

// Initialize Gemini AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Temporary route to inspect available Gemini models
app.get("/api/models", async (req, res) => {
  try {
    const models = await ai.models.list();

    const availableModels = [];

    for await (const model of models) {
      availableModels.push({
        name: model.name,
        supportedActions: model.supportedActions,
      });
    }

    return res.json({
      success: true,
      models: availableModels,
    });
  } catch (error) {
    console.error("Model list error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Home route
app.get("/", (req, res) => {
  res.send("BrandGuard AI backend is running!");
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "BrandGuard AI API is working!",
  });
});

// Get all saved submissions
app.get("/api/submissions", async (req, res) => {
  try {
    const submissions = await Submission.find()
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error("Fetch submissions error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not fetch submissions.",
    });
  }
});


app.patch("/api/submissions/:id/review", async (req, res) => {
  try {
    const { reviewStatus, reviewerFeedback } = req.body;

    const allowedStatuses = [
      "Approved",
      "Revision Requested",
    ];

    if (!allowedStatuses.includes(reviewStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review status.",
      });
    }

    if (
      reviewStatus === "Revision Requested" &&
      (!reviewerFeedback || !reviewerFeedback.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide feedback for the revision.",
      });
    }

    const updatedSubmission =
      await Submission.findByIdAndUpdate(
        req.params.id,
        {
          reviewStatus,
          reviewerFeedback: reviewerFeedback || "",
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!updatedSubmission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Review decision saved successfully.",
      submission: updatedSubmission,
    });
  } catch (error) {
    console.error("Review update error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not save the review decision.",
    });
  }
});



// Analytics API
app.get("/api/analytics", async (req, res) => {
  try {
    const totalSubmissions = await Submission.countDocuments();

    const approved = await Submission.countDocuments({
      reviewStatus: "Approved",
    });

    const pending = await Submission.countDocuments({
      reviewStatus: "Pending Review",
    });

    const revisionRequested = await Submission.countDocuments({
      reviewStatus: "Revision Requested",
    });

    const reviewed = approved + revisionRequested;

    const complianceScore =
      reviewed === 0
        ? 0
        : Math.round((approved / reviewed) * 100);

    const revisionPercentage =
      reviewed === 0
        ? 0
        : Math.round((revisionRequested / reviewed) * 100);

    return res.status(200).json({
      success: true,
      analytics: {
        totalSubmissions,
        approved,
        pending,
        revisionRequested,
        reviewed,
        complianceScore,
        revisionPercentage,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not fetch analytics.",
    });
  }
});


// Structured Issue Analytics API
app.get("/api/issue-analytics", async (req, res) => {
  try {
    const submissions = await Submission.find(
      {},
      { issueClassification: 1 }
    );

    const categories = {
      "Tone and Voice": "toneAndVoice",
      "Brand Guideline Violations": "brandGuidelineCompliance",
      "Unsupported Claims": "unsupportedClaims",
      "Grammar and Language": "grammarAndLanguage",
    };

    const issueCounts = {};
    const confirmedIssueCounts = {};
    const potentialIssueCounts = {};

    let totalConfirmedIssues = 0;
    let totalPotentialIssues = 0;

    Object.entries(categories).forEach(([label]) => {
      issueCounts[label] = 0;
      confirmedIssueCounts[label] = 0;
      potentialIssueCounts[label] = 0;
    });

    submissions.forEach((submission) => {
      const classification = submission.issueClassification;

      if (!classification) return;

      Object.entries(categories).forEach(([label, field]) => {
        const status = classification[field]?.status;

        if (status === "Confirmed Issue") {
          confirmedIssueCounts[label]++;
          issueCounts[label]++;
          totalConfirmedIssues++;
        } else if (status === "Potential Issue") {
          potentialIssueCounts[label]++;
          issueCounts[label]++;
          totalPotentialIssues++;
        }
      });
    });

    return res.status(200).json({
      success: true,
      issueCounts,
      confirmedIssueCounts,
      potentialIssueCounts,
      totalConfirmedIssues,
      totalPotentialIssues,
      classifiedSubmissions: submissions.filter(
        (submission) => submission.issueClassification
      ).length,
    });
  } catch (error) {
    console.error("Issue analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not fetch issue analytics.",
    });
  }
});



// Upload and extract brand guidelines from PDF
app.post(
  "/api/upload-guidelines",
  upload.single("guidelines"),
  async (req, res) => {
    let parser;

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please upload a PDF file.",
        });
      }

      parser = new PDFParse({
        data: new Uint8Array(req.file.buffer),
      });

      const pdfData = await parser.getText();
      const extractedText = pdfData.text.trim();

      if (!extractedText) {
        return res.status(400).json({
          success: false,
          message: "No readable text was found in this PDF.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Brand guidelines extracted successfully.",
        guidelines: extractedText,
      });
    } catch (error) {
      console.error("PDF extraction error:", error);

      return res.status(500).json({
        success: false,
        message: "Could not extract text from the PDF.",
      });
    } finally {
      if (parser) {
        await parser.destroy();
      }
    }
  }
);

// AI-powered content analysis route
app.post("/api/check-content", async (req, res) => {
  try {
    const { content, contentType, guidelines } = req.body;

    // Validate submitted content
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid content to analyse.",
      });
    }

    // Create AI prompt
    
const prompt = `
You are BrandGuard AI, an intelligent brand governance assistant.

Analyse the submitted content using the information below.

CONTENT TYPE:
${contentType || "Not specified"}

SUBMITTED CONTENT:
${content}

BRAND GUIDELINES:
${typeof guidelines === "string" && guidelines.trim()
  ? guidelines.trim()
  : "No specific brand guidelines provided. Use general professional communication best practices."}

YOUR TASKS:

1. Overall Assessment
Summarise how well the content follows the supplied brand guidelines.

2. Brand Guideline Compliance
Identify potential violations or inconsistencies.
Mention the relevant guideline for every issue.

3. Tone and Voice
Check whether the tone matches the brand's specified personality.

4. Unsupported Claims
Identify claims that may require evidence.
Do not assume a claim is false just because it is absent from the guidelines.

5. Grammar and Clarity
Identify language and communication issues.

6. Suggested Improvements
Provide practical corrections while preserving the creator's original meaning.

7. Improved Content
Provide a revised version of the submitted content.

IMPORTANT RULES:
- Never invent brand guidelines.
- Never label an issue a confirmed violation unless a supplied guideline clearly supports that conclusion.
- Distinguish confirmed violations, potential inconsistencies and unverifiable claims.
- If guidelines do not address an issue, say so.
- Be constructive and specific.
- Do not classify unsupported claims as false merely because they are absent from the guidelines.

ISSUE CLASSIFICATION:

Return all four categories every time:

1. Tone and Voice
2. Brand Guideline Compliance
3. Unsupported or Unverifiable Claims
4. Grammar and Language

For each category, provide:
- status: "Confirmed Issue", "Potential Issue", or "No Issue"
- explanation: explain the finding
- evidence: exact text supporting the finding, or an empty string
- guidelineReference: relevant guideline, or an empty string

Return ONLY valid JSON. Do not use Markdown code fences.

Use this exact JSON structure:

{
  "overallAssessment": "Summary of the analysis",
  "issueClassification": {
    "toneAndVoice": {
      "status": "No Issue",
      "explanation": "No issue identified",
      "evidence": "",
      "guidelineReference": ""
    },
    "brandGuidelineCompliance": {
      "status": "Confirmed Issue",
      "explanation": "Explanation",
      "evidence": "Relevant submitted text",
      "guidelineReference": "Relevant guideline"
    },
    "unsupportedClaims": {
      "status": "Potential Issue",
      "explanation": "Explanation",
      "evidence": "Relevant submitted text",
      "guidelineReference": ""
    },
    "grammarAndLanguage": {
      "status": "No Issue",
      "explanation": "No issue identified",
      "evidence": "",
      "guidelineReference": ""
    }
  },
  "suggestedImprovements": [
    "First suggestion",
    "Second suggestion"
  ],
  "improvedContent": "The complete revised content"
}

ADDITIONAL RULES:
- Use only the three allowed status values.
- Use "No Issue" only when no issue is identified.
- If no issue exists, explanation must say "No issue identified".
- Never invent evidence or guideline references.
- If no guidelines were provided, do not claim a brand guideline was violated.
- Unsupported claims may be potential issues even without a corresponding guideline.
`;


    // Try Gemini up to 3 times
    let response;
    let attempts = 0;

    while (attempts < 3) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash-lite",
          contents: prompt,
          config: {
            maxOutputTokens: 4096,
          },
        });

        break;
      } catch (error) {
        attempts++;

        if (error.status !== 503 || attempts >= 3) {
          throw error;
        }

        console.log(`Gemini busy. Retry attempt ${attempts}/2`);

        await new Promise((resolve) =>
          setTimeout(resolve, attempts * 3000)
        );
      }
    }

    // Check Gemini response
const aiMessage = response?.text;

if (!aiMessage) {
  throw new Error("Gemini returned an empty response.");
}

// Remove Markdown code fences if Gemini includes them
const cleanedResponse = aiMessage
  .replace(/^```json\s*/i, "")
  .replace(/^```\s*/i, "")
  .replace(/\s*```$/, "")
  .trim();

// Convert Gemini's JSON text into a JavaScript object
let parsedAnalysis;

try {
  parsedAnalysis = JSON.parse(cleanedResponse);
} catch (parseError) {
  console.error("Gemini JSON parsing failed:", aiMessage);
  throw new Error("Gemini returned an invalid JSON response.");
}

// Validate the four required issue categories
const classification = parsedAnalysis.issueClassification;

if (
  !classification ||
  !classification.toneAndVoice ||
  !classification.brandGuidelineCompliance ||
  !classification.unsupportedClaims ||
  !classification.grammarAndLanguage
) {
  throw new Error("Gemini returned an incomplete issue classification.");
}

const readableAnalysis = `
## Overall Assessment

${parsedAnalysis.overallAssessment || "No overall assessment provided."}

## Issue Classification

### 1. Tone and Voice
**Status:** ${classification.toneAndVoice.status}

${classification.toneAndVoice.explanation}

### 2. Brand Guideline Compliance
**Status:** ${classification.brandGuidelineCompliance.status}

${classification.brandGuidelineCompliance.explanation}

**Guideline Reference:** ${classification.brandGuidelineCompliance.guidelineReference || "Not provided"}

### 3. Unsupported or Unverifiable Claims
**Status:** ${classification.unsupportedClaims.status}

${classification.unsupportedClaims.explanation}

**Evidence:** ${classification.unsupportedClaims.evidence || "Not provided"}

### 4. Grammar and Language
**Status:** ${classification.grammarAndLanguage.status}

${classification.grammarAndLanguage.explanation}

## Suggested Improvements

${
  Array.isArray(parsedAnalysis.suggestedImprovements)
    ? parsedAnalysis.suggestedImprovements
        .map((item) => `- ${item}`)
        .join("\n")
    : "No suggestions provided."
}

## Improved Content

${parsedAnalysis.improvedContent || "No revised content provided."}
`;


    // Save submission and AI analysis in MongoDB
const newSubmission = new Submission({
  content: content.trim(),
  contentType: contentType || "Not specified",
  guidelines:
    typeof guidelines === "string" ? guidelines : "",
aiAnalysis: readableAnalysis,

  // Save structured AI issue classification
  issueClassification: parsedAnalysis.issueClassification,

  // Save the overall assessment separately
  overallAssessment: parsedAnalysis.overallAssessment || "",
});

await newSubmission.save();
    console.log("Submission saved successfully:", newSubmission._id);

    // Send successful response to frontend
    return res.status(200).json({
      success: true,
      status: "AI Analysis Complete",
message: readableAnalysis,
      submissionId: newSubmission._id,
    });
  } catch (error) {
    console.error("Content analysis error:", error);

    if (!res.headersSent) {
      return res.status(error.status === 503 ? 503 : 500).json({
        success: false,
        message:
          error.status === 503
            ? "Gemini is temporarily busy. Please try again shortly."
            : "AI analysis or database saving failed. Please check the backend terminal.",
      });
    }
  }
});

// Start backend server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error);
    process.exit(1);
  }
};

startServer();
