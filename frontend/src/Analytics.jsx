
import { useEffect, useState } from "react";

function Analytics() {
  const [analytics, setAnalytics] = useState({
    totalSubmissions: 0,
    approved: 0,
    pending: 0,
    revisionRequested: 0,
    reviewed: 0,
    complianceScore: 0,
    revisionPercentage: 0,
    });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchAnalytics() {
    try {
      const response = await fetch(
        "http://localhost:5000/api/analytics"
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load analytics.");
      }

      setAnalytics(data.analytics);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();

    const interval = setInterval(fetchAnalytics, 10000);

    return () => clearInterval(interval);
  }, []);

  const cards = [
    {
      title: "Total Submissions",
      value: analytics.totalSubmissions,
      icon: "📄",
    },
    {
      title: "Approved",
      value: analytics.approved,
      icon: "✅",
    },
    {
      title: "Pending Review",
      value: analytics.pending,
      icon: "⏳",
    },
    {
      title: "Revision Requested",
      value: analytics.revisionRequested,
      icon: "📝",
    },
  ];

  return (
    <section className="analytics-section">
      <div className="analytics-heading">
        <div>
          <p className="eyebrow">PERFORMANCE OVERVIEW</p>
          <h2>Content Analytics</h2>
        </div>
      </div>

      {loading ? (
        <p>Loading analytics...</p>
      ) : error ? (
        <p className="review-error">{error}</p>
      ) : (
        <div className="analytics-grid">
          {cards.map((card) => (
            <div className="analytics-card" key={card.title}>
              <div className="analytics-card-top">
                <span>{card.title}</span>
                <span>{card.icon}</span>
              </div>

              <h3>{card.value}</h3>
            </div>
          ))}
        </div>

        
      )}
      
<div className="compliance-panel">
  <div className="compliance-heading">
    <div>
      <p className="eyebrow">BRAND PERFORMANCE</p>
      <h2>Brand Compliance Score</h2>
    </div>

    <h3>{analytics.complianceScore}%</h3>
  </div>

  <div className="compliance-track">
    <div
      className="compliance-fill"
      style={{
        width: `${analytics.complianceScore}%`,
      }}
    />
  </div>

  <div className="compliance-details">
    <span>
      Approved: {analytics.approved}
    </span>

    <span>
      Revision requested: {analytics.revisionRequested}
    </span>
  </div>

  <p className="compliance-note">
    Calculated from reviewed submissions only.
    Pending submissions are excluded.
  </p>
</div>

    </section>
  );
}

export default Analytics;
