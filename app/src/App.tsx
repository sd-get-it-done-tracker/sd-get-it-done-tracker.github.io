import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as vg from "@uwdata/vgplot";
import { MosaicClient, Coordinator } from "@uwdata/mosaic-core";
import { Query, sql } from "@uwdata/mosaic-sql";
import MapView from "./components/MapView";
import Histogram from "./components/Histogram";
import Timeline from "./components/Timeline";
import WelcomeModal from "./components/WelcomeModal";

export interface PointData {
  service_request_id: number;
  lat: number;
  lng: number;
  service_name: string;
  status: string;
  comm_plan_name: string;
  case_age_days: number | null;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [loadMsg, setLoadMsg] = useState("Initializing DuckDB-WASM...");
  const [error, setError] = useState<string | null>(null);
  const [mosaicReady, setMosaicReady] = useState(false);
  const [allPoints, setAllPoints] = useState<PointData[]>([]);
  const [filteredIds, setFilteredIds] = useState<Set<number> | null>(null);
  const [filteredPoints, setFilteredPoints] = useState<PointData[]>([]);
  const brushRef = useRef<ReturnType<typeof vg.Selection.crossfilter> | null>(null);
  const mapSourceRef = useRef({ source: "map-brush" });
  const initialized = useRef(false);
  const allPointsRef = useRef<PointData[]>([]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function init() {
      try {
        const wasm = vg.wasmConnector();
        // Create coordinator with preaggregation disabled — preagg tables
        // don't have lat/lng columns, breaking our map spatial predicates
        const coord = new Coordinator(wasm, { preagg: { enabled: false } });
        vg.coordinator(coord);

        setLoadMsg("Loading parquet data...");
        const parquetUrl = `${window.location.origin}/data/gid.parquet`;
        await vg.coordinator().exec(`
          CREATE TABLE gid AS
          SELECT * FROM read_parquet('${parquetUrl}')
        `);

        setLoadMsg("Pre-loading map points...");
        const pointsResult = await vg.coordinator().query(`
          SELECT service_request_id, lat, lng, service_name, status, comm_plan_name, case_age_days
          FROM gid
          WHERE lat IS NOT NULL AND lng IS NOT NULL
        `);
        const pts = pointsResult.toArray() as PointData[];
        allPointsRef.current = pts;
        setAllPoints(pts);
        setFilteredPoints(pts);

        brushRef.current = vg.Selection.crossfilter();
        setMosaicReady(true);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError(String(e));
        setLoading(false);
      }
    }

    init();
  }, []);

  // Connect MapFilterClient AFTER mosaicReady and AFTER histograms render
  // Use a slight delay so histogram marks register first
  useEffect(() => {
    if (!mosaicReady || !brushRef.current) return;

    const selection = brushRef.current;
    const coord = vg.coordinator();

    class MapFilterClient extends MosaicClient {
      constructor() {
        super(selection);
      }

      query(filter?: unknown) {
        const predicates = filter as (string | boolean)[] | undefined;
        console.log("[MapClient] query(), predicates:", predicates);

        const q = Query
          .select({ service_request_id: "service_request_id" })
          .from("gid")
          .where("lat IS NOT NULL", "lng IS NOT NULL");

        if (predicates && Array.isArray(predicates) && predicates.length > 0) {
          q.where(predicates);
        }

        return q;
      }

      queryResult(data: unknown) {
        const d = data as { toArray?: () => { service_request_id: number }[] };
        if (!d?.toArray) return this;
        const rows = d.toArray();
        const total = allPointsRef.current.length;
        console.log("[MapClient] queryResult:", rows.length, "of", total);

        if (rows.length >= total) {
          setFilteredIds(null);
          setFilteredPoints(allPointsRef.current);
        } else {
          const ids = new Set(rows.map((r) => r.service_request_id));
          setFilteredIds(ids);
          setFilteredPoints(allPointsRef.current.filter((p) => ids.has(p.service_request_id)));
        }
        return this;
      }

      update() {
        return this;
      }

      queryError(err: Error) {
        console.error("[MapClient] query error:", err);
        return this;
      }
    }

    // Small delay to let histogram marks connect first
    const tid = setTimeout(() => {
      const client = new MapFilterClient();
      coord.connect(client);
    }, 100);

    return () => clearTimeout(tid);
  }, [mosaicReady]);

  // Map rectangle brush → Mosaic crossfilter
  const handleMapBrush = useCallback(
    (bounds: { north: number; south: number; east: number; west: number } | null) => {
      if (!brushRef.current) return;
      const selection = brushRef.current;

      if (!bounds) {
        const clause = {
          source: mapSourceRef.current,
          predicate: null,
          value: null,
        };
        selection.update(clause);
        return;
      }

      const { north, south, east, west } = bounds;
      const clause = {
        source: mapSourceRef.current,
        predicate: sql`lng BETWEEN ${west} AND ${east} AND lat BETWEEN ${south} AND ${north}`,
        value: bounds,
      };
      selection.update(clause);
    },
    []
  );

  const handleClearSelection = useCallback(() => {
    if (!brushRef.current) return;
    const selection = brushRef.current;
    const clauses = (selection as unknown as { clauses?: { source?: unknown }[] }).clauses || [];
    for (const clause of clauses) {
      if (clause.source) {
        try {
          selection.update({ source: clause.source, predicate: null, value: null });
        } catch (_) { /* ignore */ }
      }
    }
    selection.update({ source: mapSourceRef.current, predicate: null, value: null });
  }, []);

  const isFiltered = filteredIds !== null;

  const kpis = useMemo(() => {
    const pts = filteredPoints;
    const total = pts.length;
    if (total === 0) return { total: 0, closedPct: 0, topService: "—", avgDaysToClose: "—" };

    let closed = 0;
    let ageSum = 0;
    let ageCount = 0;
    const serviceCounts: Record<string, number> = {};

    for (const p of pts) {
      if (p.status === "Closed") closed++;
      serviceCounts[p.service_name] = (serviceCounts[p.service_name] || 0) + 1;
      if (p.status === "Closed" && p.case_age_days != null && p.case_age_days > 0) {
        ageSum += p.case_age_days;
        ageCount++;
      }
    }

    const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    const closedPct = Math.round((closed / total) * 100);
    const avgDays = ageCount > 0 ? Math.round(ageSum / ageCount) : "—";

    return { total, closedPct, topService, avgDaysToClose: avgDays };
  }, [filteredPoints]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>{loadMsg}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: "#c00", padding: 40, fontFamily: "'Space Mono', monospace" }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div className="app">
      <WelcomeModal />
      <div className="header">
        <div className="header-left">
          <h1>SD Neighborhood Issue Tracker</h1>
          <p>
            Get It Done 311 — {allPoints.length.toLocaleString()} reports
            {isFiltered && (
              <span className="point-count">
                {" "} | {filteredPoints.length.toLocaleString()} match filters
              </span>
            )}
          </p>
        </div>
        {isFiltered && (
          <button className="clear-btn" onClick={handleClearSelection}>
            Clear Filters
          </button>
        )}
      </div>

      <div className="kpi-bar">
        <div className="kpi-card">
          <div className="kpi-value">{kpis.total.toLocaleString()}</div>
          <div className="kpi-label">{isFiltered ? "Filtered" : "Total"} Reports</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{kpis.closedPct}%</div>
          <div className="kpi-label">Closed</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value kpi-text">{kpis.topService}</div>
          <div className="kpi-label">Top Issue</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{typeof kpis.avgDaysToClose === "number" ? kpis.avgDaysToClose.toLocaleString() : kpis.avgDaysToClose}</div>
          <div className="kpi-label">Avg Days to Close</div>
        </div>
      </div>

      <div className="main-content">
        <div className="map-panel">
          <MapView points={filteredPoints} allPoints={allPoints} isFiltered={isFiltered} onBrush={handleMapBrush} />
        </div>
        <div className="charts-panel">
          <div className="chart-card">
            {mosaicReady && (
              <Histogram
                brush={brushRef.current!}
                table="gid"
                column="service_name"
                color="#0d7680"
                limit={15}
                useServiceColors
              />
            )}
          </div>
          <div className="chart-card">
            <div className="chart-title">Neighborhood</div>
            {mosaicReady && (
              <Histogram
                brush={brushRef.current!}
                table="gid"
                column="comm_plan_name"
                color="#7986cb"
                limit={15}
              />
            )}
          </div>
          <div className="chart-card">
            <div className="chart-title">Status</div>
            {mosaicReady && (
              <Histogram
                brush={brushRef.current!}
                table="gid"
                column="status"
                color="#990f3d"
              />
            )}
          </div>
        </div>
      </div>

      <div className="timeline-panel">
        {mosaicReady && (
          <Timeline brush={brushRef.current!} table="gid" column="date_requested" />
        )}
      </div>
    </div>
  );
}
