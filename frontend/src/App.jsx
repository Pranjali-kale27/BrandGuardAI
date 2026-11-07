
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import BrandGuidelines from "./BrandGuidelines";
import SubmissionHistory from "./SubmissionHistory";
import Analytics from "./Analytics";
import IssueAnalytics from "./IssueAnalytics";
import "./App.css";

function App() {
  const [content, setContent] = useState("");
  const [guidelines, setGuidelines] = useState("");
  const [contentType, setContentType] = useState("Social Media Post");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewStatus, setReviewStatus] = useState("Pending Review");
  const [reviewerFeedback, setReviewerFeedback] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  async function checkContent(event) {
    event.preventDefault();

    if (!content.trim()) {
      setError("Please enter some content to check.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setReviewError("");
    setReviewStatus("Pending Review");
    setReviewerFeedback("");
    setReviewSubmitted(false);

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 45000);

    try {
      const response = await fetch(
        "http://localhost:5000/api/check-content",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            contentType,
            guidelines,
          }),
          signal: controller.signal,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "The AI analysis request failed."
        );
      }

      if (!data.submissionId) {
        throw new Error(
          "AI analysis completed, but no submission ID was returned. Please check the backend save operation."
        );
      }

      // Save the submission ID as well as the AI result.
      setResult({
        status: data.status || "AI Analysis Complete",
        message: data.message || "No analysis was returned.",
        submissionId: data.submissionId,
      });

    } catch (err) {
      console.error("BrandGuard AI error:", err);

      if (err.name === "AbortError") {
        setError(
          "The AI request took too long. Gemini may be busy. Please try again."
        );
      } else {
        setError(
          err.message ||
            "Could not connect to the backend. Please check that it is running."
        );
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  async function saveReview(status) {
    try {
      setReviewError("");

      if (!result?.submissionId) {
        throw new Error(
          "Submission ID is missing. Please submit your content again."
        );
      }

      if (
        status === "Revision Requested" &&
        !reviewerFeedback.trim()
      ) {
        throw new Error(
          "Please enter feedback before requesting a revision."
        );
      }

      const response = await fetch(
        `http://localhost:5000/api/submissions/${result.submissionId}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reviewStatus: status,
            reviewerFeedback,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Could not save the review decision."
        );
      }

      setReviewStatus(data.submission.reviewStatus);
      setReviewSubmitted(true);

    } catch (err) {
      console.error("Review error:", err);
      setReviewError(err.message);
    }
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <h2 className="logo">
          BrandGuard<span> AI</span>
        </h2>

        <nav>
          <div className="nav-item active">Dashboard</div>
          <div className="nav-item">Content Checker</div>
          <div className="nav-item">Brand Guidelines</div>
          <div className="nav-item">Review History</div>
        </nav>

        <div className="sidebar-footer">
          <p>Brand governance made simple.</p>
        </div>
      </aside>

      {/* Main Dashboard */}
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">BRAND WORKSPACE</p>
            <h1>Dashboard</h1>
          </div>

          <div className="user-profile">Team Admin</div>
        </header>

        {/* Welcome Section */}
        <section className="welcome">
          <div>
            <p className="eyebrow">
              WELCOME TO BRANDGUARD AI
            </p>

            <h2>Create freely. Stay on brand.</h2>

            <p>
              Check your content against brand guidelines
              before publishing.
            </p>
          </div>
        </section>

        <BrandGuidelines onGuidelinesChange={setGuidelines} />
        <Analytics />
        <IssueAnalytics />

        {/* Content Checker and Information */}
        <section className="content-grid">
          <div className="panel checker-panel">
            <h2>Check your content</h2>

            <p className="description">
              Submit your content to receive an AI-powered
              analysis of potential brand and communication issues.
            </p>

            <form onSubmit={checkContent}>
              <label htmlFor="contentType">
                Content type
              </label>

              <select
                id="contentType"
                value={contentType}
                onChange={(event) => {
                  setContentType(event.target.value);
                  setResult(null);
                }}
              >
                <option>Social Media Post</option>
                <option>Advertisement</option>
                <option>Website Content</option>
                <option>Email Campaign</option>
                <option>Marketing Copy</option>
              </select>

              <label htmlFor="content">
                Your content
              </label>

              <textarea
                id="content"
                placeholder="Paste your marketing content here..."
                value={content}
                onChange={(event) => {
                  setContent(event.target.value);
                  setResult(null);
                  setError("");
                }}
                rows="8"
              />

              <div className="character-count">
                {content.length} characters
              </div>

              <button type="submit" disabled={loading}>
                {loading
                  ? "Analysing your content..."
                  : "Check Brand Compliance →"}
              </button>
            </form>

            {error && (
              <div className="error-message">
                <strong>Something went wrong</strong>
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="panel info-panel">
            <h2>How it works</h2>

            <div className="step">
              <span>01</span>
              <div>
                <h3>Submit content</h3>
                <p>Paste your content into the checker.</p>
              </div>
            </div>

            <div className="step">
              <span>02</span>
              <div>
                <h3>AI analysis</h3>
                <p>
                  Gemini analyses potential communication
                  and brand issues.
                </p>
              </div>
            </div>

            <div className="step">
              <span>03</span>
              <div>
                <h3>Review and approve</h3>
                <p>
                  Review AI suggestions before publishing.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AI Analysis Result and Human Review */}
        {result && (
          <section className="panel result-panel">
            <p className="eyebrow">
              BRANDGUARD AI ANALYSIS
            </p>

            <h2>{result.status}</h2>

            <p>
              <strong>Content type:</strong> {contentType}
            </p>

            <div className="ai-response">
              <ReactMarkdown>{result.message}</ReactMarkdown>
            </div>

            <div className="review-panel">
              <h2>Human Review & Approval</h2>

              <p>
                Review the AI findings before making a publishing
                decision.
              </p>

              <div className="review-status">
                Review Status: <strong>{reviewStatus}</strong>
              </div>

              <label htmlFor="review-feedback">
                Reviewer Feedback
              </label>

              <textarea
                id="review-feedback"
                rows="4"
                value={reviewerFeedback}
                onChange={(event) =>
                  setReviewerFeedback(event.target.value)
                }
                placeholder="Enter your feedback or requested changes..."
              />

              {reviewError && (
                <p className="review-error">{reviewError}</p>
              )}

              <div className="review-actions">
                <button
                  type="button"
                  disabled={loading || reviewSubmitted}
                  onClick={() => saveReview("Approved")}
                >
                  Approve Content
                </button>

                <button
                  type="button"
                  disabled={loading || reviewSubmitted}
                  onClick={() => saveReview("Revision Requested")}
                >
                  Request Revision
                </button>
              </div>

              {reviewSubmitted && (
                <p className="review-confirmation">
                  Decision recorded: {reviewStatus}
                </p>
              )}
            </div>

            <p className="result-note">
              AI-generated suggestions are advisory.
              Review the findings before publishing.
            </p>
          </section>
        )}

        <SubmissionHistory />

        <footer>
          BrandGuard AI · Intelligent brand governance
        </footer>
      </main>
    </div>
  );
}

export default App;
