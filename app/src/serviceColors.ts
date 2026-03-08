// Shared color map for service types — used by both map dots and bar charts
export const SERVICE_COLORS: Record<string, [number, number, number]> = {
  "Illegal Dumping": [230, 81, 0],
  "Parking Violation": [21, 101, 192],
  "Encampment": [198, 40, 40],
  "Missed Collection": [46, 125, 50],
  "Graffiti - Public": [106, 27, 154],
  "Pothole": [249, 168, 37],
  "Street Light Maintenance": [0, 131, 143],
  "Sidewalk Repair Issue": [78, 52, 46],
  "Graffiti - Code Enforcement": [142, 36, 170],
  "ROW Maintenance": [56, 142, 60],
  "Other": [120, 144, 156],
  "Parks Issue": [27, 94, 32],
  "Tree Maintenance": [104, 159, 56],
  "Missed Collection - Recycling": [0, 137, 123],
  "Environmental Services Code Compliance": [121, 85, 72],
  "Parking - 72-Hours": [63, 81, 181],
};

export const DEFAULT_COLOR: [number, number, number] = [120, 144, 156];

export function rgbToHex([r, g, b]: [number, number, number]): string {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

export function getServiceColor(name: string): string {
  return rgbToHex(SERVICE_COLORS[name] || DEFAULT_COLOR);
}
