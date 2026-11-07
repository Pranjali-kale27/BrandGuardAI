import { useState } from "react";

function BrandGuidelines({ onGuidelinesChange }) {
  const [guidelines, setGuidelines] = useState("");
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTextChange = (event) => {
    const value = event.target.value;
    setGuidelines(value);
    onGuidelinesChange(value);
    setMessage("");
  };

  const handlePdfUpload = async () => {
    if (!file) {
      setMessage("Please select a PDF first.");
      return;
    }

    const formData = new FormData();
    formData.append("guidelines", file);

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/upload-guidelines",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "PDF upload failed.");
      }

      setGuidelines(data.guidelines);
      onGuidelinesChange(data.guidelines);
      setMessage("PDF guidelines uploaded successfully.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="brand-guidelines">
      <h2>Brand Guidelines</h2>
      <p>Upload your brand guideline PDF or paste your rules below.</p>

      <label htmlFor="guideline-pdf">Upload PDF</label>
      <input
        id="guideline-pdf"
        type="file"
        accept=".pdf,application/pdf"
        onChange={(event) => setFile(event.target.files[0] || null)}
      />

      <button type="button" onClick={handlePdfUpload} disabled={loading}>
        {loading ? "Extracting PDF..." : "Upload and Extract PDF"}
      </button>

      <label htmlFor="guideline-text">Or paste brand guidelines</label>
      <textarea
        id="guideline-text"
        rows="6"
        value={guidelines}
        onChange={handleTextChange}
        placeholder="Example: Use a friendly and professional tone. Always write our brand name as BrandGuard AI..."
      />

      {message && <p>{message}</p>}
    </section>
  );
}

export default BrandGuidelines;