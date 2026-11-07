import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    contentType: {
      type: String,
      default: "Not specified",
    },
    guidelines: {
      type: String,
      default: "",
    },
    aiAnalysis: { type: String, required: true },

issueClassification: {
  type: {
    toneAndVoice: {
      status: String,
      explanation: String,
      evidence: String,
      guidelineReference: String,
    },
    brandGuidelineCompliance: {
      status: String,
      explanation: String,
      evidence: String,
      guidelineReference: String,
    },
    unsupportedClaims: {
      status: String,
      explanation: String,
      evidence: String,
      guidelineReference: String,
    },
    grammarAndLanguage: {
      status: String,
      explanation: String,
      evidence: String,
      guidelineReference: String,
    },
  },
  default: {},
},

overallAssessment: {
  type: String,
  default: "",
},
    reviewStatus: {
      type: String,
      enum: ["Pending Review", "Approved", "Revision Requested"],
      default: "Pending Review",
    },
    reviewerFeedback: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Submission = mongoose.model("Submission", submissionSchema);

export default Submission;