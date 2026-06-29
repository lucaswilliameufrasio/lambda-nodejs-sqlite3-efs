import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = __ENV.BASE_URL || "http://127.0.0.1:8080";

export const options = {
  thresholds: {
    "http_req_duration{endpoint:root}": ["p(95)<300"],
    "http_req_duration{endpoint:users_list}": ["p(95)<800"],
    "http_req_duration{endpoint:users_create}": ["p(95)<1000"],
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
  },
};

function randomUser() {
  const id = `${__VU}-${__ITER}-${Date.now()}`;
  return JSON.stringify({
    name: `user-${id}`,
    email: `user-${id}@example.com`,
  });
}

export default function () {
  const choice = Math.random();

  if (choice < 0.2) {
    const response = http.get(`${baseUrl}/`, {
      tags: { endpoint: "root", method: "GET" },
    });

    check(response, {
      "GET / returns 200": (res) => res.status === 200,
    });

    sleep(0.2);
    return;
  }

  if (choice < 0.6) {
    const response = http.get(`${baseUrl}/users`, {
      tags: { endpoint: "users_list", method: "GET" },
    });

    check(response, {
      "GET /users returns 200": (res) => res.status === 200,
    });

    sleep(0.2);
    return;
  }

  const response = http.post(`${baseUrl}/users`, randomUser(), {
    headers: {
      "Content-Type": "application/json",
    },
    tags: { endpoint: "users_create", method: "POST" },
  });

  check(response, {
    "POST /users returns 202": (res) => res.status === 202,
  });

  sleep(0.2);
}
