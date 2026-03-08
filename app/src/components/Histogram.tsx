import { useEffect, useRef } from "react";
import * as vg from "@uwdata/vgplot";
import { getServiceColor } from "../serviceColors";

interface Props {
  brush: ReturnType<typeof vg.Selection.crossfilter>;
  table: string;
  column: string;
  color: string;
  limit?: number;
  useServiceColors?: boolean;
}

export default function Histogram({ brush, table, column, color, limit, useServiceColors }: Props) {
  const plotRef = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  useEffect(() => {
    if (rendered.current || !plotRef.current) return;
    rendered.current = true;

    const parentWidth = plotRef.current.parentElement?.clientWidth ?? 400;
    const sortOpt = limit ? { y: "-x" as const, limit } : { y: "-x" as const };
    const ml = column === "service_name" ? 195 : column === "comm_plan_name" ? 170 : 80;

    const marks: unknown[] = [];

    marks.push(
      vg.barX(vg.from(table), {
        x: vg.count(),
        y: column,
        fill: "#e8d6c8",
        fillOpacity: 0.5,
        sort: sortOpt,
      })
    );

    if (useServiceColors) {
      marks.push(
        vg.barX(vg.from(table, { filterBy: brush }), {
          x: vg.count(),
          y: column,
          fill: column,
          sort: sortOpt,
        })
      );
    } else {
      marks.push(
        vg.barX(vg.from(table, { filterBy: brush }), {
          x: vg.count(),
          y: column,
          fill: color,
          sort: sortOpt,
        })
      );
    }

    const plotArgs: unknown[] = [
      ...marks,
      vg.toggleY({ as: brush }),
      vg.yDomain(vg.Fixed),
      vg.xTickFormat("s"),
      vg.xLabel(null),
      vg.yLabel(null),
      vg.width(parentWidth - 24),
      vg.marginLeft(ml),
      vg.marginRight(10),
      vg.marginTop(5),
      vg.marginBottom(20),
      vg.style({
        background: "transparent",
        color: "#66605c",
        fontSize: "11px",
        fontFamily: "'Space Mono', monospace",
      }),
    ];

    if (useServiceColors) {
      const domain = [
        "Illegal Dumping", "Parking Violation", "Encampment", "Missed Collection",
        "Graffiti - Public", "Pothole", "Street Light Maintenance", "Sidewalk Repair Issue",
        "Graffiti - Code Enforcement", "ROW Maintenance", "Other", "Parks Issue",
        "Tree Maintenance", "Missed Collection - Recycling",
        "Environmental Services Code Compliance", "Parking - 72-Hours",
      ];
      const range = domain.map((d) => getServiceColor(d));
      plotArgs.push(vg.colorDomain(domain));
      plotArgs.push(vg.colorRange(range));
    }

    const plot = (vg.plot as (...args: unknown[]) => Node)(...plotArgs);
    const container = plotRef.current;
    container.appendChild(plot);

    // Track which bar indices are selected
    const selectedIndices = new Set<number>();
    let applying = false;

    function apply() {
      if (applying) return;
      applying = true;
      const svg = container.querySelector("svg");
      if (!svg) { applying = false; return; }
      const fg = svg.querySelector("g[data-index='1']");
      if (!fg) { applying = false; return; }
      const rects = fg.querySelectorAll("rect");
      rects.forEach((r, i) => {
        if (selectedIndices.has(i)) {
          r.setAttribute("stroke", "black");
          r.setAttribute("stroke-width", "2.5");
        } else {
          r.removeAttribute("stroke");
          r.removeAttribute("stroke-width");
        }
      });
      applying = false;
    }

    // Observe SVG changes to re-apply strokes after re-render
    const observer = new MutationObserver(() => {
      if (!applying) requestAnimationFrame(apply);
    });
    observer.observe(container, { childList: true, subtree: true });

    // Use 'click' so Mosaic's toggleY pointerdown fires first
    container.addEventListener("click", (e) => {
      const target = e.target as SVGElement;
      if (target.tagName !== "rect") return;
      const fg = container.querySelector("svg g[data-index='1']");
      if (!fg) return;

      const rects = Array.from(fg.querySelectorAll("rect"));
      let idx = rects.indexOf(target as SVGRectElement);

      // Also check background group
      if (idx < 0) {
        const bg = container.querySelector("svg g[data-index='0']");
        if (!bg) return;
        const bgRects = Array.from(bg.querySelectorAll("rect"));
        idx = bgRects.indexOf(target as SVGRectElement);
        if (idx < 0) return;
      }

      if (!e.metaKey && !e.shiftKey) {
        if (selectedIndices.size === 1 && selectedIndices.has(idx)) {
          selectedIndices.clear();
        } else {
          selectedIndices.clear();
          selectedIndices.add(idx);
        }
      } else {
        if (selectedIndices.has(idx)) selectedIndices.delete(idx);
        else selectedIndices.add(idx);
      }
      setTimeout(apply, 100);
    });

    return () => observer.disconnect();
  }, [brush, table, column, color, limit, useServiceColors]);

  return <div ref={plotRef} className="histogram-container" />;
}
