# Lab 9 S3 Integration Test
# Tests the complete S3 integration: POST -> GET -> DELETE -> GET (404)

# 1. POST a new text fragment
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
`Hello S3!`

# 2. Confirm server returns 201 and capture Location
HTTP/1.1 201
[Asserts]
header "Location" exists
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/plain"
jsonpath "$.fragment.size" == 9
[Captures]
url: header "Location"

# 3. GET the fragment using captured URL
GET {{url}}
[BasicAuth]
user1@email.com:password1

# 4. Confirm GET returns 200 and body matches
HTTP/1.1 200
Content-Type: text/plain; charset=utf-8
Content-Length: 9
[Asserts]
body == "Hello S3!"

# 5. DELETE the fragment
DELETE {{url}}
[BasicAuth]
user1@email.com:password1

# 6. Confirm DELETE returns 200
HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"

# 7. GET the fragment again
GET {{url}}
[BasicAuth]
user1@email.com:password1

# 8. Confirm 404 returned
HTTP/1.1 404
[Asserts]
jsonpath "$.error.message" == "Fragment not found"
