import papa from "https://jslib.k6.io/papaparse/5.1.1/index.js";
import http from "k6/http";

export const options = {
  scenarios: {
    capacity_test: {
      executor: "ramping-arrival-rate",
      timeUnit: "1s",
      startRate: 50,
      stages: [
        { target: 500, duration: "3m" },
        { target: 1000, duration: "3m" },
        { target: 2000, duration: "3m" },
        { target: 4000, duration: "3m" },
      ],
      preAllocatedVUs: 500,
      maxVUs: 6000,
      gracefulStop: "30s",
    },
  },
};

export default function () {
  http.get(`${__ENV.HOST}/v1/optimizations/sync`);
}

export function handleSummary(data) {
  const httpReqDuration = data.metrics.http_req_duration;
  const httpReqs = data.metrics.http_reqs;
  const httpFailed = data.metrics.http_req_failed;

  const rows = [];

  // Access the values directly from the metric
  if (httpReqDuration && httpReqDuration.values) {
    const stats = httpReqDuration.values;

    rows.push({
      "Request Count": httpReqs?.values?.count ?? 0,
      "Failure Count": httpFailed?.values?.fails ?? 0,
      "Median Response Time": stats["p(50)"],
      "Average Response Time": stats.avg,
      "Min Response Time": stats.min,
      "Max Response Time": stats.max,
      "Average Content Size":
        data.metrics.http_req_receiving?.values?.avg ?? "",
      "Requests/s": httpReqs?.values?.rate ?? 0,
      "90%": stats["p(90)"],
      "95%": stats["p(95)"],
      "99%": stats["p(99)"] ?? "",
      "100%": stats.max,
    });
  }

  const csv = papa.unparse(rows);

  return {
    [__ENV.FILE_NAME]: csv,
  };
}
