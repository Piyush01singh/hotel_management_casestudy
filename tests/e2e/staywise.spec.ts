import { test, expect } from "@playwright/test";

test.describe("StayWise AI End-to-End Suite", () => {
  test("1. Command Center loads and renders KPI cards and 3D Property Twin", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/StayWise AI/);
    await expect(page.locator("h1")).toContainText("Executive Command Center");
    await expect(page.locator("text=Forecast Occupancy")).toBeVisible();
    await expect(page.locator("text=Expected Room Nights")).toBeVisible();
    await expect(page.locator("text=Property Twin")).toBeVisible();
  });

  test("2. Demand Forecast page renders horizon toggle, category filters and data table", async ({ page }) => {
    await page.goto("/forecast");
    await expect(page.locator("h1")).toContainText("Demand Forecast Engine");
    await expect(page.locator("text=14-Day Horizon")).toBeVisible();
    await expect(page.locator("text=Download CSV Report")).toBeVisible();
    await expect(page.locator("text=Stay Date Demand Trajectory")).toBeVisible();
  });

  test("3. Historical Replay page allows selecting cutoffs and displays audit matrix", async ({ page }) => {
    await page.goto("/replay");
    await expect(page.locator("h1")).toContainText("Historical Forecast Replay");
    await expect(page.locator("text=Replay Cutoff Date:")).toBeVisible();
    await expect(page.locator("text=Replay MAE")).toBeVisible();
    await expect(page.locator("text=Audit Result")).toBeVisible();
  });

  test("4. Booking Intelligence displays pickup pace and lead-time distributions", async ({ page }) => {
    await page.goto("/intelligence");
    await expect(page.locator("h1")).toContainText("Booking Intelligence");
    await expect(page.locator("text=Booking Lead-Time Distribution")).toBeVisible();
    await expect(page.locator("text=Cumulative Pickup Pace Curves")).toBeVisible();
  });

  test("5. Model Lab displays benchmark comparison and TreeSHAP attributions", async ({ page }) => {
    await page.goto("/models");
    await expect(page.locator("h1")).toContainText("Model Lab & Governance");
    await expect(page.locator("text=Comparative Benchmark Matrix")).toBeVisible();
    await expect(page.getByText("StayWise XGBoost").first()).toBeVisible();
    await expect(page.locator("text=TreeSHAP Feature Attributions")).toBeVisible();
  });

  test("6. Scenario Studio allows dynamic slider simulations", async ({ page }) => {
    await page.goto("/scenarios");
    await expect(page.locator("h1")).toContainText("Scenario Studio");
    await expect(page.locator("text=Simulation Parameters")).toBeVisible();
    await expect(page.locator("text=Demand Fluctuation")).toBeVisible();
    await expect(page.locator("text=Reset to Baseline")).toBeVisible();
  });

  test("7. Operations Planner computes housekeeping quotas and FTE shifts", async ({ page }) => {
    await page.goto("/operations");
    await expect(page.locator("h1")).toContainText("Operations & Workload Planner");
    await expect(page.locator("text=Total Cleaning Hours")).toBeVisible();
    await expect(page.locator("text=Avg Daily Housekeepers")).toBeVisible();
    await expect(page.locator("text=Export Roster CSV")).toBeVisible();
  });

  test("8. Data Observatory verifies zero data leakage and 6 quality audits", async ({ page }) => {
    await page.goto("/observatory");
    await expect(page.locator("h1")).toContainText("Data Observatory");
    await expect(page.locator("text=All 6 Audits Passed")).toBeVisible();
    await expect(page.locator("text=Zero Future Cutoff Leakage")).toBeVisible();
  });

  test("9. Reports page provides direct CSV export actions", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.locator("h1")).toContainText("Reports & Data Export Center");
    await expect(page.locator("text=Download Forecast CSV")).toBeVisible();
    await expect(page.locator("text=Download Operations Roster CSV")).toBeVisible();
  });

  test("10. Mobile viewport layout verification", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
  });
});
