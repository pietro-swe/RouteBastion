import http from "k6/http";
import exec from "k6/execution";
import { Trend, Counter } from "k6/metrics";
import papa from "https://jslib.k6.io/papaparse/5.1.1/index.js";

const stageDurationMinutes = 2;
const stageDurationSeconds = stageDurationMinutes * 60;

const userLevels = [50, 65, 75, 100, 150, 200, 300];

const metrics = {};

for (const level of userLevels) {
  metrics[level] = {
    duration: new Trend(`http_req_duration_${level}`, true),
    requests: new Counter(`http_reqs_${level}`),
  };
}

export const options = {
  scenarios: userLevels.reduce((acc, users, index) => {
    acc[`load_${users}_users`] = {
      executor: "constant-vus",
      vus: users,
      duration: `${stageDurationMinutes}m`,
      startTime: `${index * stageDurationMinutes}m`,
      gracefulStop: "0s",
      tags: { concurrent_users: String(users) },
    };
    return acc;
  }, {}),
};

export default function () {
  const level = exec.vu.metrics.tags.concurrent_users;

  const res = http.get(`${__ENV.HOST}/v1/optimizations/sync`, {
    tags: { concurrent_users: level },
  });

  metrics[level].duration.add(res.timings.duration);
  metrics[level].requests.add(1);
}

export function handleSummary(data) {
  const rows = [];

  for (const level of userLevels) {
    const durationMetric = data.metrics[`http_req_duration_${level}`];
    const reqMetric = data.metrics[`http_reqs_${level}`];

    if (durationMetric?.values && reqMetric?.values) {
      const count = reqMetric.values.count;

      rows.push({
        "Concurrent Users": level,
        "Request Count": count,
        "Requests/s": count / stageDurationSeconds,
        "Avg Response Time (ms)": durationMetric.values.avg,
        "p90 (ms)": durationMetric.values["p(90)"],
        "p95 (ms)": durationMetric.values["p(95)"],
        "Max (ms)": durationMetric.values.max,
      });
    }
  }

  return {
    [__ENV.FILE_NAME]: papa.unparse(rows),
  };
}
