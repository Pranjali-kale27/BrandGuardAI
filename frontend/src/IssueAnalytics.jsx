
import { useEffect, useState } from "react";

function IssueAnalytics() {
  const [analytics, setAnalytics] = useState({
    issueCounts: {},
    confirmedIssueCounts: {},
    potentialIssueCounts: {},
    totalConfirmedIssues: 0,
    totalPotentialIssues: 0,
    classifiedSubmissions: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchIssues() {
    try {
      const response = await fetch(
        "http://localhost:5000/api/issue-analytics"
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Could not load issue analytics."
        );
      }

      setAnalytics({
        issueCounts: data.issueCounts || {},
        confirmedIssueCounts: data.confirmedIssueCounts || {},
        potentialIssueCounts: data.potentialIssueCounts || {},
        totalConfirmedIssues: data.totalConfirmedIssues || 0,
        totalPotentialIssues: data.totalPotentialIssues || 0,
        classifiedSubmissions: data.classifiedSubmissions || 0,
      });

      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchIssues();

    const interval = setInterval(fetchIssues, 10000);

    return () => clearInterval(interval);
  }, []);

  const issueList = Object.entries(
    analytics.issueCounts
  ).sort((a, b) => b[1] - a[1]);

  const highestCount = Math.max(
    1,
    ...issueList.map((issue) => issue[1])
  );

  return (
    <section className="issue-analytics panel">
      <p className="eyebrow">CONTENT INSIGHTS</p>
      <h2>Common Brand Issues</h2>

      <p className="description">
        Issues identified by Gemini's structured content analysis.
      </p>

      {loading ? (
        <p>Loading issue analytics...</p>
      ) : error ? (
        <p className="review-error">{error}</p>
      ) : (
        <>
          <div className="analytics-grid">
            <div className="analytics-card">
              <span>Confirmed Issues</span>
              <strong>{analytics.totalConfirmedIssues}</strong>
            </div>

            <div className="analytics-card">
              <span>Potential Issues</span>
              <strong>{analytics.totalPotentialIssues}</strong>
            </div>

            <div className="analytics-card">
              <span>Classified Submissions</span>
              <strong>{analytics.classifiedSubmissions}</strong>
            </div>
          </div>

          <h3>Category Breakdown</h3>

          <div className="issue-list">
            {issueList.map(([name, count]) => {
              const confirmed =
                analytics.confirmedIssueCounts[name] || 0;

              const potential =
                analytics.potentialIssueCounts[name] || 0;

              return (
                <div className="issue-item" key={name}>
                  <div className="issue-item-heading">
                    <strong>{name}</strong>
                    <span>{count} issues</span>
                  </div>

                  <div className="issue-track">
                    <div
                      className="issue-fill"
                      style={{
                        width: `${(count / highestCount) * 100}%`,
                      }}
                    />
                  </div>

                  <p className="issue-breakdown">
                    Confirmed: {confirmed} | Potential: {potential}
                  </p>
                </div>
              );
            })}
          </div>

          {analytics.classifiedSubmissions === 0 && (
            <p>
              No structured classifications yet. Submit new content
              to see issue analytics.
            </p>
          )}
        </>
      )}

      <p className="issue-note">
        Confirmed and potential issues are counted separately.
        Submissions marked "No Issue" are not included in issue totals.
      </p>
    </section>
  );
}

export default IssueAnalytics;
