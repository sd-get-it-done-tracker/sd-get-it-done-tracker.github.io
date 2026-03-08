import { useState } from "react";

export default function WelcomeModal() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={() => setOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>SD Neighborhood Issue Tracker</h2>
        <p className="modal-subtitle">
          Explore nearly 1 million Get It Done 311 service requests across San Diego,
          powered by DuckDB-WASM and Mosaic cross-filtering — entirely in your browser.
        </p>

        <div className="modal-section">
          <h3>What is this?</h3>
          <p>
            San Diego's <strong>Get It Done</strong> program lets residents report
            non-emergency quality-of-life issues — illegal dumping, potholes, graffiti,
            encampments, parking violations, and more. This dashboard visualizes every
            report from 2016 to today, letting you drill down by region, issue type,
            status, and time period.
          </p>
        </div>

        <div className="modal-section">
          <h3>How to use</h3>
          <div className="modal-tips">
            <div className="modal-tip">
              <span className="tip-icon">&#9650;</span>
              <div>
                <strong>Click a bar</strong> in any chart to filter by that category.
                <strong> Cmd+click</strong> (or Shift+click) to select multiple values.
              </div>
            </div>
            <div className="modal-tip">
              <span className="tip-icon">&#9744;</span>
              <div>
                <strong>Shift+drag</strong> on the map to draw a selection rectangle.
                Click inside the rectangle to <strong>drag it around</strong>.
              </div>
            </div>
            <div className="modal-tip">
              <span className="tip-icon">&#8596;</span>
              <div>
                <strong>Brush the timeline</strong> at the bottom to filter by date range.
                The background bars show the full distribution for context.
              </div>
            </div>
            <div className="modal-tip">
              <span className="tip-icon">&#8635;</span>
              <div>
                All views are <strong>cross-filtered</strong> — selecting in one chart
                instantly updates all others. Click <strong>Clear Filters</strong> to reset.
              </div>
            </div>
          </div>
        </div>

        <div className="modal-section">
          <h3>Try this</h3>
          <p>
            Click <strong>"Illegal Dumping"</strong> in the service type chart, then brush
            the timeline to 2024 — watch the map light up with hotspots. Shift+drag a
            rectangle around a cluster to see which neighborhoods and statuses are
            most affected. Every filter compounds, so you can progressively narrow
            from citywide trends down to a single block.
          </p>
        </div>

        <div className="modal-footer">
          <div className="modal-source">
            Source: data.sandiego.gov | ~967K records (2016 - present)
          </div>
          <button className="modal-close-btn" onClick={() => setOpen(false)}>
            Start Exploring
          </button>
        </div>
      </div>
    </div>
  );
}
