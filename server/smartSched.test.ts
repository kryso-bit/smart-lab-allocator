import { describe, expect, it } from "vitest";
import { runOptimizer, simulateUnavailable, repairSchedule, smartStore, validateCsv } from "./smartSchedStore";

describe("SmartSched CP-SAT engine", () => {
  it("generates a feasible deterministic demo schedule with no hard conflicts", () => {
    const result = runOptimizer();
    expect(result.schedule).toHaveLength(30);
    expect(result.metrics.hardViolations).toBe(0);
    expect(result.version.label).toBe("Schedule v1");
    expect(smartStore.versions).toHaveLength(1);
  });

  it("validates CSV headers and identifies affected classes before repair", () => {
    expect(validateCsv("rooms", "name,capacity\nROOM-X,50")).toMatchObject({ rowCount: 1 });
    expect(() => validateCsv("rooms", "name\nROOM-X")).toThrow("required columns");
    const impact = simulateUnavailable("lab-2", "lab", "Wednesday", "Maintenance");
    expect(Array.isArray(impact.affected)).toBe(true);
    const repaired = repairSchedule(impact.change);
    expect(repaired.version.reason).toBe("repair");
    expect(repaired.afterMetrics.hardViolations).toBe(0);
  });
});
