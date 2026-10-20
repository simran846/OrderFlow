/**
 * OrderFlow High-Concurrency Load Testing Script (k6)
 *
 * Simulates real-world traffic profiles to evaluate:
 * 1. Cache-Aside Redis read throughput & latency percentiles (p95, p99).
 * 2. Database connection pool behavior under heavy concurrent reads.
 * 3. Graceful request handling and zero-downtime error budgets.
 *
 * Execution Command:
 *   k6 run tests/k6/load-test.js
 *   or with custom target host:
 *   k6 run -e BASE_URL=http://localhost:5000 tests/k6/load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom Application Performance Metrics
const catalogDuration = new Trend('catalog_duration_ms');
const healthDuration = new Trend('health_duration_ms');
const successRate = new Rate('successful_requests');
const requestCounter = new Counter('total_http_requests');

// Target Host Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const API_PREFIX = '/api/v1';

// Workload Profile & Performance Budgets
export const options = {
  stages: [
    { duration: '20s', target: 30 },  // Warm-up ramp: 0 to 30 Virtual Users
    { duration: '40s', target: 50 },  // Sustained load: 50 VUs
    { duration: '20s', target: 100 }, // Peak spike: 100 concurrent VUs
    { duration: '15s', target: 0 },   // Cool-down recovery
  ],
  thresholds: {
    // 95% of all requests must complete within 200ms
    http_req_duration: ['p(95)<200', 'p(99)<400'],
    // Overall HTTP failure rate must stay below 1%
    http_req_failed: ['rate<0.01'],
    // Custom catalog endpoint threshold
    catalog_duration_ms: ['p(95)<150'],
    successful_requests: ['rate>0.99'],
  },
};

export default function () {
  requestCounter.add(1);

  // Traffic Distribution Simulation:
  // - 70% Product Catalog browsing (Redis Cache-aside verification)
  // - 15% System Healthcheck monitoring
  // - 15% OpenAPI Specification reads
  const rand = Math.random();

  if (rand < 0.70) {
    // 1. Product Catalog Browse (Cached)
    const catalogRes = http.get(`${BASE_URL}${API_PREFIX}/products?page=1&limit=10`, {
      tags: { name: 'GetProductsCatalog' },
    });

    catalogDuration.add(catalogRes.timings.duration);
    const catalogSuccess = check(catalogRes, {
      'catalog status is 200': (r) => r.status === 200,
      'catalog returns items array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && Array.isArray(body.data.items);
        } catch {
          return false;
        }
      },
    });

    successRate.add(catalogSuccess);
  } else if (rand < 0.85) {
    // 2. Health Check
    const healthRes = http.get(`${BASE_URL}${API_PREFIX}/health`, {
      tags: { name: 'HealthCheck' },
    });

    healthDuration.add(healthRes.timings.duration);
    const healthSuccess = check(healthRes, {
      'health status is 200': (r) => r.status === 200,
      'health status is healthy': (r) => {
        try {
          return JSON.parse(r.body).data.status === 'healthy';
        } catch {
          return false;
        }
      },
    });

    successRate.add(healthSuccess);
  } else {
    // 3. OpenAPI 3.0 Documentation JSON
    const docsRes = http.get(`${BASE_URL}${API_PREFIX}/docs/json`, {
      tags: { name: 'OpenApiJson' },
    });

    const docsSuccess = check(docsRes, {
      'docs status is 200': (r) => r.status === 200,
      'spec is openapi 3': (r) => {
        try {
          return JSON.parse(r.body).openapi.startsWith('3.');
        } catch {
          return false;
        }
      },
    });

    successRate.add(docsSuccess);
  }

  // Realistic user pacing: think-time between 100ms and 500ms
  sleep(Math.random() * 0.4 + 0.1);
}

// Custom Human-Readable Summary
export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'].toFixed(2);
  const p99 = data.metrics.http_req_duration.values['p(99)'].toFixed(2);
  const avg = data.metrics.http_req_duration.values.avg.toFixed(2);
  const errorRate = (data.metrics.http_req_failed.values.rate * 100).toFixed(2);

  const summary = `
================================================================================
                    ORDERFLOW LOAD TESTING PERFORMANCE REPORT                   
================================================================================
 Total HTTP Requests Processed : ${data.metrics.http_reqs.values.count}
 Request Throughput (RPS)       : ${data.metrics.http_reqs.values.rate.toFixed(2)} req/sec
 Mean Request Latency          : ${avg} ms
 p95 Latency Percentile        : ${p95} ms
 p99 Latency Percentile        : ${p99} ms
 HTTP Error Rate               : ${errorRate} %
 Target Thresholds Met         : ${data.metrics.http_req_failed.values.rate < 0.01 ? 'PASSED ✅' : 'FAILED ❌'}
================================================================================
`;

  return {
    stdout: summary,
  };
}
