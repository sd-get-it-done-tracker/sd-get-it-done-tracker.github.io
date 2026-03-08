import { useEffect, useRef } from "react";
import * as vg from "@uwdata/vgplot";

interface Props {
  brush: ReturnType<typeof vg.Selection.crossfilter>;
  table: string;
  column: string;
}

export default function Timeline({ brush, table, column }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  useEffect(() => {
    if (rendered.current || !containerRef.current) return;
    rendered.current = true;

    const parentWidth = containerRef.current.parentElement?.clientWidth ?? 800;
    const binOpts = { interval: "month" };

    const plot = vg.plot(
      // Background: full unfiltered distribution
      vg.rectY(
        vg.from(table),
        {
          x: vg.bin(column, binOpts),
          y: vg.count(),
          fill: "#e8d6c8",
          fillOpacity: 0.5,
          insetLeft: 0.5,
          insetRight: 0.5,
        }
      ),
      // Foreground: filtered
      vg.rectY(
        vg.from(table, { filterBy: brush }),
        {
          x: vg.bin(column, binOpts),
          y: vg.count(),
          fill: "#0d7680",
          insetLeft: 0.5,
          insetRight: 0.5,
        }
      ),
      vg.intervalX({ as: brush }),
      vg.xDomain(vg.Fixed),
      vg.yTickFormat("s"),
      vg.xLabel(null),
      vg.yLabel(null),
      vg.width(parentWidth - 40),
      vg.height(90),
      vg.marginLeft(50),
      vg.marginRight(20),
      vg.marginTop(5),
      vg.marginBottom(35),
      vg.style({
        background: "transparent",
        color: "#66605c",
        fontSize: "11px",
        fontFamily: "'Space Mono', monospace",
      })
    );

    containerRef.current.appendChild(plot as Node);
  }, [brush, table, column]);

  return <div ref={containerRef} />;
}
