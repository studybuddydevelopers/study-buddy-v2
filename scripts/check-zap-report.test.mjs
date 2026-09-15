import assert from "node:assert/strict";
import test from "node:test";

import { blockingZapAlerts } from "./check-zap-report.mjs";

test("allows low and informational alerts", () => {
  const alerts = blockingZapAlerts({
    site: [
      {
        alerts: [
          { pluginid: "1", name: "Informational", riskcode: "0" },
          { pluginid: "2", name: "Low", riskcode: "1" },
        ],
      },
    ],
  });

  assert.deepEqual(alerts, []);
});

test("blocks medium and high alerts", () => {
  const alerts = blockingZapAlerts({
    site: [
      {
        alerts: [
          {
            pluginid: "10055",
            name: "CSP Wildcard Directive",
            riskcode: "2",
            riskdesc: "Medium (High)",
            instances: [{ uri: "https://staging.example" }],
          },
          {
            alertRef: "40018",
            alert: "SQL Injection",
            riskcode: "3",
            riskdesc: "High (Medium)",
          },
        ],
      },
    ],
  });

  assert.deepEqual(alerts, [
    {
      pluginId: "10055",
      name: "CSP Wildcard Directive",
      risk: "Medium (High)",
      count: 1,
    },
    {
      pluginId: "40018",
      name: "SQL Injection",
      risk: "High (Medium)",
      count: 0,
    },
  ]);
});

test("treats a report with no sites as having no blocking alerts", () => {
  assert.deepEqual(blockingZapAlerts({}), []);
});
