# 404 Test — Requesting a route that doesn't exist should return HTTP 404

GET http://localhost:8080/no-such-route

# We expect a 404 Not Found response
HTTP/1.1 404

# Optional assertions to verify headers or body
[Asserts]
# The server should tell clients not to cache error responses
header "Cache-Control" contains "no-cache"

# If your API returns JSON for errors, you can check that too:
# header "Content-Type" contains "application/json"
# jsonpath "$.status" == "error"
# jsonpath "$.error" contains "not found"
