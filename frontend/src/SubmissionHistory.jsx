import { useEffect, useState } from "react";

function SubmissionHistory() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await fetch(
          "https://brandguard-ai-backend-ieh6.onrender.com/api/submissions"
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Failed to fetch submissions."
          );
        }

        setSubmissions(data.submissions);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  return (
    <div className="submission-history">
      <h2>Submission History</h2>

      {loading && <p>Loading submissions...</p>}

      {error && <p className="error-message">{error}</p>}

      {!loading && !error && submissions.length === 0 && (
        <p>No submissions found yet.</p>
      )}

      {!loading && !error && submissions.length > 0 && (
  <>
    <p>Total submissions: {submissions.length}</p>

    <div className="history-list">
      {submissions.map((submission) => (
        <div className="history-card" key={submission._id}>
          <h3>{submission.contentType}</h3>

          <p>
            <strong>Submitted Content:</strong>
          </p>
          <p>{submission.content}</p>

          <p>
            <strong>Review Status:</strong>{" "}
            {submission.reviewStatus}
          </p>

          <p>
            <strong>Submitted On:</strong>{" "}
            {new Date(submission.createdAt).toLocaleString()}
          </p>

          <details>
            <summary>View AI Analysis</summary>
            <pre>{submission.aiAnalysis}</pre>
          </details>

          {submission.reviewerFeedback && (
            <p>
              <strong>Reviewer Feedback:</strong>{" "}
              {submission.reviewerFeedback}
            </p>
          )}
        </div>
      ))}
    </div>
  </>
)}
    </div>
  );
}

export default SubmissionHistory;