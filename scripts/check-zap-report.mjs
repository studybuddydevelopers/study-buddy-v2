import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const MEDIUM_RISK_CODE = 2;

export function blockingZapAlerts(report) {
  const sites = Array.isArray(report?.site) ? report.site : [];

  return sites.flatMap((site) => {
    const alerts = Array.isArray(site?.alerts) ? site.alerts : [];

    return alerts
      .filter((alert) => Number(alert?.riskcode) >= MEDIUM_RISK_CODE)
      .map((alert) => ({
        pluginId: String(alert?.pluginid ?? alert?.alertRef ?? "unknown"),
        name: String(alert?.name ?? alert?.alert ?? "Unnamed ZAP alert"),
        risk: String(alert?.riskdesc ?? alert?.riskcode ?? "unknown"),
        count: Array.isArray(alert?.instances) ? alert.instances.length : 0,
      }));
  });
}

async function main() {
  const reportPath = process.argv[2] ?? "report_json.json";
  let report;

  try {
    report = JSON.parse(await readFile(reportPath, "utf8"));
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "zap_report_check_failed",
        reason: "REPORT_UNREADABLE",
        detail: error instanceof Error ? error.message : "Unknown error",
      })
    );
    process.exitCode = 2;
    return;
  }

  const blockingAlerts = blockingZapAlerts(report);
  if (blockingAlerts.length > 0) {
    console.error(
      JSON.stringify({
        event: "zap_medium_or_high_alerts_found",
        alerts: blockingAlerts,
      })
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify({ event: "zap_security_gate_passed", blockingAlerts: 0 })
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
